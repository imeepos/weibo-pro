import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, EdgeMode, hasDataMapping } from '../types';
import { DataFlowManager } from './data-flow-manager';
import { executeAst } from '../executor';
import { Observable, of, EMPTY, merge, combineLatest, zip, asyncScheduler } from 'rxjs';
import { map, catchError, takeWhile, concatMap, filter, withLatestFrom, shareReplay, subscribeOn, switchMap, finalize } from 'rxjs/operators';
import { Injectable, root } from '@sker/core';
import { findNodeType, INPUT } from '../decorator';

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
     * 为节点创建输入流（核心方法 - 按数据完整性分组）
     *
     * 优雅设计:
     * - 入口节点：返回空对象流（立即发射）
     * - 依赖节点：找到所有能提供完整输入的源组合
     * - 每个完整组合独立触发执行
     * - 使用 MERGE 合并所有组合流 → 实现多次触发
     *
     * 示例：
     * - C需要{a,b}, A提供{a}, B提供{b}, D提供{a,b}
     * - 完整组合：[[A,B], [D]]
     * - 结果：merge(zip(A,B), D) → A+B配对3次 + D独立3次 = 6次
     */
    private _createNodeInputObservable(
        node: INode,
        incomingEdges: IEdge[],
        network: Map<string, Observable<INode>>,
        ctx: any
    ): Observable<any> {
        // 入口节点：返回空对象流（立即触发执行）
        if (incomingEdges.length === 0) {
            return of({});
        }

        // 1. 获取节点所需的输入属性
        const requiredProperties = this.getNodeInputProperties(node);

        // 2. 按源节点分组边
        const edgesBySource = new Map<string, IEdge[]>();
        incomingEdges.forEach(edge => {
            if (!edgesBySource.has(edge.from)) {
                edgesBySource.set(edge.from, []);
            }
            edgesBySource.get(edge.from)!.push(edge);
        });

        // 3. 找到所有能提供完整输入的源组合
        const completeCombinations = this.findCompleteSourceCombinations(
            requiredProperties,
            edgesBySource
        );

        // 4. 为每个完整组合创建流
        const combinationStreams = completeCombinations.map(sourceIds => {
            if (sourceIds.length === 1) {
                // 单源完整：直接创建流
                return this.createSingleSourceStream(
                    sourceIds[0]!,
                    edgesBySource.get(sourceIds[0]!)!,
                    network
                );
            } else {
                // 多源互补：根据边模式组合
                const groupedStreams = sourceIds.map(sourceId => {
                    return this.createSingleSourceStream(
                        sourceId,
                        edgesBySource.get(sourceId)!,
                        network
                    );
                });
                return this.combineGroupedStreamsByMode(groupedStreams, incomingEdges);
            }
        });

        // 5. 使用 MERGE 合并所有完整组合的流
        if (combinationStreams.length === 0) {
            return EMPTY;
        } else if (combinationStreams.length === 1) {
            return combinationStreams[0]!;
        } else {
            return merge(...combinationStreams);
        }
    }

    /**
     * 获取节点所需的输入属性
     */
    private getNodeInputProperties(node: INode): Set<string> {
        const properties = new Set<string>();

        try {
            const ctor = findNodeType(node.type);
            const inputs = root.get(INPUT, []).filter(it => it.target === ctor);

            inputs.forEach(input => {
                properties.add(String(input.propertyKey));
            });
        } catch {
            // 无装饰器元数据，返回空集合
        }

        return properties;
    }

    /**
     * 找到所有能提供完整输入的源组合
     *
     * 算法：
     * 1. 检查每个单源是否完整
     * 2. 检查所有非完整源的组合是否完整
     */
    private findCompleteSourceCombinations(
        requiredProperties: Set<string>,
        edgesBySource: Map<string, IEdge[]>
    ): string[][] {
        const combinations: string[][] = [];
        const incompleteSources: string[] = [];

        // 1. 检查每个单源是否完整
        for (const [sourceId, edges] of edgesBySource) {
            const providedProps = new Set(
                edges.map(e => e.toProperty).filter(Boolean) as string[]
            );

            if (this.isComplete(providedProps, requiredProperties)) {
                // 单源完整
                combinations.push([sourceId]);
            } else {
                incompleteSources.push(sourceId);
            }
        }

        // 2. 检查所有非完整源的组合
        if (incompleteSources.length > 0) {
            const allProps = new Set<string>();
            incompleteSources.forEach(sourceId => {
                edgesBySource.get(sourceId)!.forEach(edge => {
                    if (edge.toProperty) {
                        allProps.add(edge.toProperty);
                    }
                });
            });

            if (this.isComplete(allProps, requiredProperties)) {
                // 多源互补完整
                combinations.push(incompleteSources);
            }
        }

        return combinations;
    }

    /**
     * 检查提供的属性是否覆盖所有必需属性
     */
    private isComplete(provided: Set<string>, required: Set<string>): boolean {
        if (required.size === 0) return true; // 无输入要求

        for (const prop of required) {
            if (!provided.has(prop)) {
                return false;
            }
        }
        return true;
    }

    /**
     * 为单个源创建流（处理该源的所有边）
     */
    private createSingleSourceStream(
        sourceId: string,
        edges: IEdge[],
        network: Map<string, Observable<INode>>
    ): Observable<any> {
        const sourceStream = network.get(sourceId);
        if (!sourceStream) {
            throw new Error(`上游节点流未找到: ${sourceId}`);
        }

        return sourceStream.pipe(
            // 持续接收直到上游完成
            takeWhile(ast => ast.state !== 'success' && ast.state !== 'fail'),
            // 只响应 emitting 状态
            filter(ast => ast.state === 'emitting'),
            // 一次性处理该源的所有边
            map(ast => {
                const edgeValues = edges.map(edge => {
                    // 条件检查
                    if (edge.condition) {
                        const value = (ast as any)[edge.condition.property];
                        if (value !== edge.condition.value) {
                            return null;
                        }
                    }

                    // 数据提取
                    let value: any;
                    if (hasDataMapping(edge) && edge.fromProperty) {
                        value = this.resolveProperty(ast, edge.fromProperty);
                    } else {
                        value = {};
                    }

                    return { edge, value };
                }).filter(Boolean) as { edge: IEdge; value: any }[];

                return this.mergeEdgeValues(edgeValues);
            }),
            // 过滤掉空结果
            filter(result => Object.keys(result).length > 0)
        );
    }

    /**
     * 为节点创建执行流（使用 _createNodeInputObservable）
     */
    private _createNode(
        node: INode,
        incomingEdges: IEdge[],
        network: Map<string, Observable<INode>>,
        ctx: any
    ): Observable<INode> {
        const input$ = this._createNodeInputObservable(node, incomingEdges, network, ctx);

        return input$.pipe(
            // 每次输入变化 → 创建新节点实例执行
            concatMap(inputs => {
                const nodeInstance = this.cloneNode(node);
                Object.assign(nodeInstance, inputs);
                return this.executeNode(nodeInstance, ctx);
            }),
            catchError(error => {
                const failedNode = this.cloneNode(node);
                failedNode.state = 'fail';
                failedNode.error = error;
                return of(failedNode);
            }),
            shareReplay({ bufferSize: 2, refCount: true })
        );
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

            // 先递归构建所有上游节点
            incomingEdges.forEach(edge => buildNode(edge.from));

            // 使用新的 _createNode 方法构建节点流
            const stream$ = incomingEdges.length === 0
                ? this.createEntryNodeStream(node, ctx)
                : this._createNode(node, incomingEdges, network, ctx);

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
     * 根据边模式组合分组后的流（不同源节点）
     *
     * 优雅设计:
     * - 单源：直接返回
     * - 多源：根据边模式决定合并策略（ZIP/COMBINE_LATEST/MERGE 等）
     */
    private combineGroupedStreamsByMode(
        groupedStreams: Observable<any>[],
        edges: IEdge[]
    ): Observable<any> {
        if (groupedStreams.length === 0) {
            return EMPTY;
        }

        // 单源：直接返回
        if (groupedStreams.length === 1) {
            return groupedStreams[0]!;
        }

        // 多源：根据边模式决定合并策略
        const mode = this.detectEdgeMode(edges);

        switch (mode) {
            case EdgeMode.ZIP:
                // 配对执行：不同源按索引配对
                return zip(...groupedStreams).pipe(
                    map(groups => Object.assign({}, ...groups))
                );

            case EdgeMode.COMBINE_LATEST:
                // 任一变化触发：使用所有最新值
                return combineLatest(groupedStreams).pipe(
                    map(groups => Object.assign({}, ...groups))
                );

            case EdgeMode.WITH_LATEST_FROM:
                // 主流触发：携带其他流的最新值
                return this.combineGroupedByWithLatestFrom(groupedStreams, edges);

            case EdgeMode.MERGE:
                // MERGE：任一源发射立即触发
                return merge(...groupedStreams).pipe(
                    map(group => group)  // 单个组的数据直接传递
                );

            default:
                // 默认：等待所有源至少发射一次
                return combineLatest(groupedStreams).pipe(
                    map(groups => Object.assign({}, ...groups))
                );
        }
    }

    /**
     * WITH_LATEST_FROM 模式的分组流合并
     */
    private combineGroupedByWithLatestFrom(
        groupedStreams: Observable<any>[],
        edges: IEdge[]
    ): Observable<any> {
        // 找到主流（isPrimary: true）
        const sourceIds = Array.from(new Set(edges.map(e => e.from)));
        const primaryIndex = edges.findIndex(e => e.isPrimary);

        if (primaryIndex === -1) {
            // 没有主流标记，回退到 combineLatest
            return combineLatest(groupedStreams).pipe(
                map(groups => Object.assign({}, ...groups))
            );
        }

        const primarySourceId = edges[primaryIndex]!.from;
        const primaryStreamIndex = sourceIds.indexOf(primarySourceId);

        if (primaryStreamIndex === -1 || !groupedStreams[primaryStreamIndex]) {
            // 主流不存在，回退到 combineLatest
            return combineLatest(groupedStreams).pipe(
                map(groups => Object.assign({}, ...groups))
            );
        }

        const primaryStream = groupedStreams[primaryStreamIndex]!;
        const otherStreams = groupedStreams.filter((_, i) => i !== primaryStreamIndex);

        if (otherStreams.length === 0) {
            // 只有主流，直接返回
            return primaryStream;
        }

        return primaryStream.pipe(
            withLatestFrom(...otherStreams),
            map(([primary, ...others]) => Object.assign({}, primary, ...others))
        );
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
     * 合并边值数据
     *
     * 优雅设计:
     * - 有 toProperty：包装后赋值到目标属性
     * - 无 toProperty 且值是对象：直接合并（展开）
     * - 其他情况：使用 fromProperty 或默认 key
     *
     * 注意：当多条边指向同一 toProperty 时，后面的值会覆盖前面的值
     */
    private mergeEdgeValues(edgeValues: { edge: IEdge; value: any }[]): any {
        const merged: any = {};

        edgeValues.forEach(({ edge, value }) => {
            if (edge.toProperty) {
                // 有 toProperty：直接赋值（value 已由 createEdgeOperator 提取）
                // 注意：多条边指向同一属性时会覆盖
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
     * 辅助方法：解析嵌套属性路径
     */
    private resolveProperty(obj: any, path: string): any {
        if (!path.includes('.')) {
            return obj?.[path];
        }
        return path.split('.').reduce((current, key) => current?.[key], obj);
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
                // 保持 running 状态直到所有流完成
                ast.state = 'running';
                return ast;
            }),
            // 所有流完成后判定最终状态
            finalize(() => {
                const hasFailures = ast.nodes.some(n => n.state === 'fail');
                ast.state = hasFailures ? 'fail' : 'success';
            }),
            catchError(error => {
                ast.state = 'fail';
                ast.setError(error);
                return of(ast);
            })
        );
    }
}
