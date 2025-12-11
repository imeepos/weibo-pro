import { describe, it, expect } from 'vitest'
import { root, Injectable } from '@sker/core'
import { ReactiveScheduler } from './reactive-scheduler'
import { createWorkflowGraphAst, Ast } from '../ast'
import { Node, Input, Output, Handler, IS_MULTI } from '../decorator'
import { type INode, IEdge, EdgeMode } from '../types'
import { Compiler } from '../compiler'
import { Observable } from 'rxjs'
import { lastValueFrom } from 'rxjs'

// 简单的多发射节点
@Node({ title: '多发射' })
class MultiEmitAst extends Ast {
    @Input() count: number = 0
    @Output() value?: number
    type = 'MultiEmitAst'
}

@Injectable()
class MultiEmitVisitor {
    @Handler(MultiEmitAst)
    visit(ast: MultiEmitAst): Observable<INode> {
        return new Observable<INode>(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            const emitCount = ast.count ?? 3
            for (let i = 1; i <= emitCount; i++) {
                ast.value = i
                ast.state = 'emitting'
                obs.next({ ...ast })
            }

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

// 聚合节点
@Node({ title: '聚合' })
class AggregatorAst extends Ast {
    @Input({ mode: IS_MULTI }) inputs: number[] = []
    @Output() result?: string
    type = 'AggregatorAst'
}

@Injectable()
class AggregatorVisitor {
    @Handler(AggregatorAst)
    visit(ast: AggregatorAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            console.log('[AggregatorVisitor] 接收到 inputs:', ast.inputs)
            ast.result = ast.inputs.join(',')
            ast.state = 'emitting'
            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

function createCompiledNode<T extends Ast>(
    NodeClass: new () => T,
    overrides?: Partial<T>
): INode {
    const compiler = root.get(Compiler)
    const instance = new NodeClass()
    Object.assign(instance, overrides)
    return compiler.compile(instance)
}

function createEdge(from: string, to: string, options?: Partial<IEdge>): IEdge {
    return {
        id: `${from}-${to}`,
        from,
        to,
        ...options
    }
}

describe('DEBUG: EdgeMode 组合问题', () => {
    let scheduler: ReactiveScheduler

    beforeEach(() => {
        scheduler = root.get(ReactiveScheduler)
    })

    it('简单 ZIP 测试', async () => {
        const source1 = createCompiledNode(MultiEmitAst, { id: 's1', count: 2 })
        const source2 = createCompiledNode(MultiEmitAst, { id: 's2', count: 2 })
        const target = createCompiledNode(AggregatorAst, { id: 'target' })

        const edges = [
            createEdge('s1', 'target', {
                fromProperty: 'value',
                toProperty: 'inputs',
                mode: EdgeMode.ZIP
            }),
            createEdge('s2', 'target', {
                fromProperty: 'value',
                toProperty: 'inputs',
                mode: EdgeMode.ZIP
            })
        ]

        const workflow = createWorkflowGraphAst({ nodes: [source1, source2, target], edges })

        console.log('[TEST] 开始执行工作流...')
        const result = await lastValueFrom(scheduler.schedule(workflow, workflow))

        console.log('[TEST] 工作流执行完成:', {
            workflowState: result.state,
            nodes: result.nodes.map(n => ({
                id: n.id,
                state: n.state,
                count: n.count,
                emitCount: n.emitCount
            }))
        })

        const targetNode = result.nodes.find(n => n.id === 'target') as any

        expect(targetNode?.state).toBe('success')
        expect(targetNode?.count).toBeGreaterThan(0)
    })

    it('ZIP + 独立 MERGE 测试', async () => {
        const zipSource1 = createCompiledNode(MultiEmitAst, { id: 'zip1', count: 2 })
        const zipSource2 = createCompiledNode(MultiEmitAst, { id: 'zip2', count: 2 })
        const zipTarget = createCompiledNode(AggregatorAst, { id: 'zipTarget' })

        const mergeSource = createCompiledNode(MultiEmitAst, { id: 'merge1', count: 2 })
        const mergeTarget = createCompiledNode(AggregatorAst, { id: 'mergeTarget' })

        const edges = [
            // ZIP 子图
            createEdge('zip1', 'zipTarget', {
                fromProperty: 'value',
                toProperty: 'inputs',
                mode: EdgeMode.ZIP
            }),
            createEdge('zip2', 'zipTarget', {
                fromProperty: 'value',
                toProperty: 'inputs',
                mode: EdgeMode.ZIP
            }),
            // MERGE 子图
            createEdge('merge1', 'mergeTarget', {
                fromProperty: 'value',
                toProperty: 'inputs',
                mode: EdgeMode.MERGE
            })
        ]

        const workflow = createWorkflowGraphAst({
            nodes: [zipSource1, zipSource2, zipTarget, mergeSource, mergeTarget],
            edges
        })

        console.log('[TEST] 开始执行 ZIP + MERGE 工作流...')
        const result = await lastValueFrom(scheduler.schedule(workflow, workflow))

        console.log('[TEST] 工作流执行完成:', {
            workflowState: result.state,
            nodes: result.nodes.map(n => ({
                id: n.id,
                state: n.state,
                count: n.count,
                emitCount: n.emitCount,
                result: (n as any).result
            }))
        })

        const zipNode = result.nodes.find(n => n.id === 'zipTarget') as any
        const mergeNode = result.nodes.find(n => n.id === 'mergeTarget') as any

        console.log('[TEST] ZIP Target:', { state: zipNode?.state, result: zipNode?.result, count: zipNode?.count })
        console.log('[TEST] MERGE Target:', { state: mergeNode?.state, result: mergeNode?.result, count: mergeNode?.count })

        expect(zipNode?.state).toBe('success')
        expect(mergeNode?.state).toBe('success')
    })
})
