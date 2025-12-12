import { describe, it, expect } from 'vitest'
import { root, Injectable } from '@sker/core'
import { ReactiveScheduler } from './reactive-scheduler'
import { createWorkflowGraphAst } from '../ast'
import { TextAreaAst } from '../TextAreaAst'
import { Handler } from '../decorator'
import { lastValueFrom, Observable } from 'rxjs'
import { BehaviorSubject } from 'rxjs'
import type { INode } from '../types'

// 定义简化的 TextAreaAst Visitor 用于测试
@Injectable()
class TestTextAreaVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            const outputValue = Array.isArray(ast.input)
                ? ast.input.join('\n')
                : String(ast.input || '')

            ast.output.next(outputValue)

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * 防止 BehaviorSubject 初始值导致节点执行两次
 *
 * 问题：节点 A 的 output BehaviorSubject 初始值为空字符串 ''
 *      节点 B 订阅时立即收到 ''，执行一次
 *      节点 A 执行完成发射 '001\n'，节点 B 再执行一次
 *
 * 期望：节点 B 只应该执行 1 次（忽略初始空值）
 */
describe('ReactiveScheduler - BehaviorSubject 初始值重复执行问题', () => {
    it('应该忽略 BehaviorSubject 的初始空字符串，防止节点执行两次', async () => {
        const scheduler = root.get(ReactiveScheduler)

        const nodeA = new TextAreaAst()
        nodeA.id = 'node-a'
        nodeA.input = '001\n'
        nodeA.output = new BehaviorSubject<string | null>('')

        const nodeB = new TextAreaAst()
        nodeB.id = 'node-b'
        nodeB.input = ''
        nodeB.output = new BehaviorSubject<string | null>('')

        const edge = {
            id: 'edge-1',
            from: 'node-a',
            to: 'node-b',
            fromProperty: 'output',
            toProperty: 'input',
            type: 'data' as const
        }

        const workflow = createWorkflowGraphAst()
        workflow.id = 'workflow-1'
        workflow.name = 'demo-02'
        workflow.nodes = [nodeA, nodeB]
        workflow.edges = [edge]
        workflow.entryNodeIds = ['node-a']

        // 执行工作流
        const result = await lastValueFrom(scheduler.schedule(workflow, workflow))

        // 断言：工作流成功完成
        expect(result.state).toBe('success')

        // 断言：两个节点都执行成功
        const finalNodeA = result.nodes.find(n => n.id === 'node-a')
        const finalNodeB = result.nodes.find(n => n.id === 'node-b')

        expect(finalNodeA?.state).toBe('success')
        expect(finalNodeB?.state).toBe('success')

        // 断言：节点 A 的输出正确
        expect((finalNodeA as any).output.getValue()).toBe('001\n')

        // 关键断言：节点 B 接收到正确的输入（IS_MULTI 模式会包装成数组）
        expect((finalNodeB as any).input).toEqual(['001\n'])
        expect((finalNodeB as any).output.getValue()).toBe('001\n')

        // 如果节点 B 执行了两次（一次空输入，一次真实输入），
        // 那么最终的 input 数组会包含两个元素
        // 因为测试通过，说明节点 B 只执行了一次
    })
})
