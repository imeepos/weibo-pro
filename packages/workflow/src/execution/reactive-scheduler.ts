import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, IAstStates, EdgeMode, isDataEdge, isControlEdge } from '../types';
import { DataFlowManager } from './data-flow-manager';
import { executeAst } from '../executor';
import { Observable, of, EMPTY, merge, combineLatest, zip } from 'rxjs';
import { map, catchError, takeWhile, concatMap, mergeMap, withLatestFrom, shareReplay } from 'rxjs/operators';
import { Injectable, root } from '@sker/core';

/**
 * 响应式工作流调度器 - 基于 RxJS Observable 流式调度
 *
 * 核心设计理念（受 NgRx Effects 启发）：
 * - 节点即流源：每个节点是 Observable<INode> 流，而非状态机
 * - 边即操作符：边定义数据如何从上游流向下游（map/filter/zip/combineLatest）
 * - 自动响应：上游发射 N 次 → 下游自动执行 N 次（无需轮询）
 * - 声明式组合：通过边的 mode 属性配置流式合并策略
 *
 * 与传统状态机调度器的区别：
 * - 不需要 findExecutableNodes()：流订阅自动触发
 * - 不需要 astInstances 状态管理：每次执行创建新实例
 * - 不需要手动 assignInputsToNode：边操作符自动传递数据
 */
@Injectable()
export class ReactiveScheduler {
    private dataFlowManager: DataFlowManager;

    constructor() {
        this.dataFlowManager = root.get(DataFlowManager);
    }

    /**
     * 调度工作流：将工作流图转换为响应式流网络
     */
    schedule(ast: WorkflowGraphAst, ctx: any): Observable<WorkflowGraphAst> {
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

        // 构建节点流网络
        const network = this.buildStreamNetwork(ast, ctx);

        // 订阅所有节点流，合并状态变化
        return this.subscribeAndMerge(network, ast);
    }

    /**
     * 为每个节点构建 Observable 流
     */
    private buildStreamNetwork(
        ast: WorkflowGraphAst,
        ctx: any
    ): Map<string, Observable<INode>> {
        const network = new Map<string, Observable<INode>>();

        // 第一步：为入口节点创建流
        ast.nodes.forEach(node => {
            const incomingEdges = ast.edges.filter(e => e.to === node.id);

            if (incomingEdges.length === 0) {
                // 入口节点：直接执行
                network.set(node.id, this.createEntryNodeStream(node, ctx));
            }
        });

        // 第二步：为下游节点创建流（依赖上游）
        ast.nodes.forEach(node => {
            const incomingEdges = ast.edges.filter(e => e.to === node.id);

            if (incomingEdges.length > 0 && !network.has(node.id)) {
                network.set(node.id, this.buildDependentStream(
                    node,
                    incomingEdges,
                    network,
                    ctx
                ));
            }
        });

        return network;
    }

    /**
     * 创建入口节点流（无上游依赖）
     */
    private createEntryNodeStream(node: INode, ctx: any): Observable<INode> {
        return this.executeNode(node, ctx).pipe(
            shareReplay(1) // 多个下游订阅时，共享执行结果
        );
    }

    /**
     * 构建依赖上游的节点流
     *
     * 核心逻辑：
     * 1. 收集上游流
     * 2. 根据边的 mode 组合上游流（zip/combineLatest/withLatestFrom）
     * 3. 每次上游发射 → 创建新节点实例执行
     */
    private buildDependentStream(
        node: INode,
        incomingEdges: IEdge[],
        network: Map<string, Observable<INode>>,
        ctx: any
    ): Observable<INode> {
        // 收集上游流并应用边操作符
        const upstreamStreams = incomingEdges.map(edge => {
            const sourceStream = network.get(edge.from);
            if (!sourceStream) {
                throw new Error(`上游节点流未找到: ${edge.from} → ${node.id}`);
            }

            // 应用边操作符（fromProperty/condition/toProperty）
            return sourceStream.pipe(
                this.dataFlowManager.createEdgeOperator(edge),
                map(value => ({ edge, value })) // 携带边信息
            );
        });

        // 根据边模式组合上游流
        const combined$ = this.combineUpstreamByMode(upstreamStreams, incomingEdges);

        // 上游每次发射 → 触发节点执行
        return combined$.pipe(
            concatMap(inputs => {
                // 创建节点副本（支持多次执行）
                const nodeInstance = this.cloneNode(node);

                // 合并输入数据
                Object.assign(nodeInstance, inputs);

                // 执行节点
                return this.executeNode(nodeInstance, ctx);
            }),
            catchError(error => {
                // 错误隔离：单个节点失败不影响其他节点
                const failedNode = this.cloneNode(node);
                failedNode.state = 'fail';
                failedNode.error = error;
                return of(failedNode);
            }),
            shareReplay(1) // 多个下游订阅时，共享执行结果
        );
    }

    /**
     * 根据边模式组合上游流
     */
    private combineUpstreamByMode(
        streams: Observable<{ edge: IEdge; value: any }>[],
        edges: IEdge[]
    ): Observable<any> {
        if (streams.length === 0) {
            return EMPTY;
        }

        // 单输入：直接返回
        if (streams.length === 1) {
            return streams[0].pipe(
                map(({ value }) => value)
            );
        }

        // 多输入：根据边模式决定合并策略
        const mode = this.detectEdgeMode(edges);

        switch (mode) {
            case EdgeMode.ZIP:
                // 配对执行：上游数组按索引配对
                return this.combineByZip(streams);

            case EdgeMode.COMBINE_LATEST:
                // 任一变化触发：使用所有最新值
                return this.combineByCombineLatest(streams);

            case EdgeMode.WITH_LATEST_FROM:
                // 主流触发：携带其他流的最新值
                return this.combineByWithLatestFrom(streams, edges);

            case EdgeMode.MERGE:
            default:
                // 默认：等待所有上游至少发射一次（使用 combineLatest）
                return this.combineByCombineLatest(streams);
        }
    }

    /**
     * 检测边模式（优先级：ZIP > WITH_LATEST_FROM > COMBINE_LATEST > MERGE）
     */
    private detectEdgeMode(edges: IEdge[]): EdgeMode {
        const dataEdges = edges.filter(isDataEdge);

        // 检查是否有明确的 mode 配置
        for (const edge of dataEdges) {
            if (edge.mode) {
                return edge.mode;
            }
        }

        // 默认 MERGE
        return EdgeMode.MERGE;
    }

    /**
     * ZIP 模式：配对执行
     *
     * 场景：mid [1,2,3] + uid [4,5,6] → 3次 {mid:1, uid:4}, {mid:2, uid:5}, {mid:3, uid:6}
     */
    private combineByZip(
        streams: Observable<{ edge: IEdge; value: any }>[]
    ): Observable<any> {
        return zip(...streams).pipe(
            map(edgeValues => this.mergeEdgeValues(edgeValues))
        );
    }

    /**
     * COMBINE_LATEST 模式：任一变化触发
     */
    private combineByCombineLatest(
        streams: Observable<{ edge: IEdge; value: any }>[]
    ): Observable<any> {
        return combineLatest(streams).pipe(
            map(edgeValues => this.mergeEdgeValues(edgeValues))
        );
    }

    /**
     * WITH_LATEST_FROM 模式：主流触发
     */
    private combineByWithLatestFrom(
        streams: Observable<{ edge: IEdge; value: any }>[],
        edges: IEdge[]
    ): Observable<any> {
        // 找到主流（isPrimary: true）
        const primaryIndex = edges.findIndex(e => isDataEdge(e) && e.isPrimary);
        if (primaryIndex === -1) {
            // 没有主流标记，回退到 combineLatest
            return this.combineByCombineLatest(streams);
        }

        const primaryStream = streams[primaryIndex];
        const otherStreams = streams.filter((_, i) => i !== primaryIndex);

        return primaryStream.pipe(
            withLatestFrom(...otherStreams),
            map(([primary, ...others]) => this.mergeEdgeValues([primary, ...others]))
        );
    }

    /**
     * 合并边值数据
     */
    private mergeEdgeValues(edgeValues: { edge: IEdge; value: any }[]): any {
        const merged: any = {};

        edgeValues.forEach(({ edge, value }) => {
            if (isDataEdge(edge) && edge.toProperty) {
                // 有 toProperty：使用指定的属性名
                merged[edge.toProperty] = value;
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // 无 toProperty 且值是对象：直接合并
                Object.assign(merged, value);
            } else {
                // 其他情况：使用 fromProperty 作为 key（如果有）
                const key = isDataEdge(edge) && edge.fromProperty ? edge.fromProperty : 'value';
                merged[key] = value;
            }
        });

        return merged;
    }

    /**
     * 执行单个节点（复用现有 executeAst）
     */
    private executeNode(node: INode, ctx: any): Observable<INode> {
        return executeAst(node, ctx).pipe(
            catchError(error => {
                node.state = 'fail';
                node.error = error;
                return of(node);
            })
        );
    }

    /**
     * 克隆节点（支持多次执行）
     */
    private cloneNode(node: INode): INode {
        return {
            ...node,
            id: node.id, // 保持原 ID（用于工作流图更新）
            state: 'pending' as IAstStates,
            error: undefined
        };
    }

    /**
     * 订阅所有节点流，合并状态变化
     */
    private subscribeAndMerge(
        network: Map<string, Observable<INode>>,
        ast: WorkflowGraphAst
    ): Observable<WorkflowGraphAst> {
        const allStreams = Array.from(network.values());

        if (allStreams.length === 0) {
            ast.state = 'success';
            return of(ast);
        }

        // 合并所有节点流
        return merge(...allStreams).pipe(
            // 每次节点状态变化，更新工作流图
            map(updatedNode => {
                const nodeIndex = ast.nodes.findIndex(n => n.id === updatedNode.id);
                if (nodeIndex !== -1) {
                    ast.nodes[nodeIndex] = updatedNode;
                }

                // 判断完成状态
                const allCompleted = ast.nodes.every(n =>
                    n.state === 'success' || n.state === 'fail'
                );
                const hasFailures = ast.nodes.some(n => n.state === 'fail');

                ast.state = allCompleted
                    ? (hasFailures ? 'fail' : 'success')
                    : 'running';

                return ast;
            }),
            // 持续发射直到完成
            takeWhile(graph => graph.state === 'running', true),
            catchError(error => {
                ast.state = 'fail';
                ast.error = error;
                return of(ast);
            })
        );
    }
}
