import { describe, it, expect, beforeEach } from 'vitest'
import { root, Injectable } from '@sker/core'
import { ReactiveScheduler } from './reactive-scheduler'
import { createWorkflowGraphAst, WorkflowGraphAst, Ast } from '../ast'
import { Node, Input, Output, Handler, IS_MULTI, IS_BUFFER } from '../decorator'
import { type INode, IEdge } from '../types'
import { Compiler } from '../compiler'
import { Observable, BehaviorSubject } from 'rxjs'
import { lastValueFrom } from 'rxjs'

/**
 * SwitchAst 路由节点 - 复现 demo-02 工作流问题
 *
 * 问题描述：
 * - SwitchAst 条件不匹配时，output_1 = undefined
 * - 但下游 IS_MULTI 输入节点仍然收到了 undefined（显示为 null）
 * - 预期：路由节点的 undefined 输出应该被过滤，不传递给下游
 */

// ============================================================================
// 测试节点定义
// ============================================================================

/**
 * 文本节点 - 对应 TextAreaAst
 */
@Node({ title: '文本节点', type: 'basic' })
class TestTextAreaAst extends Ast {
    @Input({ title: '输入', mode: IS_MULTI, type: 'richtext' })
    input: string[] | string = []

    @Output({ title: '输出', type: 'richtext' })
    output: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null)

    type: 'TestTextAreaAst' = 'TestTextAreaAst'
}

@Injectable()
class TestTextAreaVisitor {
    @Handler(TestTextAreaAst)
    handler(ast: TestTextAreaAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            // 输出 input 的值（如果是数组取第一个，否则直接输出）
            const value = Array.isArray(ast.input)
                ? (ast.input.length > 0 ? ast.input[0] : null)
                : ast.input
            ast.output.next(value)

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * 收集器节点 - 对应 CollectorAst
 */
@Node({ title: '收集器', type: 'basic' })
class TestCollectorAst extends Ast {
    @Input({ title: '数据流', mode: IS_BUFFER | IS_MULTI })
    items: any[] = []

    @Output({ title: '收集结果' })
    result: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([])

    type: 'TestCollectorAst' = 'TestCollectorAst'
}

@Injectable()
class TestCollectorVisitor {
    @Handler(TestCollectorAst)
    handler(ast: TestCollectorAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            ast.result.next([...ast.items])

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * 简单路由器 - 使用普通属性而非 BehaviorSubject
 *
 * 模拟实际的 SwitchAst 行为：条件不匹配时，输出属性为 undefined
 */
@Node({ title: '简单路由器', type: 'control', dynamicOutputs: true })
class SimpleRouterAst extends Ast {
    @Input({ title: '输入值' })
    value: any = undefined

    // 动态输出：由 metadata.outputs 定义，运行时设置
    // 不使用 BehaviorSubject，直接作为普通属性

    type: 'SimpleRouterAst' = 'SimpleRouterAst'

    declare metadata: NonNullable<Ast['metadata']>
}

@Injectable()
class SimpleRouterVisitor {
    @Handler(SimpleRouterAst)
    handler(ast: SimpleRouterAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            const inputValue = ast.value
            const outputs = ast.metadata.outputs

            outputs.forEach(outputMeta => {
                const propKey = String(outputMeta.property)

                if (outputMeta.isRouter && outputMeta.condition) {
                    const matched = this.evaluateCondition(
                        outputMeta.condition,
                        { $input: inputValue }
                    )

                    // 关键：条件匹配则赋值，否则设为 undefined
                    ;(ast as any)[propKey] = matched ? inputValue : undefined
                }
            })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }

    private evaluateCondition(condition: string, context: any): boolean {
        try {
            const func = new Function(
                ...Object.keys(context),
                `return ${condition}`
            )
            return func(...Object.values(context))
        } catch {
            return false
        }
    }
}

// ============================================================================
// 测试用例
// ============================================================================

describe('SwitchAst 路由节点', () => {
    let scheduler: ReactiveScheduler
    let compiler: Compiler

    beforeEach(() => {
        scheduler = root.get(ReactiveScheduler)
        compiler = root.get(Compiler)
    })

    /**
     * 复现 demo-02 工作流问题
     *
     * 工作流结构：
     * - TextAreaAst (01) -----> CollectorAst.items
     * - TextAreaAst (02) -----> CollectorAst.items
     * - TextAreaAst (02) -----> SwitchAst.value
     * - SwitchAst.output_1 ---> TextAreaAst.input
     * - CollectorAst.result --> TextAreaAst.input
     *
     * SwitchAst 配置：
     * - output_1 条件: $input === 01 (注意：01 是数字)
     * - 输入值: "02" (字符串)
     *
     * 预期：
     * - SwitchAst.output_1 = undefined (条件不匹配)
     * - CollectorAst.result = ["01", "02"]
     * - 最终 TextAreaAst.input 应该只有 ["01", "02"]，不应包含 null/undefined
     *
     * 实际问题：
     * - 最终 TextAreaAst.input = [null, "01", "02"]
     * - 路由节点的 undefined 输出被传递给了下游
     */
    it('路由节点条件不匹配时，undefined 输出不应传递给下游 IS_MULTI 输入', async () => {
        // 创建节点
        const textNode01 = compiler.compile({
            id: 'text-01',
            type: 'TestTextAreaAst',
            input: '01',
            state: 'pending',
        } as INode)

        const textNode02 = compiler.compile({
            id: 'text-02',
            type: 'TestTextAreaAst',
            input: '02',
            state: 'pending',
        } as INode)

        const collectorNode = compiler.compile({
            id: 'collector',
            type: 'TestCollectorAst',
            items: [],
            state: 'pending',
        } as INode)

        // 使用 SimpleRouterAst
        const routerNode = compiler.compile({
            id: 'router',
            type: 'SimpleRouterAst',
            value: undefined,
            state: 'pending',
        } as INode)

        // 动态添加 output_1 到 metadata.outputs
        routerNode.metadata!.outputs.push({
            property: 'output_1',
            title: 'output_1',
            description: '',
            type: 'string',
            isStatic: false,
            isRouter: true,
            condition: '$input === 01'  // 数字 1，不是字符串 "01"
        })

        const finalTextNode = compiler.compile({
            id: 'final-text',
            type: 'TestTextAreaAst',
            input: [],
            state: 'pending',
        } as INode)

        // 创建边
        const edges: IEdge[] = [
            // TextAreaAst (01) -> CollectorAst.items
            {
                id: 'edge-1',
                from: 'text-01',
                to: 'collector',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'items',
            },
            // TextAreaAst (02) -> CollectorAst.items
            {
                id: 'edge-2',
                from: 'text-02',
                to: 'collector',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'items',
            },
            // TextAreaAst (02) -> Router.value
            {
                id: 'edge-3',
                from: 'text-02',
                to: 'router',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'value',
            },
            // Router.output_1 -> FinalTextAreaAst.input
            {
                id: 'edge-4',
                from: 'router',
                to: 'final-text',
                type: 'data',
                fromProperty: 'output_1',
                toProperty: 'input',
            },
            // CollectorAst.result -> FinalTextAreaAst.input
            {
                id: 'edge-5',
                from: 'collector',
                to: 'final-text',
                type: 'data',
                fromProperty: 'result',
                toProperty: 'input',
            },
        ]

        // 创建工作流
        const workflow = createWorkflowGraphAst({
            id: 'test-switch-workflow',
            name: 'Switch 路由测试',
            nodes: [textNode01, textNode02, collectorNode, routerNode, finalTextNode],
            edges,
            entryNodeIds: ['text-01', 'text-02'],
        })

        // 执行
        const result = await lastValueFrom(scheduler.schedule(workflow, workflow))

        // 验证工作流成功
        expect(result.state).toBe('success')

        // 获取各节点结果
        const finalNode = result.nodes.find(n => n.id === 'final-text')!
        const routerResult = result.nodes.find(n => n.id === 'router')!
        const collectorResult = result.nodes.find(n => n.id === 'collector')!

        // 验证路由器
        // 条件 "$input === 01" 其中 01 是数字 1
        // 输入值 "02" 是字符串
        // "02" === 1 应该返回 false
        expect((routerResult as any).output_1).toBeUndefined()

        // 验证 CollectorAst
        expect((collectorResult as any).items).toEqual(['01', '02'])

        // 关键断言：最终 TextAreaAst.input 不应包含 null/undefined
        const finalInput = (finalNode as any).input
        console.log('Final TextAreaAst.input:', finalInput)

        // 预期：只有 CollectorAst 的结果，没有路由器的 undefined 输出
        expect(finalInput).not.toContain(null)
        expect(finalInput).not.toContain(undefined)
    })

    /**
     * 测试：条件匹配时，路由输出应正常传递
     */
    it('路由节点条件匹配时，输出应正常传递给下游', async () => {
        const textNode = compiler.compile({
            id: 'text-input',
            type: 'TestTextAreaAst',
            input: '01',
            state: 'pending',
        } as INode)

        const routerNode = compiler.compile({
            id: 'router',
            type: 'SimpleRouterAst',
            value: undefined,
            state: 'pending',
        } as INode)

        // 使用字符串比较条件
        routerNode.metadata!.outputs.push({
            property: 'output_1',
            title: 'output_1',
            isRouter: true,
            condition: '$input === "01"'  // 字符串比较
        })

        const finalTextNode = compiler.compile({
            id: 'final-text',
            type: 'TestTextAreaAst',
            input: [],
            state: 'pending',
        } as INode)

        const edges: IEdge[] = [
            {
                id: 'edge-1',
                from: 'text-input',
                to: 'router',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'value',
            },
            {
                id: 'edge-2',
                from: 'router',
                to: 'final-text',
                type: 'data',
                fromProperty: 'output_1',
                toProperty: 'input',
            },
        ]

        const workflow = createWorkflowGraphAst({
            id: 'test-router-match',
            name: 'Router 匹配测试',
            nodes: [textNode, routerNode, finalTextNode],
            edges,
            entryNodeIds: ['text-input'],
        })

        const result = await lastValueFrom(scheduler.schedule(workflow, workflow))

        expect(result.state).toBe('success')

        const routerResult = result.nodes.find(n => n.id === 'router')!
        const finalNode = result.nodes.find(n => n.id === 'final-text')!

        // 条件匹配，output_1 应该有值
        expect((routerResult as any).output_1).toBe('01')

        // 下游应该收到值
        const finalInput = (finalNode as any).input
        console.log('Matched - Final TextAreaAst.input:', finalInput)
        expect(finalInput).toContain('01')
    })

    /**
     * 测试：多个路由输出，只有匹配的应该传递
     */
    it('多个路由输出时，只有匹配的条件应传递给下游', async () => {
        const textNode = compiler.compile({
            id: 'text-input',
            type: 'TestTextAreaAst',
            input: 'A',
            state: 'pending',
        } as INode)

        const routerNode = compiler.compile({
            id: 'router',
            type: 'SimpleRouterAst',
            value: undefined,
            state: 'pending',
        } as INode)

        // 添加多个路由输出
        routerNode.metadata!.outputs.push(
            {
                property: 'output_a',
                title: '输出 A',
                isRouter: true,
                condition: '$input === "A"'
            },
            {
                property: 'output_b',
                title: '输出 B',
                isRouter: true,
                condition: '$input === "B"'
            }
        )

        const finalA = compiler.compile({
            id: 'final-a',
            type: 'TestTextAreaAst',
            input: [],
            state: 'pending',
        } as INode)

        const finalB = compiler.compile({
            id: 'final-b',
            type: 'TestTextAreaAst',
            input: [],
            state: 'pending',
        } as INode)

        const edges: IEdge[] = [
            {
                id: 'edge-1',
                from: 'text-input',
                to: 'router',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'value',
            },
            {
                id: 'edge-a',
                from: 'router',
                to: 'final-a',
                type: 'data',
                fromProperty: 'output_a',
                toProperty: 'input',
            },
            {
                id: 'edge-b',
                from: 'router',
                to: 'final-b',
                type: 'data',
                fromProperty: 'output_b',
                toProperty: 'input',
            },
        ]

        const workflow = createWorkflowGraphAst({
            id: 'test-multi-router',
            name: '多路由输出测试',
            nodes: [textNode, routerNode, finalA, finalB],
            edges,
            entryNodeIds: ['text-input'],
        })

        const result = await lastValueFrom(scheduler.schedule(workflow, workflow))

        expect(result.state).toBe('success')

        const routerResult = result.nodes.find(n => n.id === 'router')!
        const nodeA = result.nodes.find(n => n.id === 'final-a')!
        const nodeB = result.nodes.find(n => n.id === 'final-b')!

        // output_a 匹配，output_b 不匹配
        expect((routerResult as any).output_a).toBe('A')
        expect((routerResult as any).output_b).toBeUndefined()

        // final-a 应该收到值
        expect((nodeA as any).input).toContain('A')

        // final-b 不应该收到值（或收到空数组）
        const nodeBInput = (nodeB as any).input
        console.log('Node B input:', nodeBInput)

        // 关键：undefined 的路由输出不应该传递
        expect(nodeBInput).not.toContain(null)
        expect(nodeBInput).not.toContain(undefined)
    })
})
