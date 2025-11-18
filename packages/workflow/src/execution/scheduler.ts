import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, IAstStates, isControlEdge } from '../types';
import { DependencyAnalyzer } from './dependency-analyzer';
import { DataFlowManager } from './data-flow-manager';
import { StateMerger } from './state-merger';
import { executeAst } from '../executor';
import { Observable, of, EMPTY, forkJoin } from 'rxjs';
import { expand, map, catchError, takeWhile, last, defaultIfEmpty } from 'rxjs/operators';
import { Injectable, root } from '@sker/core';

/**
 * 工作流调度器 - 使用 RxJS expand 自动递归调度
 *
 * 核心设计：
 * - 依赖分析：自动识别可并发执行的节点
 * - 数据流管理：自动传递节点间的数据
 * - 状态合并：跟踪所有节点的执行状态
 * - 声明式调度：使用 RxJS expand 操作符实现自动递归调度
 * - 流式输出：支持实时监控执行进度
 */
@Injectable()
export class WorkflowScheduler {
    private dependencyAnalyzer: DependencyAnalyzer;
    private dataFlowManager: DataFlowManager;
    private stateMerger: StateMerger;

    constructor() {
        this.dependencyAnalyzer = root.get(DependencyAnalyzer)
        this.dataFlowManager = root.get(DataFlowManager)
        this.stateMerger = root.get(StateMerger)
    }

    /**
     * 使用 RxJS expand 自动递归调度工作流
     *
     * 执行流程：
     * 1. 初始化输入节点（如果是 pending 状态）
     * 2. 使用 expand 自动递归：
     *    - 找到可执行节点
     *    - 并发执行当前批次
     *    - 更新节点状态
     *    - 判断是否完成（所有可达节点都已完成）
     *    - 如果未完成且有可执行节点，继续递归
     * 3. 返回最终状态
     */
    schedule(ast: WorkflowGraphAst, ctx: any): Observable<INode> {
        const { state } = ast;

        // 已完成的工作流直接返回
        if (state === 'success' || state === 'fail') {
            return of(ast);
        }

        // 初始化输入节点
        if (state === 'pending' && ctx) {
            this.dataFlowManager.initializeInputNodes(ast.nodes, ast.edges, ctx);
        }

        ast.state = 'running';

        // 使用 expand 自动递归调度
        return of(ast).pipe(
            expand(currentAst => {
                // 找到可执行节点
                const executableNodes = this.dependencyAnalyzer.findExecutableNodes(
                    currentAst.nodes,
                    currentAst.edges
                );

                // 如果没有可执行节点，停止递归
                if (executableNodes.length === 0) {
                    return EMPTY;
                }

                // 并发执行当前批次
                return this.executeCurrentBatch(
                    executableNodes,
                    ctx,
                    currentAst.edges,
                    currentAst.nodes
                ).pipe(
                    map(({ nodes: newlyExecutedNodes }) => {
                        // 合并节点状态
                        const updatedNodes = this.stateMerger.mergeNodeStates(
                            currentAst.nodes,
                            newlyExecutedNodes
                        );

                        // 判断是否所有可达节点都已完成
                        const allReachableCompleted = this.dependencyAnalyzer.areAllReachableNodesCompleted(
                            updatedNodes,
                            currentAst.edges
                        );
                        const hasFailures = updatedNodes.some(node => node.state === 'fail');

                        // 确定当前状态
                        const currentState: IAstStates = allReachableCompleted
                            ? (hasFailures ? 'fail' : 'success')
                            : 'running';

                        currentAst.nodes = updatedNodes;
                        currentAst.state = currentState;

                        return currentAst;
                    })
                );
            }),
            // 持续执行直到状态不再是 running
            takeWhile(currentAst => currentAst.state === 'running', true),
            // 获取最后一个状态（即最终状态）
            last(),
            catchError(error => {
                // 调度失败，设置工作流为失败状态
                ast.state = 'fail';
                ast.setError(error);
                return of(ast);
            })
        );
    }

    /**
     * 并发执行当前批次的节点
     */
    private executeCurrentBatch(
        nodes: INode[],
        ctx: any,
        edges: IEdge[],
        workflowNodes: INode[]
    ): Observable<{ nodes: INode[]; outputs: Map<string, any> }> {
        const allOutputs = new Map<string, any>();
        const completedNodes = workflowNodes.filter(n => n.state === 'success');

        // 收集已完成节点的输出
        completedNodes.forEach(node => {
            const outputs = this.dataFlowManager.extractNodeOutputs(node);
            if (outputs) {
                allOutputs.set(node.id, outputs);
            }
        });

        // 如果没有可执行节点，直接返回
        if (nodes.length === 0) {
            return of({ nodes: [], outputs: allOutputs });
        }

        // 为每个节点创建执行 Observable
        const nodeExecutions = nodes.map(node =>
            this.executeNode(node, ctx, edges, workflowNodes, allOutputs)
        );

        // 使用 forkJoin 并发执行所有节点
        return forkJoin(nodeExecutions).pipe(
            map(results => {
                // 收集所有节点的输出
                results.forEach(({ node, outputs }) => {
                    if (outputs) {
                        allOutputs.set(node.id, outputs);
                    }
                });

                return {
                    nodes: results.map(r => r.node),
                    outputs: allOutputs
                };
            }),
            // 如果 forkJoin 为空（无节点），使用 defaultIfEmpty
            defaultIfEmpty({ nodes: [], outputs: allOutputs })
        );
    }

    /**
     * 执行单个节点
     */
    private executeNode(
        node: INode,
        ctx: any,
        edges: IEdge[],
        workflowNodes: INode[],
        allOutputs: Map<string, any>
    ): Observable<{ node: INode; outputs: any; success: boolean }> {
        // 为节点分配输入
        this.dataFlowManager.assignInputsToNode(node, allOutputs, edges, workflowNodes);

        // 执行节点
        return executeAst(node, ctx).pipe(
            map(resultNode => {
                // 提取节点输出
                const outputs = this.dataFlowManager.extractNodeOutputs(resultNode);

                // 处理出边：激活下游节点
                const outgoingEdges = edges.filter(e => e.from === node.id);

                outgoingEdges.forEach(edge => {
                    // 检查控制流边的条件
                    if (isControlEdge(edge) && edge.condition) {
                        const actualValue = (resultNode as any)[edge.condition.property];
                        if (actualValue !== edge.condition.value) {
                            return; // 条件不满足，跳过此边
                        }
                    }

                    // 激活下游节点
                    const downstream = workflowNodes.find(n => n.id === edge.to);
                    if (downstream) {
                        downstream.state = 'pending';
                    }
                });

                return {
                    node: resultNode,
                    outputs: outputs,
                    success: true
                };
            }),
            catchError(error => {
                // 节点执行失败
                node.state = 'fail';
                if (error instanceof Error) {
                    node.setError(error);
                } else {
                    node.setError(new Error(String(error)));
                }
                console.error(`[WorkflowScheduler] 节点执行失败: ${node.id}`, error);

                return of({
                    node: node,
                    outputs: null,
                    success: false
                });
            })
        );
    }
}
