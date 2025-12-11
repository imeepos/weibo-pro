import { describe, it, expect, beforeEach } from 'vitest'
import { root, Injectable } from '@sker/core'
import { ReactiveScheduler } from './reactive-scheduler'
import { createWorkflowGraphAst, WorkflowGraphAst, Ast } from '../ast'
import { Node, Input, Output, Handler } from '../decorator'
import { type INode, IEdge } from '../types'
import { Compiler } from '../compiler'
import { Observable } from 'rxjs'
import { lastValueFrom } from 'rxjs'

/**
 * 测试：增量执行 (fineTuneNode) 时的调度器 Bug
 *
 * 错误消息：
 * Uncaught (in promise) Error: 内部错误：节点 07731c31-75e8-4c32-9d9c-0510129b6076 状态为 pending，
 * 但未被标记为受影响节点。这可能是调度器的 bug，请联系开发者。
 * at buildNode (reactive-scheduler.ts:271:27)
 * at ReactiveScheduler.buildIncrementalNetwork
 *
 * 根本原因：
 * 在 buildIncrementalNetwork 中，当某个未受影响的节点（不在 affectedNodes 集合中）的状态不是 success 或 fail 时，
 * 调度器会抛出错误。这表示在增量执行场景中，被跳过的节点要么应该已执行完成（success/fail），要么应该被标记为受影响。
 *
 * Bug 情景：
 * 1. 完整工作流执行：A → B → C（都成功）
 * 2. 修改 B 的参数，调用 fineTuneNode(workflow, 'B')
 * 3. 此时 affectedNodes = {B, C}（B 和下游的 C）
 * 4. A 应该保持 success（已执行），B 重新执行，C 重新执行
 * 5. 但如果 A 的状态在某些情况下变成了 pending，而 A 不在 affectedNodes 中，就会触发错误
 */

// ============================================================================
// 测试节点定义
// ============================================================================

@Node({ title: '基础节点 A' })
class NodeAst extends Ast {
    @Input() input?: string
    @Output() output?: string
    type = 'NodeAst'
}

@Injectable()
class NodeVisitor {
    @Handler(NodeAst)
    visit(ast: NodeAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            ast.output = ast.input ?? 'default'
            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

// ============================================================================
// 辅助函数
// ============================================================================

function createCompiledNode<T extends Ast>(
    NodeClass: new () => T,
    overrides?: Partial<T>
): INode {
    const compiler = root.get(Compiler)
    const instance = new NodeClass()
    Object.assign(instance, overrides)
    return compiler.compile(instance)
}

function createEdge(
    from: string,
    to: string,
    options?: Partial<IEdge>
): IEdge {
    return {
        id: `${from}-${to}`,
        from,
        to,
        ...options
    }
}

function createWorkflow(nodes: INode[], edges: IEdge[]): WorkflowGraphAst {
    return createWorkflowGraphAst({ nodes, edges })
}

async function getFinal<T>(obs: Observable<T>): Promise<T> {
    return lastValueFrom(obs)
}

// ============================================================================
// 测试套件
// ============================================================================

describe('ReactiveScheduler - 增量执行 Bug 复现', () => {
    let scheduler: ReactiveScheduler

    beforeEach(() => {
        scheduler = root.get(ReactiveScheduler)
    })

    describe('fineTuneNode 增量执行', () => {
        it('应该能够增量执行链式工作流中的中间节点', async () => {
            // 场景：A → B → C 的链式工作流
            const nodeA = createCompiledNode(NodeAst, {
                id: 'node-a',
                input: 'initial',
                state: 'success',
                output: 'initial'
            })
            const nodeB = createCompiledNode(NodeAst, { id: 'node-b' })
            const nodeC = createCompiledNode(NodeAst, { id: 'node-c' })

            const edges = [
                createEdge('node-a', 'node-b', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-b', 'node-c', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([nodeA, nodeB, nodeC], edges)

            // 第一步：执行完整工作流
            const fullResult = await getFinal(scheduler.schedule(workflow, workflow))
            expect(fullResult.state).toBe('success')
            expect(fullResult.nodes.find(n => n.id === 'node-a')?.state).toBe('success')
            expect(fullResult.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            expect(fullResult.nodes.find(n => n.id === 'node-c')?.state).toBe('success')

            // 第二步：修改 B 的输入，使用 fineTuneNode 增量执行
            const targetNode = fullResult.nodes.find(n => n.id === 'node-b')!
            ;(targetNode as any).input = 'modified'

            // 这里应该不会抛出错误
            const incrementalResult = await getFinal(
                scheduler.fineTuneNode(fullResult, 'node-b')
            )

            expect(incrementalResult.state).toBe('success')
            expect(incrementalResult.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            expect(incrementalResult.nodes.find(n => n.id === 'node-c')?.state).toBe('success')

            // 注：A 节点在流网络中会被构建但不执行（在未受影响节点分支返回 of(node)）
            // 所以 count 可能为 1（来自 of 操作符的发射）
            // 关键是 A 没有被重新执行（executeNode 没有被调用）
            const nodeAResult = incrementalResult.nodes.find(n => n.id === 'node-a')
            expect(nodeAResult?.state).toBe('success')
            expect((nodeAResult as any)?.output).toBe('initial')
        })

        it('应该支持增量执行扇出结构中的节点', async () => {
            // 场景：A 扇出到 B 和 C
            const nodeA = createCompiledNode(NodeAst, {
                id: 'node-a',
                input: 'source',
                state: 'success',
                output: 'source'
            })
            const nodeB = createCompiledNode(NodeAst, { id: 'node-b' })
            const nodeC = createCompiledNode(NodeAst, { id: 'node-c' })

            const edges = [
                createEdge('node-a', 'node-b', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-a', 'node-c', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([nodeA, nodeB, nodeC], edges)

            // 第一步：完整执行
            const fullResult = await getFinal(scheduler.schedule(workflow, workflow))
            expect(fullResult.state).toBe('success')

            // 第二步：修改 B，增量执行
            const targetNode = fullResult.nodes.find(n => n.id === 'node-b')!
            ;(targetNode as any).input = 'new-value'

            // 只有 B 应该被重新执行，C 保持历史状态
            const incrementalResult = await getFinal(
                scheduler.fineTuneNode(fullResult, 'node-b')
            )

            expect(incrementalResult.state).toBe('success')
            // B 被重新执行
            expect(incrementalResult.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            // C 不应该改变（保持历史状态）
            expect(incrementalResult.nodes.find(n => n.id === 'node-c')?.state).toBe('success')
        })

        it('应该支持增量执行扇入结构中的节点', async () => {
            // 场景：B 和 C 扇入到 A
            const nodeB = createCompiledNode(NodeAst, {
                id: 'node-b',
                input: 'data-b',
                state: 'success',
                output: 'data-b'
            })
            const nodeC = createCompiledNode(NodeAst, {
                id: 'node-c',
                input: 'data-c',
                state: 'success',
                output: 'data-c'
            })
            const nodeA = createCompiledNode(NodeAst, { id: 'node-a' })

            const edges = [
                createEdge('node-b', 'node-a', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-c', 'node-a', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([nodeA, nodeB, nodeC], edges)

            // 第一步：完整执行
            const fullResult = await getFinal(scheduler.schedule(workflow, workflow))
            expect(fullResult.state).toBe('success')

            // 第二步：修改 A，增量执行
            const targetNode = fullResult.nodes.find(n => n.id === 'node-a')!
            ;(targetNode as any).input = 'override'

            // 只有 A 应该被重新执行
            const incrementalResult = await getFinal(
                scheduler.fineTuneNode(fullResult, 'node-a')
            )

            expect(incrementalResult.state).toBe('success')
            expect(incrementalResult.nodes.find(n => n.id === 'node-a')?.state).toBe('success')
            expect(incrementalResult.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            expect(incrementalResult.nodes.find(n => n.id === 'node-c')?.state).toBe('success')
        })

        it('应该支持增量执行菱形依赖结构', async () => {
            // 场景：
            //     A
            //    / \
            //   B   C
            //    \ /
            //     D
            const nodeA = createCompiledNode(NodeAst, {
                id: 'node-a',
                input: 'start',
                state: 'success',
                output: 'start'
            })
            const nodeB = createCompiledNode(NodeAst, { id: 'node-b', state: 'success' })
            const nodeC = createCompiledNode(NodeAst, { id: 'node-c', state: 'success' })
            const nodeD = createCompiledNode(NodeAst, { id: 'node-d', state: 'success' })

            const edges = [
                createEdge('node-a', 'node-b', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-a', 'node-c', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-b', 'node-d', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-c', 'node-d', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([nodeA, nodeB, nodeC, nodeD], edges)

            // 第一步：完整执行
            const fullResult = await getFinal(scheduler.schedule(workflow, workflow))
            expect(fullResult.state).toBe('success')

            // 第二步：修改 B，增量执行（B 和 D 应该被重新执行）
            const targetNode = fullResult.nodes.find(n => n.id === 'node-b')!
            ;(targetNode as any).input = 'modified'

            const incrementalResult = await getFinal(
                scheduler.fineTuneNode(fullResult, 'node-b')
            )

            expect(incrementalResult.state).toBe('success')
            // A 和 C 不应该改变
            expect(incrementalResult.nodes.find(n => n.id === 'node-a')?.state).toBe('success')
            expect(incrementalResult.nodes.find(n => n.id === 'node-c')?.state).toBe('success')
            // B 应该被重新执行
            expect(incrementalResult.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            // D 应该被重新执行（下游节点）
            expect(incrementalResult.nodes.find(n => n.id === 'node-d')?.state).toBe('success')
        })

        it('BUG 复现：修改链式结构中间节点时不应该抛出错误', async () => {
            // 这是触发 bug 的具体场景：
            // 1. 完整工作流执行 A → B → C
            // 2. 修改 B，调用 fineTuneNode(workflow, 'B')
            // 3. affectedNodes 计算为 {B, C}
            // 4. 当构建 B 的上游节点 A 时，A 不在 affectedNodes 中
            // 5. 如果 A 的状态变成了 pending（可能是某种状态复制错误），
            //    调度器会在第 271 行抛出错误

            const nodeA = createCompiledNode(NodeAst, {
                id: 'node-a',
                input: 'start',
                state: 'success',
                output: 'start'
            })
            const nodeB = createCompiledNode(NodeAst, { id: 'node-b' })
            const nodeC = createCompiledNode(NodeAst, { id: 'node-c' })

            const edges = [
                createEdge('node-a', 'node-b', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-b', 'node-c', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([nodeA, nodeB, nodeC], edges)

            // 完整执行
            const fullResult = await getFinal(scheduler.schedule(workflow, workflow))
            expect(fullResult.state).toBe('success')

            // 这里应该能够成功执行，不抛出错误
            const incrementalResult = await getFinal(
                scheduler.fineTuneNode(fullResult, 'node-b')
            )

            expect(incrementalResult.state).toBe('success')
            // 验证最终状态正确
            expect(incrementalResult.nodes.find(n => n.id === 'node-a')?.state).toBe('success')
            expect(incrementalResult.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            expect(incrementalResult.nodes.find(n => n.id === 'node-c')?.state).toBe('success')
        })

        it('BUG 复现：深度链式结构中的增量执行', async () => {
            // 更复杂的场景：A → B → C → D → E
            // 修改 C，应该只重新执行 C → D → E
            const nodes = [
                createCompiledNode(NodeAst, {
                    id: 'node-a',
                    input: 'start',
                    state: 'success',
                    output: 'start'
                }),
                createCompiledNode(NodeAst, { id: 'node-b', state: 'success' }),
                createCompiledNode(NodeAst, { id: 'node-c', state: 'success' }),
                createCompiledNode(NodeAst, { id: 'node-d', state: 'success' }),
                createCompiledNode(NodeAst, { id: 'node-e', state: 'success' })
            ]

            const edges = [
                createEdge('node-a', 'node-b', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-b', 'node-c', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-c', 'node-d', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-d', 'node-e', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow(nodes, edges)

            // 完整执行
            const fullResult = await getFinal(scheduler.schedule(workflow, workflow))
            expect(fullResult.state).toBe('success')

            // 修改 C 并增量执行
            const nodeC = fullResult.nodes.find(n => n.id === 'node-c')!
            ;(nodeC as any).input = 'modified'

            // 不应该抛出错误
            const incrementalResult = await getFinal(
                scheduler.fineTuneNode(fullResult, 'node-c')
            )

            expect(incrementalResult.state).toBe('success')
            // A 和 B 不应该改变
            expect(incrementalResult.nodes.find(n => n.id === 'node-a')?.state).toBe('success')
            expect(incrementalResult.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            // C、D、E 应该重新执行
            expect(incrementalResult.nodes.find(n => n.id === 'node-c')?.state).toBe('success')
            expect(incrementalResult.nodes.find(n => n.id === 'node-d')?.state).toBe('success')
            expect(incrementalResult.nodes.find(n => n.id === 'node-e')?.state).toBe('success')
        })
    })

    describe('executeNodeIsolated 单节点执行', () => {
        it('应该能够独立执行单个节点，下游不受影响', async () => {
            const nodeA = createCompiledNode(NodeAst, {
                id: 'node-a',
                input: 'start',
                state: 'success',
                output: 'start'
            })
            const nodeB = createCompiledNode(NodeAst, { id: 'node-b', state: 'success' })
            const nodeC = createCompiledNode(NodeAst, { id: 'node-c', state: 'success' })

            const edges = [
                createEdge('node-a', 'node-b', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-b', 'node-c', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([nodeA, nodeB, nodeC], edges)

            // 完整执行
            const fullResult = await getFinal(scheduler.schedule(workflow, workflow))
            expect(fullResult.state).toBe('success')

            // 独立执行 B（不执行下游 C）
            const result = await getFinal(scheduler.executeNodeIsolated(fullResult, 'node-b'))

            expect(result.state).toBe('success')
            // A 不执行
            expect(result.nodes.find(n => n.id === 'node-a')?.state).toBe('success')
            // B 执行
            expect(result.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            // C 不执行（下游不受影响）
            expect(result.nodes.find(n => n.id === 'node-c')?.state).toBe('success')
        })

        it('单节点执行不应该抛出错误', async () => {
            const nodeA = createCompiledNode(NodeAst, {
                id: 'node-a',
                input: 'start',
                state: 'success',
                output: 'start'
            })
            const nodeB = createCompiledNode(NodeAst, { id: 'node-b', state: 'success' })

            const edges = [
                createEdge('node-a', 'node-b', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([nodeA, nodeB], edges)

            // 完整执行
            const fullResult = await getFinal(scheduler.schedule(workflow, workflow))
            expect(fullResult.state).toBe('success')

            // 独立执行 B
            const result = await getFinal(scheduler.executeNodeIsolated(fullResult, 'node-b'))

            expect(result.state).toBe('success')
        })

        it('应该能够执行单个节点，即使下游节点尚未执行', async () => {
            // 这是核心修复的验证：executeNodeIsolated 不应该要求下游已完成
            const nodeA = createCompiledNode(NodeAst, {
                id: 'node-a',
                input: 'start',
                state: 'success',
                output: 'start'
            })
            const nodeB = createCompiledNode(NodeAst, { id: 'node-b', state: 'pending' })
            const nodeC = createCompiledNode(NodeAst, { id: 'node-c', state: 'pending' })

            const edges = [
                createEdge('node-a', 'node-b', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-b', 'node-c', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([nodeA, nodeB, nodeC], edges)

            // 现在执行 B，即使 C 还是 pending
            // 这应该能成功，而不是抛出"节点尚未完成"的错误
            const result = await getFinal(scheduler.executeNodeIsolated(workflow, 'node-b'))

            expect(result.state).toBe('success')
            expect(result.nodes.find(n => n.id === 'node-a')?.state).toBe('success')
            expect(result.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            // C 保持 pending（不执行下游）
            expect(result.nodes.find(n => n.id === 'node-c')?.state).toBe('pending')
        })

        it('应该能够执行单个节点，即使同级无关节点尚未执行', async () => {
            // 场景：A → B, A → D, B → C
            // A 已成功，B 和 D 还是 pending
            const nodeA = createCompiledNode(NodeAst, {
                id: 'node-a',
                input: 'start',
                state: 'success',
                output: 'start'
            })
            const nodeB = createCompiledNode(NodeAst, { id: 'node-b', state: 'pending' })
            const nodeC = createCompiledNode(NodeAst, { id: 'node-c', state: 'pending' })
            const nodeD = createCompiledNode(NodeAst, { id: 'node-d', state: 'pending' })

            const edges = [
                createEdge('node-a', 'node-b', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-a', 'node-d', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-b', 'node-c', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([nodeA, nodeB, nodeC, nodeD], edges)

            // 执行 B，即使 D 还是 pending（同级的另一个分支）
            const result = await getFinal(scheduler.executeNodeIsolated(workflow, 'node-b'))

            expect(result.state).toBe('success')
            expect(result.nodes.find(n => n.id === 'node-a')?.state).toBe('success')
            expect(result.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            expect(result.nodes.find(n => n.id === 'node-c')?.state).toBe('pending')
            expect(result.nodes.find(n => n.id === 'node-d')?.state).toBe('pending')
        })

        it('应该在执行单个节点后，能够再执行其他节点', async () => {
            // 连续执行：先执行 B，后执行 D
            const nodeA = createCompiledNode(NodeAst, {
                id: 'node-a',
                input: 'start',
                state: 'success',
                output: 'start'
            })
            const nodeB = createCompiledNode(NodeAst, { id: 'node-b', state: 'pending' })
            const nodeD = createCompiledNode(NodeAst, { id: 'node-d', state: 'pending' })

            const edges = [
                createEdge('node-a', 'node-b', {
                    fromProperty: 'output',
                    toProperty: 'input'
                }),
                createEdge('node-a', 'node-d', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([nodeA, nodeB, nodeD], edges)

            // 执行 B
            const stateAfterB = await getFinal(scheduler.executeNodeIsolated(workflow, 'node-b'))
            expect(stateAfterB.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            expect(stateAfterB.nodes.find(n => n.id === 'node-d')?.state).toBe('pending')

            // 再执行 D
            const stateAfterD = await getFinal(scheduler.executeNodeIsolated(stateAfterB, 'node-d'))
            expect(stateAfterD.nodes.find(n => n.id === 'node-b')?.state).toBe('success')
            expect(stateAfterD.nodes.find(n => n.id === 'node-d')?.state).toBe('success')
        })
    })
})

