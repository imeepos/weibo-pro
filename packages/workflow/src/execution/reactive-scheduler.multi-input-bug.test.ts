import { describe, it, expect, beforeEach } from 'vitest'
import { ReactiveScheduler } from './reactive-scheduler'
import { WorkflowGraphAst, Ast } from '../ast'
import { TextAreaAst } from '../index'
import { root, Injectable } from '@sker/core'
import { Compiler } from '../compiler'
import { firstValueFrom } from 'rxjs'
import { Node, Input, Output, Handler, IS_MULTI } from '../decorator'
import { Observable, BehaviorSubject } from 'rxjs'
import { INode } from '../types'

/**
 * 简单聚合节点 - 用于测试多值输入
 */
@Node({ title: '聚合节点' })
class SimpleCollectorAst extends Ast {
  @Input({ mode: IS_MULTI })
  items: any[] = []

  @Output()
  result: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([])

  type = 'SimpleCollectorAst'
}

@Injectable()
class SimpleCollectorVisitor {
  @Handler(SimpleCollectorAst)
  visit(ast: SimpleCollectorAst): Observable<INode> {
    return new Observable((obs) => {
      ast.state = 'running'
      obs.next({ ...ast })

      ast.result.next(ast.items)
      obs.next({ ...ast })

      ast.state = 'success'
      obs.next({ ...ast })
      obs.complete()
    })
  }
}

/**
 * 单元测试：复现多值输入节点重复执行时的数组扩展错误
 *
 * 场景：
 * 1. 两个文本节点 -> 一个聚合节点（多值输入）
 * 2. 两个文本节点 -> 另一个文本节点（多值输入）
 * 3. 聚合节点 -> 文本节点（第三条边）
 * 4. 模拟节点重复执行（比如修改上游节点触发重新执行）
 *
 * 错误：
 * - TypeError: Cannot add property 6, object is not extensible
 * - 发生在 assignInputsToNodeInstance 的 array.push(...value) 操作
 *
 * 根本原因：
 * - cloneNode 使用 structuredClone 克隆节点时，已有的数组属性可能变为不可扩展
 * - assignInputsToNodeInstance 尝试 push 到克隆的数组时失败
 */
describe('ReactiveScheduler - 多值输入节点重复执行 Bug', () => {
  let scheduler: ReactiveScheduler
  let compiler: Compiler

  beforeEach(() => {
    scheduler = root.get(ReactiveScheduler)
    compiler = root.get(Compiler)
  })

  it('应该正确处理多值输入节点的重复执行（复现 Bug）', async () => {
    // 1️⃣ 创建工作流：text1 + text2 -> collector -> text3
    //                    text1 + text2 ---------> text3 (直接连接)
    const text1 = new TextAreaAst()
    text1.id = 'text1'
    text1.input = '01'

    const text2 = new TextAreaAst()
    text2.id = 'text2'
    text2.input = '02'

    const collector = new SimpleCollectorAst()
    collector.id = 'collector'

    const text3 = new TextAreaAst()
    text3.id = 'text3'
    text3.input = '' // 多值输入，初始为空字符串

    // 编译节点
    compiler.compile(text1)
    compiler.compile(text2)
    compiler.compile(collector)
    compiler.compile(text3)

    const workflow = new WorkflowGraphAst()
    workflow.id = 'multi-input-test'
    workflow.nodes = [text1, text2, collector, text3]
    workflow.edges = [
      // text1 -> collector
      {
        id: 'edge1',
        from: 'text1',
        to: 'collector',
        type: 'data',
        fromProperty: 'output',
        toProperty: 'items',
      },
      // text2 -> collector
      {
        id: 'edge2',
        from: 'text2',
        to: 'collector',
        type: 'data',
        fromProperty: 'output',
        toProperty: 'items',
      },
      // text1 -> text3
      {
        id: 'edge3',
        from: 'text1',
        to: 'text3',
        type: 'data',
        fromProperty: 'output',
        toProperty: 'input',
      },
      // text2 -> text3
      {
        id: 'edge4',
        from: 'text2',
        to: 'text3',
        type: 'data',
        fromProperty: 'output',
        toProperty: 'input',
      },
      // collector -> text3
      {
        id: 'edge5',
        from: 'collector',
        to: 'text3',
        type: 'data',
        fromProperty: 'result',
        toProperty: 'input',
      },
    ]

    // 2️⃣ 第一次执行工作流
    const result = await firstValueFrom(scheduler.schedule(workflow, workflow))

    console.log('第一次执行完成', {
      state: result.state,
      text3Input: result.nodes.find((n: INode) => n.id === 'text3')?.input,
    })

    // ✅ 第一次执行应该成功
    expect(result.state).toBe('success')
    const text3Node = result.nodes.find((n: INode) => n.id === 'text3')
    expect(text3Node).toBeDefined()
    expect(text3Node?.state).toBe('success')

    // text3 的 input 应该是数组 ['01', '02', ['01', '02']]
    expect(Array.isArray(text3Node?.input)).toBe(true)
    expect((text3Node?.input as any[]).length).toBe(3)

    // 3️⃣ 模拟节点重复执行（第二次执行）
    // 在真实场景中，这会由 fineTuneNode 或重新执行触发
    console.log('开始第二次执行...')

    const secondResult = await firstValueFrom(scheduler.schedule(workflow, workflow))

    console.log('第二次执行完成', {
      state: secondResult.state,
      text3Input: secondResult.nodes.find((n: INode) => n.id === 'text3')?.input,
    })

    // ✅ 第二次执行也应该成功（而不是报错）
    expect(secondResult.state).toBe('success')
    const text3Node2 = secondResult.nodes.find((n: INode) => n.id === 'text3')
    expect(text3Node2).toBeDefined()
    expect(text3Node2?.state).toBe('success')

    // text3 的 input 应该重新计算为 ['01', '02', ['01', '02']]
    expect(Array.isArray(text3Node2?.input)).toBe(true)
    expect((text3Node2?.input as any[]).length).toBe(3)
  }, 10000) // 增加超时时间

  it('应该在每次执行时创建新的数组实例（隔离性测试）', async () => {
    // 更简单的测试：只有两个文本节点 -> 一个文本节点（多值输入）
    const text1 = new TextAreaAst()
    text1.id = 'text1'
    text1.input = 'A'

    const text2 = new TextAreaAst()
    text2.id = 'text2'
    text2.input = 'B'

    const text3 = new TextAreaAst()
    text3.id = 'text3'
    text3.input = ''

    compiler.compile(text1)
    compiler.compile(text2)
    compiler.compile(text3)

    const workflow = new WorkflowGraphAst()
    workflow.id = 'simple-multi-input'
    workflow.nodes = [text1, text2, text3]
    workflow.edges = [
      {
        id: 'edge1',
        from: 'text1',
        to: 'text3',
        type: 'data',
        fromProperty: 'output',
        toProperty: 'input',
      },
      {
        id: 'edge2',
        from: 'text2',
        to: 'text3',
        type: 'data',
        fromProperty: 'output',
        toProperty: 'input',
      },
    ]

    // 第一次执行
    const result1 = await firstValueFrom(scheduler.schedule(workflow, workflow))

    const text3_v1 = result1.nodes.find((n: INode) => n.id === 'text3')
    const input1 = text3_v1?.input
    console.log('第一次执行 input', input1)

    expect(Array.isArray(input1)).toBe(true)
    expect((input1 as any[]).length).toBe(2)
    expect(input1).toEqual(['A', 'B'])

    // 第二次执行
    const result2 = await firstValueFrom(scheduler.schedule(workflow, workflow))

    const text3_v2 = result2.nodes.find((n: INode) => n.id === 'text3')
    const input2 = text3_v2?.input
    console.log('第二次执行 input', input2)

    // ✅ 第二次执行的结果应该和第一次一致
    expect(Array.isArray(input2)).toBe(true)
    expect((input2 as any[]).length).toBe(2)
    expect(input2).toEqual(['A', 'B'])

    // ✅ 两次的数组应该是不同的实例（隔离性）
    expect(input1).not.toBe(input2)
  }, 10000)
})
