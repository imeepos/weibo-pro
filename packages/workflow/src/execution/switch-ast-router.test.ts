import { describe, it, expect, beforeEach } from 'vitest'
import { root, Injectable } from '@sker/core'
import { ReactiveScheduler } from './reactive-scheduler'
import { createWorkflowGraphAst, WorkflowGraphAst, Ast } from '../ast'
import { Node, Input, Output, Handler, IS_MULTI, IS_BUFFER } from '../decorator'
import { type INode, IEdge } from '../types'
import { Compiler } from '../compiler'
import { Observable, BehaviorSubject, firstValueFrom, race, timer, map } from 'rxjs'
import { lastValueFrom } from 'rxjs'

/**
 * SwitchAst 路由节点 - 复现 demo-02 工作流问题
 *
 * 问题描述：
 * 1. SwitchAstVisitor 直接覆盖 BehaviorSubject 属性，而不是调用 .next()
 * 2. ReactiveScheduler 订阅 BehaviorSubject.asObservable() 等待新值
 * 3. 但 BehaviorSubject 被覆盖后，订阅永远收不到新值
 * 4. 导致工作流永远 pending 无法结束
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
 * 带 BehaviorSubject 输出的路由器 - 模拟真实 SwitchAst
 * 实现互斥路由逻辑：只有一个分支会被激活
 */
@Node({ title: 'BehaviorSubject路由器', type: 'control', dynamicOutputs: true })
class BehaviorSubjectRouterAst extends Ast {
    @Input({ title: '输入值' })
    value: any = undefined

    @Output({ title: 'Default', isRouter: true, condition: 'true' })
    output_default: BehaviorSubject<any> = new BehaviorSubject<any>(undefined)

    type: 'BehaviorSubjectRouterAst' = 'BehaviorSubjectRouterAst'

    declare metadata: NonNullable<Ast['metadata']>
}

/**
 * 正确的 Visitor 实现 - 互斥路由逻辑
 * default 分支只在其他所有条件都不匹配时才激活
 */
@Injectable()
class BuggyRouterVisitor {
    @Handler(BehaviorSubjectRouterAst)
    handler(ast: BehaviorSubjectRouterAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            const inputValue = ast.value
            const outputs = ast.metadata.outputs

            // 分离 default 分支和普通分支
            const defaultOutput = outputs.find(o =>
                o.isRouter && (o.condition === 'true' || o.property === 'output_default')
            )
            const normalOutputs = outputs.filter(o =>
                o.isRouter && o.condition && o.condition !== 'true' && o.property !== 'output_default'
            )

            // 先评估所有普通分支
            let anyMatched = false
            normalOutputs.forEach(outputMeta => {
                const propKey = String(outputMeta.property)
                const matched = this.evaluateCondition(outputMeta.condition!, { $input: inputValue })

                if (matched) {
                    anyMatched = true
                    this.setOutputValue(ast, propKey, inputValue)
                } else {
                    this.setOutputValue(ast, propKey, undefined)
                }
            })

            // default 分支：只有当所有普通分支都不匹配时才激活
            if (defaultOutput) {
                const propKey = String(defaultOutput.property)
                const value = anyMatched ? undefined : inputValue
                this.setOutputValue(ast, propKey, value)
            }

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }

    private setOutputValue(ast: any, propKey: string, value: any): void {
        if (ast[propKey] instanceof BehaviorSubject) {
            ast[propKey].next(value)
        } else {
            ast[propKey] = value
        }
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
     * 核心 Bug 复现：BehaviorSubject 输出的路由器导致工作流永远 pending
     *
     * 问题根因：
     * 1. SwitchAst 的 output_default 是 BehaviorSubject
     * 2. SwitchAstVisitor 直接 `(ast as any)[propKey] = inputValue` 覆盖了 BehaviorSubject
     * 3. ReactiveScheduler.createBehaviorSubjectStream 订阅 BehaviorSubject.asObservable()
     * 4. 但 BehaviorSubject 被覆盖为普通值后，订阅永远收不到新值
     * 5. 流永远 pending，工作流无法结束
     *
     * 修复：Visitor 应检查属性是否是 BehaviorSubject，如果是则调用 .next()
     */
    it('修复后: BehaviorSubject 路由器应正常完成', async () => {
        // 创建入口文本节点
        const textNode = compiler.compile({
            id: 'text-input',
            type: 'TestTextAreaAst',
            input: '02',
            state: 'pending',
        } as INode)

        // 使用带 BehaviorSubject 输出的路由器
        const routerNode = compiler.compile({
            id: 'router',
            type: 'BehaviorSubjectRouterAst',
            value: undefined,
            state: 'pending',
        } as INode)

        // 最终节点
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
                fromProperty: 'output_default',
                toProperty: 'input',
            },
        ]

        const workflow = createWorkflowGraphAst({
            id: 'test-behaviorsubject-router',
            name: 'BehaviorSubject 路由器测试',
            nodes: [textNode, routerNode, finalTextNode],
            edges,
            entryNodeIds: ['text-input'],
        })

        // 使用 race 和 timer 来检测超时
        const result = await firstValueFrom(
            race(
                scheduler.schedule(workflow, workflow),
                timer(2000).pipe(map(() => 'TIMEOUT'))
            )
        )

        // 修复后，工作流应该正常完成，不会超时
        expect(result).not.toBe('TIMEOUT')

        const workflowResult = result as WorkflowGraphAst
        expect(workflowResult.state).toBe('success')

        const finalNode = workflowResult.nodes.find(n => n.id === 'final-text')!
        expect(finalNode.state).toBe('success')
    })

    /**
     * demo-02 精确复现：多输入源 + BehaviorSubject 路由器
     *
     * 工作流结构（与用户提供的完全一致）：
     * - TextAreaAst (01) -----> CollectorAst.items
     * - TextAreaAst (02) -----> CollectorAst.items
     * - TextAreaAst (02) -----> SwitchAst.value
     * - SwitchAst.output_default -> TextAreaAst.input
     * - CollectorAst.result --> TextAreaAst.input
     *
     * 修复后应正常完成
     */
    it('修复后: demo-02 多输入源 + BehaviorSubject 路由器应正常完成', async () => {
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

        const routerNode = compiler.compile({
            id: 'router',
            type: 'BehaviorSubjectRouterAst',
            value: undefined,
            state: 'pending',
        } as INode)

        const finalTextNode = compiler.compile({
            id: 'final-text',
            type: 'TestTextAreaAst',
            input: [],
            state: 'pending',
        } as INode)

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
            // Router.output_default -> FinalTextAreaAst.input
            {
                id: 'edge-4',
                from: 'router',
                to: 'final-text',
                type: 'data',
                fromProperty: 'output_default',
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

        const workflow = createWorkflowGraphAst({
            id: 'test-demo-02',
            name: 'demo-02 复现',
            nodes: [textNode01, textNode02, collectorNode, routerNode, finalTextNode],
            edges,
            entryNodeIds: ['text-01', 'text-02'],
        })

        // 检测超时
        const result = await firstValueFrom(
            race(
                scheduler.schedule(workflow, workflow),
                timer(3000).pipe(map(() => 'TIMEOUT'))
            )
        )

        // 修复后，工作流应该正常完成
        expect(result).not.toBe('TIMEOUT')

        const workflowResult = result as WorkflowGraphAst
        console.log('工作流状态:', workflowResult.state)
        console.log('节点状态:', workflowResult.nodes.map(n => ({ id: n.id, state: n.state })))
        expect(workflowResult.state).toBe('success')
    })

    /**
     * 复现 demo-02 工作流问题（使用 SimpleRouterAst，不涉及 BehaviorSubject）
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

    /**
     * 互斥路由测试：当条件匹配时，默认分支应该为 undefined
     *
     * 模拟用户场景：
     * - SwitchAst 有 output_default（condition: 'true'）和 output_1（condition: "$input === '02'"）
     * - 输入值为 '02'
     * - 预期：output_1 = '02', output_default = undefined
     */
    it('互斥路由：条件匹配时，默认分支应为 undefined', async () => {
        const textNode = compiler.compile({
            id: 'text-input',
            type: 'TestTextAreaAst',
            input: '02',
            state: 'pending',
        } as INode)

        const routerNode = compiler.compile({
            id: 'router',
            type: 'BehaviorSubjectRouterAst',
            value: undefined,
            state: 'pending',
        } as INode)

        // 添加 output_1 分支
        routerNode.metadata!.outputs.push({
            property: 'output_1',
            title: 'output_1',
            isRouter: true,
            condition: "$input === '02'",
            isStatic: false,
        })

        // 初始化 output_1 为 BehaviorSubject
        ;(routerNode as any).output_1 = new BehaviorSubject<any>(undefined)

        const finalDefaultNode = compiler.compile({
            id: 'final-default',
            type: 'TestTextAreaAst',
            input: [],
            state: 'pending',
        } as INode)

        const finalMatchNode = compiler.compile({
            id: 'final-match',
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
                id: 'edge-default',
                from: 'router',
                to: 'final-default',
                type: 'data',
                fromProperty: 'output_default',
                toProperty: 'input',
            },
            {
                id: 'edge-match',
                from: 'router',
                to: 'final-match',
                type: 'data',
                fromProperty: 'output_1',
                toProperty: 'input',
            },
        ]

        const workflow = createWorkflowGraphAst({
            id: 'test-exclusive-routing',
            name: '互斥路由测试',
            nodes: [textNode, routerNode, finalDefaultNode, finalMatchNode],
            edges,
            entryNodeIds: ['text-input'],
        })

        const result = await firstValueFrom(
            race(
                scheduler.schedule(workflow, workflow),
                timer(3000).pipe(map(() => 'TIMEOUT'))
            )
        )

        expect(result).not.toBe('TIMEOUT')

        const workflowResult = result as WorkflowGraphAst
        expect(workflowResult.state).toBe('success')

        const routerResult = workflowResult.nodes.find(n => n.id === 'router')!
        const defaultNode = workflowResult.nodes.find(n => n.id === 'final-default')!
        const matchNode = workflowResult.nodes.find(n => n.id === 'final-match')!

        console.log('Router output_default:', (routerResult as any).output_default?.getValue?.() ?? (routerResult as any).output_default)
        console.log('Router output_1:', (routerResult as any).output_1?.getValue?.() ?? (routerResult as any).output_1)
        console.log('Default node input:', (defaultNode as any).input)
        console.log('Match node input:', (matchNode as any).input)

        // output_1 条件匹配，应该有值
        const output1Value = (routerResult as any).output_1?.getValue?.() ?? (routerResult as any).output_1
        expect(output1Value).toBe('02')

        // output_default 应为 undefined（因为 output_1 已匹配）
        const defaultValue = (routerResult as any).output_default?.getValue?.() ?? (routerResult as any).output_default
        expect(defaultValue).toBeUndefined()

        // match 节点应收到值
        expect((matchNode as any).input).toContain('02')

        // default 节点不应收到值
        const defaultInput = (defaultNode as any).input
        expect(defaultInput).not.toContain('02')
    })

    /**
     * 互斥路由测试：当没有条件匹配时，默认分支应该有值
     *
     * 模拟场景：
     * - SwitchAst 有 output_default 和 output_1（condition: "$input === '02'"）
     * - 输入值为 '03'（不匹配 output_1）
     * - 预期：output_1 = undefined, output_default = '03'
     */
    it('互斥路由：无条件匹配时，默认分支应有值', async () => {
        const textNode = compiler.compile({
            id: 'text-input',
            type: 'TestTextAreaAst',
            input: '03',
            state: 'pending',
        } as INode)

        const routerNode = compiler.compile({
            id: 'router',
            type: 'BehaviorSubjectRouterAst',
            value: undefined,
            state: 'pending',
        } as INode)

        routerNode.metadata!.outputs.push({
            property: 'output_1',
            title: 'output_1',
            isRouter: true,
            condition: "$input === '02'",
            isStatic: false,
        })

        ;(routerNode as any).output_1 = new BehaviorSubject<any>(undefined)

        const finalDefaultNode = compiler.compile({
            id: 'final-default',
            type: 'TestTextAreaAst',
            input: [],
            state: 'pending',
        } as INode)

        const finalMatchNode = compiler.compile({
            id: 'final-match',
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
                id: 'edge-default',
                from: 'router',
                to: 'final-default',
                type: 'data',
                fromProperty: 'output_default',
                toProperty: 'input',
            },
            {
                id: 'edge-match',
                from: 'router',
                to: 'final-match',
                type: 'data',
                fromProperty: 'output_1',
                toProperty: 'input',
            },
        ]

        const workflow = createWorkflowGraphAst({
            id: 'test-exclusive-routing-default',
            name: '互斥路由测试-走默认分支',
            nodes: [textNode, routerNode, finalDefaultNode, finalMatchNode],
            edges,
            entryNodeIds: ['text-input'],
        })

        const result = await firstValueFrom(
            race(
                scheduler.schedule(workflow, workflow),
                timer(3000).pipe(map(() => 'TIMEOUT'))
            )
        )

        expect(result).not.toBe('TIMEOUT')

        const workflowResult = result as WorkflowGraphAst
        expect(workflowResult.state).toBe('success')

        const routerResult = workflowResult.nodes.find(n => n.id === 'router')!
        const defaultNode = workflowResult.nodes.find(n => n.id === 'final-default')!
        const matchNode = workflowResult.nodes.find(n => n.id === 'final-match')!

        console.log('Router output_default:', (routerResult as any).output_default?.getValue?.() ?? (routerResult as any).output_default)
        console.log('Router output_1:', (routerResult as any).output_1?.getValue?.() ?? (routerResult as any).output_1)

        // output_1 条件不匹配，应为 undefined
        const output1Value = (routerResult as any).output_1?.getValue?.() ?? (routerResult as any).output_1
        expect(output1Value).toBeUndefined()

        // output_default 应有值
        const defaultValue = (routerResult as any).output_default?.getValue?.() ?? (routerResult as any).output_default
        expect(defaultValue).toBe('03')

        // default 节点应收到值
        expect((defaultNode as any).input).toContain('03')

        // match 节点不应收到值
        const matchInput = (matchNode as any).input
        expect(matchInput).not.toContain('03')
    })

    /**
     * 复现用户场景：demo-02 工作流
     *
     * 结构：
     * - TextArea (01) + TextArea (02) -> Collector
     * - TextArea (02) -> Switch
     * - Switch.output_default -> Final TextArea A
     * - Switch.output_1 ($input === '02') -> Final TextArea B
     * - Collector.result -> Final TextArea A
     *
     * 预期结果：
     * - Final TextArea A: 只有 Collector 的结果 ["01", "02"]，不应包含 Switch 的默认输出
     * - Final TextArea B: 应收到 Switch.output_1 的值 "02"
     */
    it('demo-02 场景：条件匹配时默认分支不应传递数据', async () => {
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

        const routerNode = compiler.compile({
            id: 'router',
            type: 'BehaviorSubjectRouterAst',
            value: undefined,
            state: 'pending',
        } as INode)

        // 添加 output_1 分支
        routerNode.metadata!.outputs.push({
            property: 'output_1',
            title: 'output_1',
            isRouter: true,
            condition: "$input === '02'",
            isStatic: false,
        })
        ;(routerNode as any).output_1 = new BehaviorSubject<any>(undefined)

        const finalDefaultNode = compiler.compile({
            id: 'final-default',
            type: 'TestTextAreaAst',
            input: [],
            state: 'pending',
        } as INode)

        const finalMatchNode = compiler.compile({
            id: 'final-match',
            type: 'TestTextAreaAst',
            input: [],
            state: 'pending',
        } as INode)

        const edges: IEdge[] = [
            // TextArea (01) -> Collector
            {
                id: 'edge-1',
                from: 'text-01',
                to: 'collector',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'items',
            },
            // TextArea (02) -> Collector
            {
                id: 'edge-2',
                from: 'text-02',
                to: 'collector',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'items',
            },
            // TextArea (02) -> Router
            {
                id: 'edge-3',
                from: 'text-02',
                to: 'router',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'value',
            },
            // Router.output_default -> Final Default
            {
                id: 'edge-default',
                from: 'router',
                to: 'final-default',
                type: 'data',
                fromProperty: 'output_default',
                toProperty: 'input',
            },
            // Collector.result -> Final Default (多输入源)
            {
                id: 'edge-collector',
                from: 'collector',
                to: 'final-default',
                type: 'data',
                fromProperty: 'result',
                toProperty: 'input',
            },
            // Router.output_1 -> Final Match
            {
                id: 'edge-match',
                from: 'router',
                to: 'final-match',
                type: 'data',
                fromProperty: 'output_1',
                toProperty: 'input',
            },
        ]

        const workflow = createWorkflowGraphAst({
            id: 'test-demo-02-exclusive',
            name: 'demo-02 互斥路由',
            nodes: [textNode01, textNode02, collectorNode, routerNode, finalDefaultNode, finalMatchNode],
            edges,
            entryNodeIds: ['text-01', 'text-02'],
        })

        const result = await firstValueFrom(
            race(
                scheduler.schedule(workflow, workflow),
                timer(3000).pipe(map(() => 'TIMEOUT'))
            )
        )

        expect(result).not.toBe('TIMEOUT')

        const workflowResult = result as WorkflowGraphAst
        expect(workflowResult.state).toBe('success')

        const defaultNode = workflowResult.nodes.find(n => n.id === 'final-default')!
        const matchNode = workflowResult.nodes.find(n => n.id === 'final-match')!
        const routerResult = workflowResult.nodes.find(n => n.id === 'router')!

        const output1Value = (routerResult as any).output_1?.getValue?.() ?? (routerResult as any).output_1
        const defaultValue = (routerResult as any).output_default?.getValue?.() ?? (routerResult as any).output_default

        console.log('=== demo-02 互斥路由测试结果 ===')
        console.log('Router output_1:', output1Value)
        console.log('Router output_default:', defaultValue)
        console.log('Final Default node input:', (defaultNode as any).input)
        console.log('Final Match node input:', (matchNode as any).input)

        // 关键断言：条件匹配时，默认分支应为 undefined
        expect(output1Value).toBe('02')
        expect(defaultValue).toBeUndefined()

        // Final Default 节点只应收到 Collector 的结果，不应有 '02' 从 Router 传来
        // 由于 input 是 IS_MULTI，会聚合多个输入源
        // 如果互斥路由正确，Final Default 只有 Collector 的 ["01", "02"]
        const defaultInput = (defaultNode as any).input
        console.log('Final Default input length:', defaultInput.length)

        // Final Match 节点应收到 '02'
        expect((matchNode as any).input).toContain('02')

        // 验证 Final Default 收到的数据不包含来自 Router.output_default 的重复 '02'
        // 如果互斥路由正确，defaultInput 不会是 ['02', '01', '02']
        // 而应该是 [['01', '02']]（只有 Collector 的结果）
        const flatInput = defaultInput.flat ? defaultInput.flat() : defaultInput
        const countOf02 = flatInput.filter((v: any) => v === '02').length
        console.log('Count of "02" in final-default:', countOf02)

        // 如果互斥路由正确，'02' 只来自 Collector，只应出现 1 次
        expect(countOf02).toBe(1)
    })
})
