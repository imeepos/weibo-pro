import { describe, it, expect } from 'vitest'
import { root, Injectable } from '@sker/core'
import { ReactiveScheduler } from './reactive-scheduler'
import { createWorkflowGraphAst } from '../ast'
import { TextAreaAst } from '../TextAreaAst'
import { CollectorAst } from '../CollectorAst'
import { LoopAst } from '../LoopAst'
import { Handler } from '../decorator'
import { lastValueFrom, Observable } from 'rxjs'
import { BehaviorSubject } from 'rxjs'
import type { INode } from '../types'

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

@Injectable()
class TestCollectorVisitor {
    @Handler(CollectorAst)
    handler(ast: CollectorAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            let items = ast.items || []
            if (Array.isArray(items) && items.length > 0) {
                items = items.flat()
            }

            ast.result.next(items)

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

@Injectable()
class TestLoopVisitor {
    @Handler(LoopAst)
    handler(ast: LoopAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            let items: any[] = ast.items || []
            if (!Array.isArray(items)) {
                items = [items]
            }
            items = items.flat().filter(v => v != null)

            const batchSize = Math.max(1, ast.batchSize || 1)
            const total = items.length

            ast.total.next(total)
            ast.done.next(false)
            obs.next({ ...ast })

            if (total === 0) {
                ast.done.next(true)
                ast.state = 'success'
                obs.next({ ...ast })
                obs.complete()
                return
            }

            const emitBatch = (startIndex: number) => {
                const endIndex = Math.min(startIndex + batchSize, total)
                const batch = batchSize === 1
                    ? items[startIndex]
                    : items.slice(startIndex, endIndex)

                ast.index.next(startIndex)
                ast.current.next(batch)
                obs.next({ ...ast })

                const nextIndex = endIndex
                if (nextIndex < total) {
                    emitBatch(nextIndex)
                } else {
                    ast.done.next(true)
                    ast.state = 'success'
                    obs.next({ ...ast })
                    obs.complete()
                }
            }

            emitBatch(0)
        })
    }
}

/**
 * CollectorAst → LoopAst 数据流测试
 *
 * 问题：CollectorAst 的 result BehaviorSubject 初始值是空数组 []
 *      LoopAst 订阅时如果取到空数组，会立即完成
 *      导致真正的数据 ["01", "02"] 永远不会被处理
 *
 * 修复：shouldSkipInitial 应该把空数组也当作需要跳过的初始值
 */
describe('ReactiveScheduler - CollectorAst → LoopAst 数据流', () => {
    it('应该正确传递 CollectorAst 的输出到 LoopAst', async () => {
        const scheduler = root.get(ReactiveScheduler)

        // TextAreaAst 节点 1
        const nodeText1 = new TextAreaAst()
        nodeText1.id = 'text-1'
        nodeText1.input = '01'
        nodeText1.output = new BehaviorSubject<string | null>('')

        // TextAreaAst 节点 2
        const nodeText2 = new TextAreaAst()
        nodeText2.id = 'text-2'
        nodeText2.input = '02'
        nodeText2.output = new BehaviorSubject<string | null>('')

        // CollectorAst 节点
        const nodeCollector = new CollectorAst()
        nodeCollector.id = 'collector'
        nodeCollector.items = []
        nodeCollector.result = new BehaviorSubject<any[]>([])

        // LoopAst 节点
        const nodeLoop = new LoopAst()
        nodeLoop.id = 'loop'
        nodeLoop.items = []
        nodeLoop.batchSize = 1
        nodeLoop.delay = 0
        nodeLoop.current = new BehaviorSubject<any>(undefined)
        nodeLoop.index = new BehaviorSubject<number>(0)
        nodeLoop.total = new BehaviorSubject<number>(0)
        nodeLoop.done = new BehaviorSubject<boolean>(false)

        const workflow = createWorkflowGraphAst()
        workflow.id = 'workflow-collector-loop'
        workflow.name = 'collector-loop-test'
        workflow.nodes = [nodeText1, nodeText2, nodeCollector, nodeLoop]
        workflow.edges = [
            {
                id: 'edge-1',
                from: 'text-1',
                to: 'collector',
                fromProperty: 'output',
                toProperty: 'items',
                type: 'data' as const
            },
            {
                id: 'edge-2',
                from: 'text-2',
                to: 'collector',
                fromProperty: 'output',
                toProperty: 'items',
                type: 'data' as const
            },
            {
                id: 'edge-3',
                from: 'collector',
                to: 'loop',
                fromProperty: 'result',
                toProperty: 'items',
                type: 'data' as const
            }
        ]
        workflow.entryNodeIds = ['text-1', 'text-2']

        const result = await lastValueFrom(scheduler.schedule(workflow, workflow))

        expect(result.state).toBe('success')

        const finalCollector = result.nodes.find(n => n.id === 'collector')
        const finalLoop = result.nodes.find(n => n.id === 'loop')

        expect(finalCollector?.state).toBe('success')
        expect(finalLoop?.state).toBe('success')

        // CollectorAst 收集到 ["01", "02"]
        expect((finalCollector as any).result.getValue()).toEqual(['01', '02'])

        // LoopAst 接收到正确的数据并执行完成
        expect((finalLoop as any).total.getValue()).toBe(2)
        expect((finalLoop as any).done.getValue()).toBe(true)
    })

    it('应该跳过 BehaviorSubject 的初始空数组', async () => {
        const scheduler = root.get(ReactiveScheduler)

        // CollectorAst 节点 - 直接使用固定输入
        const nodeCollector = new CollectorAst()
        nodeCollector.id = 'collector'
        nodeCollector.items = ['a', 'b', 'c']  // 直接设置输入
        nodeCollector.result = new BehaviorSubject<any[]>([])

        // LoopAst 节点
        const nodeLoop = new LoopAst()
        nodeLoop.id = 'loop'
        nodeLoop.items = []
        nodeLoop.batchSize = 1
        nodeLoop.delay = 0
        nodeLoop.current = new BehaviorSubject<any>(undefined)
        nodeLoop.index = new BehaviorSubject<number>(0)
        nodeLoop.total = new BehaviorSubject<number>(0)
        nodeLoop.done = new BehaviorSubject<boolean>(false)

        const workflow = createWorkflowGraphAst()
        workflow.id = 'workflow-skip-empty'
        workflow.name = 'skip-empty-array-test'
        workflow.nodes = [nodeCollector, nodeLoop]
        workflow.edges = [
            {
                id: 'edge-1',
                from: 'collector',
                to: 'loop',
                fromProperty: 'result',
                toProperty: 'items',
                type: 'data' as const
            }
        ]
        workflow.entryNodeIds = ['collector']

        const result = await lastValueFrom(scheduler.schedule(workflow, workflow))

        expect(result.state).toBe('success')

        const finalLoop = result.nodes.find(n => n.id === 'loop')

        expect(finalLoop?.state).toBe('success')
        expect((finalLoop as any).total.getValue()).toBe(3)
        expect((finalLoop as any).done.getValue()).toBe(true)
    })
})
