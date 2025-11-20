import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, IAstStates, EdgeMode, hasCondition, hasDataMapping } from '../types';
import { DataFlowManager } from './data-flow-manager';
import { executeAst } from '../executor';
import { Observable, of, EMPTY, merge, combineLatest, zip, asyncScheduler } from 'rxjs';
import { map, catchError, takeWhile, concatMap, filter, withLatestFrom, shareReplay, subscribeOn } from 'rxjs/operators';
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
     * 构建流网络 - 使用拓扑排序保证依赖顺序
     *
     * 优雅设计:
     * - 递归构建：先构建上游，再构建下游
     * - 去重保护：使用 Map 防止重复构建
     * - 循环检测：抛出明确错误而非死锁
     */
    private buildStreamNetwork(
        ast: WorkflowGraphAst,
        ctx: any
    ): Map<string, Observable<INode>> {
        const network = new Map<string, Observable<INode>>();
        const building = new Set<string>(); // 正在构建的节点（循环检测）

        /**
         * 递归构建单个节点流
         */
        const buildNode = (nodeId: string): Observable<INode> => {
            // 已构建：直接返回
            if (network.has(nodeId)) {
                return network.get(nodeId)!;
            }

            // 正在构建：检测到循环依赖
            if (building.has(nodeId)) {
                const cycle = Array.from(building).join(' → ') + ' → ' + nodeId;
                throw new Error(`检测到循环依赖: ${cycle}`);
            }

            building.add(nodeId);

            const node = ast.nodes.find(n => n.id === nodeId);
            if (!node) {
                throw new Error(`节点不存在: ${nodeId}`);
            }

            const incomingEdges = ast.edges.filter(e => e.to === nodeId);

            let stream$: Observable<INode>;

            if (incomingEdges.length === 0) {
                // 入口节点：直接执行
                stream$ = this.createEntryNodeStream(node, ctx);
            } else {
                // 先递归构建所有上游节点
                incomingEdges.forEach(edge => buildNode(edge.from));

                // 再构建当前节点
                stream$ = this.buildDependentStream(node, incomingEdges, network, ctx);
            }

            network.set(nodeId, stream$);
            building.delete(nodeId);

            return stream$;
        };

        // 为所有节点构建流
        ast.nodes.forEach(node => buildNode(node.id));

        return network;
    }

    /**
     * 创建入口节点流（无上游依赖）
     *
     * 优雅设计:
     * - 使用 shareReplay 缓存发射值（emitting + success）
     * - 多个下游订阅时共享执行结果
     * - bufferSize: 2 确保 emitting 和 success 都能被重播
     */
    private createEntryNodeStream(node: INode, ctx: any): Observable<INode> {
        return this.executeNode(node, ctx).pipe(
            subscribeOn(asyncScheduler),
            shareReplay({ bufferSize: 2, refCount: true })
        );
    }

    /**
     * 构建依赖上游的节点流
     *
     * 核心逻辑：
     * 1. 收集上游流
     * 2. 区分数据边和控制边，应用不同的操作符
     * 3. 根据边的 mode 组合上游流（zip/combineLatest/withLatestFrom/merge）
     * 4. 每次上游发射 → 创建新节点实例执行
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

            // 统一边处理：条件检查 + 数据映射
            return sourceStream.pipe(
                // 【流式输出】只有 emitting 状态触发下游，success 不触发
                filter(ast => ast.state === 'emitting'),
                // 如果有条件，检查条件
                filter(ast => {
                    if (!edge.condition) return true;
                    const value = (ast as any)[edge.condition.property];
                    return value === edge.condition.value;
                }),
                // 如果有数据映射，应用数据操作符；否则传递空对象
                hasDataMapping(edge)
                    ? this.dataFlowManager.createEdgeOperator(edge)
                    : map(() => ({})),
                map(value => ({ edge, value }))
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
            shareReplay({ bufferSize: 2, refCount: true })  // 缓存 emitting + success
        );
    }

    /**
     * 根据边模式组合上游流
     *
     * 优雅设计:
     * - MERGE: 任一上游发射立即触发（并发场景）
     * - ZIP: 配对执行，按索引一一对应
     * - COMBINE_LATEST: 任一变化触发，使用所有最新值
     * - WITH_LATEST_FROM: 主流触发，携带其他流的最新值
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
            const stream = streams[0];
            if (!stream) {
                return EMPTY;
            }
            return stream.pipe(
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
                // MERGE：任一上游发射立即触发（真正的 merge 语义）
                return this.combineByMerge(streams);

            default:
                // 默认：等待所有上游至少发射一次
                return this.combineByCombineLatest(streams);
        }
    }

    /**
     * 检测边模式（优先级：ZIP > WITH_LATEST_FROM > COMBINE_LATEST > MERGE）
     */
    private detectEdgeMode(edges: IEdge[]): EdgeMode {
        // 检查是否有明确的 mode 配置
        for (const edge of edges) {
            if (edge.mode) {
                return edge.mode;
            }
        }

        // 默认 COMBINE_LATEST（等待所有上游就绪）
        return EdgeMode.COMBINE_LATEST;
    }

    /**
     * MERGE 模式：任一上游发射立即触发
     *
     * 优雅设计:
     * - 真正的 RxJS merge 语义：不等待其他上游
     * - 适合并发场景：多个数据源独立触发
     * - 单个输入：直接传递值
     */
    private combineByMerge(
        streams: Observable<{ edge: IEdge; value: any }>[]
    ): Observable<any> {
        return merge(...streams).pipe(
            map(({ edge, value }) => {
                // 单个输入时，根据边配置决定数据结构
                if (edge.toProperty) {
                    return { [edge.toProperty]: value };
                }
                return value;
            })
        );
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
     * COMBINE_LATEST 模式：任一变化触发，使用所有最新值
     */
    private combineByCombineLatest(
        streams: Observable<{ edge: IEdge; value: any }>[]
    ): Observable<any> {
        return combineLatest(streams).pipe(
            map(edgeValues => this.mergeEdgeValues(edgeValues))
        );
    }

    /**
     * WITH_LATEST_FROM 模式：主流触发，携带其他流的最新值
     */
    private combineByWithLatestFrom(
        streams: Observable<{ edge: IEdge; value: any }>[],
        edges: IEdge[]
    ): Observable<any> {
        // 找到主流（isPrimary: true）
        const primaryIndex = edges.findIndex(e => e.isPrimary);
        if (primaryIndex === -1) {
            // 没有主流标记，回退到 combineLatest
            return this.combineByCombineLatest(streams);
        }

        const primaryStream = streams[primaryIndex];
        if (!primaryStream) {
            // 主流不存在，回退到 combineLatest
            return this.combineByCombineLatest(streams);
        }

        const otherStreams = streams.filter((_, i) => i !== primaryIndex);

        if (otherStreams.length === 0) {
            // 只有主流，直接返回
            return primaryStream.pipe(
                map(({ value }) => value)
            );
        }

        return primaryStream.pipe(
            withLatestFrom(...otherStreams),
            map(([primary, ...others]) => this.mergeEdgeValues([primary, ...others]))
        );
    }

    /**
     * 合并边值数据
     *
     * 优雅设计:
     * - 有 toProperty：使用指定的属性名
     * - 无 toProperty 且值是对象：直接合并（展开）
     * - 其他情况：使用 fromProperty 或默认 key
     */
    private mergeEdgeValues(edgeValues: { edge: IEdge; value: any }[]): any {
        const merged: any = {};

        edgeValues.forEach(({ edge, value }) => {
            if (edge.toProperty) {
                // 有 toProperty：使用指定的属性名
                merged[edge.toProperty] = value;
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // 无 toProperty 且值是对象：直接合并
                Object.assign(merged, value);
            } else {
                // 其他情况：使用 fromProperty 作为 key（如果有）
                const key = edge.fromProperty ? edge.fromProperty : 'value';
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
     * 深度克隆节点 - 支持多次执行的隔离性
     *
     * 优雅设计:
     * - 使用 structuredClone 确保完全隔离
     * - 保留原始 ID（用于工作流图更新）
     * - 重置执行状态
     * - 兼容旧环境（回退到 JSON 序列化）
     */
    private cloneNode(node: INode): INode {
        try {
            // 优先使用 structuredClone（现代浏览器/Node.js 17+）
            if (typeof structuredClone !== 'undefined') {
                const cloned = structuredClone(node);
                cloned.state = 'pending';
                cloned.error = undefined;
                return cloned;
            }
        } catch {
            // structuredClone 不可用或失败，回退到 JSON
        }

        // 回退方案：JSON 序列化（简单但有性能开销，且不支持 Date、Map、Set 等）
        const cloned = JSON.parse(JSON.stringify(node));
        cloned.state = 'pending';
        cloned.error = undefined;
        return cloned;
    }

    /**
     * 订阅所有节点流，合并状态变化
     *
     * 优雅设计:
     * - 使用 merge 合并所有节点流
     * - 每次节点状态变化，更新工作流图
     * - 自动判断完成状态
     * - 持续发射直到完成
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
                // 注意：emitting/running 状态视为未完成，工作流保持 running
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
                ast.setError(error);
                return of(ast);
            })
        );
    }
}
