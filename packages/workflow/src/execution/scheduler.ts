import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, IAstStates, isControlEdge } from '../types';
import { DependencyAnalyzer } from './dependency-analyzer';
import { DataFlowManager } from './data-flow-manager';
import { StateMerger } from './state-merger';
import { executeAst } from '../executor';
import { Observable, of, EMPTY, forkJoin, merge } from 'rxjs';
import { expand, map, catchError, takeWhile, last, defaultIfEmpty, tap, switchMap } from 'rxjs/operators';
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

    /**
     * AST 实例管理 - 跟踪所有 AST 实例，用于区分状态变更和新建 AST
     */
    private astInstances = new Map<string, INode>();

    constructor() {
        this.dependencyAnalyzer = root.get(DependencyAnalyzer)
        this.dataFlowManager = root.get(DataFlowManager)
        this.stateMerger = root.get(StateMerger)
    }

    /**
     * 使用 RxJS expand 自动递归调度工作流，发射所有状态变化
     *
     * 执行流程：
     * 1. 初始化输入节点（如果是 pending 状态）
     * 2. 使用 expand 自动递归：
     *    - 找到可执行节点
     *    - 并发执行当前批次（使用流式方法）
     *    - 每个节点状态变化立即更新工作流图并发射
     *    - 判断是否完成（所有可达节点都已完成）
     *    - 如果未完成且有可执行节点，继续递归
     * 3. 发射所有中间状态（已移除 last() 操作符）
     */
    schedule(ast: WorkflowGraphAst, ctx: any): Observable<WorkflowGraphAst> {
        const { state } = ast;

        // 已完成的工作流直接返回
        if (state === 'success' || state === 'fail') {
            return of(ast);
        }

        // 清空并初始化 AST 实例管理
        this.astInstances.clear();
        ast.nodes.forEach(node => {
            this.astInstances.set(node.id, node);
        });

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

                // ✅ 使用流式方法执行当前批次，每个节点状态变化立即发射
                return this.executeCurrentBatchStreaming(
                    executableNodes,
                    ctx,
                    currentAst.edges,
                    currentAst.nodes
                ).pipe(
                    map(updatedNode => {
                        // 每次单个节点状态变化，立即更新工作流图并发射
                        const nodeIndex = currentAst.nodes.findIndex(n => n.id === updatedNode.id);
                        if (nodeIndex !== -1) {
                            currentAst.nodes[nodeIndex] = updatedNode;
                        }

                        // 判断是否所有可达节点都已完成
                        const allReachableCompleted = this.dependencyAnalyzer.areAllReachableNodesCompleted(
                            currentAst.nodes,
                            currentAst.edges
                        );
                        const hasFailures = currentAst.nodes.some(node => node.state === 'fail');

                        // 确定当前状态
                        const currentState: IAstStates = allReachableCompleted
                            ? (hasFailures ? 'fail' : 'success')
                            : 'running';

                        currentAst.state = currentState;

                        // ✅ 每次节点变化都发射新的工作流图状态
                        return currentAst;
                    })
                );
            }),
            // 持续执行直到状态不再是 running
            takeWhile(currentAst => currentAst.state === 'running', true),
            // ✅ 已移除 last() - 现在会发射所有中间状态
            catchError(error => {
                // 调度失败，设置工作流为失败状态
                ast.state = 'fail';
                ast.setError(error);
                return of(ast);
            })
        );
    }

    /**
     * ✅ 新增：流式执行当前批次，每个节点状态变化立即发射
     *
     * 核心设计：
     * - 使用 merge 替代 forkJoin，实现节点级细粒度状态流
     * - 任何一个节点状态变化，立即发射到上层 Observable
     * - 前端可实时看到每个节点的执行进度
     */
    private executeCurrentBatchStreaming(
        nodes: INode[],
        ctx: any,
        edges: IEdge[],
        workflowNodes: INode[]
    ): Observable<INode> {
        const allOutputs = new Map<string, any>();
        const completedNodes = workflowNodes.filter(n => n.state === 'success');

        // 收集已完成节点的输出
        completedNodes.forEach(node => {
            const outputs = this.dataFlowManager.extractNodeOutputs(node);
            if (outputs) {
                allOutputs.set(node.id, outputs);
            }
        });

        // 如果没有可执行节点，返回空
        if (nodes.length === 0) {
            return EMPTY;
        }

        // ✅ 关键改造：使用 merge 而非 forkJoin
        // merge 会在任何一个节点发射状态时立即发射
        const nodeExecutions = nodes.map(node =>
            this.executeNodeStreaming(node, ctx, edges, workflowNodes, allOutputs)
        );

        return merge(...nodeExecutions);
    }

    /**
     * ✅ 增强：流式执行单个节点，支持多 AST 触发
     *
     * 核心设计：
     * - 区分状态变更和新建 AST
     * - 状态变更：更新现有 AST 实例
     * - 新建 AST：注册新实例并触发下游节点
     * - 每个新建 AST 独立触发下游执行
     */
    private executeNodeStreaming(
        node: INode,
        ctx: any,
        edges: IEdge[],
        workflowNodes: INode[],
        allOutputs: Map<string, any>
    ): Observable<INode> {
        // 为节点分配输入
        this.dataFlowManager.assignInputsToNode(node, allOutputs, edges, workflowNodes);

        // ✅ 关键改造：支持多 AST 触发
        return executeAst(node, ctx).pipe(
            // 使用 expand 处理多个 AST 发射
            expand(emittedAst => {
                // 判断是状态变更还是新建 AST
                if (this.astInstances.has(emittedAst.id)) {
                    // 状态变更：更新现有 AST
                    return this.handleStateChange(emittedAst, edges, workflowNodes, allOutputs);
                } else {
                    // 新建 AST：创建新实例并触发下游
                    return this.handleNewAst(emittedAst, ctx, edges, workflowNodes, allOutputs);
                }
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

                // 确保 emit 失败状态的节点
                return of(node);
            })
        );
    }

    /**
     * 处理状态变更：更新现有 AST 实例
     */
    private handleStateChange(
        updatedAst: INode,
        edges: IEdge[],
        workflowNodes: INode[],
        allOutputs: Map<string, any>
    ): Observable<INode> {
        // 更新现有 AST 实例
        this.astInstances.set(updatedAst.id, updatedAst);

        // 提取输出（如果是成功状态）
        if (updatedAst.state === 'success') {
            const outputs = this.dataFlowManager.extractNodeOutputs(updatedAst);
            if (outputs) {
                allOutputs.set(updatedAst.id, outputs);
            }
        }

        return of(updatedAst);
    }

    /**
     * 处理新建 AST：注册新实例并触发下游节点
     */
    private handleNewAst(
        newAst: INode,
        ctx: any,
        edges: IEdge[],
        workflowNodes: INode[],
        allOutputs: Map<string, any>
    ): Observable<INode> {
        // 注册新 AST 实例
        this.astInstances.set(newAst.id, newAst);

        // 提取输出（如果是成功状态）
        if (newAst.state === 'success') {
            const outputs = this.dataFlowManager.extractNodeOutputs(newAst);
            if (outputs) {
                allOutputs.set(newAst.id, outputs);
            }

            // 触发下游节点执行
            return this.triggerDownstreamNodes(newAst, ctx, edges, workflowNodes, allOutputs);
        }

        return of(newAst);
    }

    /**
     * 触发下游节点执行：为每个新建 AST 独立触发下游节点
     */
    private triggerDownstreamNodes(
        sourceAst: INode,
        ctx: any,
        edges: IEdge[],
        workflowNodes: INode[],
        allOutputs: Map<string, any>
    ): Observable<INode> {
        const outgoingEdges = edges.filter(e => e.from === sourceAst.id);
        const downstreamExecutions: Observable<INode>[] = [];

        outgoingEdges.forEach(edge => {
            // 检查控制流边的条件
            if (isControlEdge(edge) && edge.condition) {
                const actualValue = (sourceAst as any)[edge.condition.property];
                if (actualValue !== edge.condition.value) {
                    return; // 条件不满足，跳过此边
                }
            }

            // 激活下游节点
            const downstream = workflowNodes.find(n => n.id === edge.to);
            if (downstream && downstream.state === 'pending') {
                // 为下游节点分配输入
                this.dataFlowManager.assignInputsToNode(downstream, allOutputs, edges, workflowNodes);

                // 执行下游节点
                downstreamExecutions.push(
                    this.executeNodeStreaming(downstream, ctx, edges, workflowNodes, allOutputs)
                );
            }
        });

        // 如果没有任何下游执行，返回源 AST
        if (downstreamExecutions.length === 0) {
            return of(sourceAst);
        }

        // 并发执行所有下游节点
        return merge(...downstreamExecutions);
    }
}
