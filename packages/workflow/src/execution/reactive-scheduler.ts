import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, EdgeMode, hasDataMapping } from '../types';
import { DataFlowManager } from './data-flow-manager';
import { executeAst } from '../executor';
import { Observable, of, EMPTY, merge, combineLatest, zip, asyncScheduler, concat } from 'rxjs';
import { map, catchError, takeWhile, concatMap, filter, withLatestFrom, shareReplay, subscribeOn, finalize } from 'rxjs/operators';
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
    private resetWorkflowGraphAst(ast: WorkflowGraphAst) {
        ast.state = 'pending';
        ast.nodes = ast.nodes.map(node => {
            node.state = 'pending';
            node.count = 0;
            node.emitCount = 0;
            return node;
        })
        return ast;
    }
    schedule(ast: WorkflowGraphAst, ctx: WorkflowGraphAst): Observable<WorkflowGraphAst> {
        const { state } = this.resetWorkflowGraphAst(ast);
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
     * 节点微调执行 - 基于历史结果的增量执行（包含下游）
     *
     * 核心机制：
     * 1. 验证目标节点存在
     * 2. 识别受影响的节点（目标节点 + 下游）
     * 3. 验证所有未受影响的节点已执行完成（可作为历史结果）
     * 4. 重置受影响节点状态
     * 5. 未受影响节点直接使用历史结果（of(node)）
     * 6. 受影响节点重新构建流并执行
     *
     * @param ctx 工作流执行上下文（节点配置已在其中更新）
     * @param nodeId 目标节��ID
     */
    fineTuneNode(
        ctx: WorkflowGraphAst,
        nodeId: string
    ): Observable<WorkflowGraphAst> {
        // 1. 验证目标节点存在
        const targetNode = ctx.nodes.find(n => n.id === nodeId);
        if (!targetNode) {
            throw new Error(`节点不存在: ${nodeId}`);
        }

        // 2. 找到受影响的节点（目标节点 + 下游）
        const affectedNodes = this.findAffectedNodes(ctx, nodeId);

        // 3. 验证所有未受影响的节点已执行完成
        this.validateUnaffectedNodesCompletion(ctx, affectedNodes);

        // 4. 重置受影响节点状态
        ctx.nodes.forEach(node => {
            if (affectedNodes.has(node.id)) {
                node.state = 'pending';
                node.error = undefined;
            }
        });

        // 5. 构建增量执行网络
        const network = this.buildIncrementalNetwork(ctx, affectedNodes);

        // 6. 订阅并合并结果（只订阅受影响节点）
        ctx.state = 'running';
        return this.subscribeAndMerge(network, ctx, affectedNodes);
    }

    /**
     * 执行单个节点（不影响下游）
     *
     * 适用场景：
     * - 测试单个节点逻辑
     * - 调试节点配置
     * - 不希望触发下游节点重新执行
     *
     * 核心机制：
     * 1. 验证目标节点存在
     * 2. 验证所有上游节点已执行完成（使用历史输出作为输入）
     * 3. 只将目标节点标记为受影响（不递归查找下游）
     * 4. 复用增量执行网络逻辑
     * 5. 下游节点保持原有状态，不受影响
     *
     * @param ctx 工作流执行上下文
     * @param nodeId 目标节点ID
     */
    executeNodeIsolated(
        ctx: WorkflowGraphAst,
        nodeId: string
    ): Observable<WorkflowGraphAst> {
        // 1. 验证目标节点存在
        const targetNode = ctx.nodes.find(n => n.id === nodeId);
        if (!targetNode) {
            throw new Error(`节点不存在: ${nodeId}`);
        }

        // 2. 验证所有上游节点已执行完成
        this.validateUpstreamCompletion(ctx, nodeId);

        // 3. 只将目标节点作为受影响节点（不包含下游）
        const affectedNodes = new Set<string>([nodeId]);

        // 4. 验证所有未受影响的节点已执行完成
        this.validateUnaffectedNodesCompletion(ctx, affectedNodes);

        // 5. 重置目标节点状态
        targetNode.state = 'pending';
        targetNode.error = undefined;

        // 6. 构建增量执行网络（只执行目标节点）
        const network = this.buildIncrementalNetwork(ctx, affectedNodes);

        // 7. 订阅并合并结果（只订阅受影响节点）
        ctx.state = 'running';
        return this.subscribeAndMerge(network, ctx, affectedNodes);
    }

    /**
     * 验证上游节点是否已执行完成
     *
     * 用于单节点执行场景，确保可以使用上游的历史输出
     */
    private validateUpstreamCompletion(ctx: WorkflowGraphAst, nodeId: string): void {
        const visited = new Set<string>();

        const checkUpstream = (currentNodeId: string) => {
            if (visited.has(currentNodeId)) return;
            visited.add(currentNodeId);

            const upstreamEdges = ctx.edges.filter(edge => edge.to === currentNodeId);

            for (const edge of upstreamEdges) {
                const upstreamNode = ctx.nodes.find(n => n.id === edge.from);
                if (!upstreamNode) {
                    throw new Error(`上游节点不存在: ${edge.from}`);
                }

                if (upstreamNode.state !== 'success' && upstreamNode.state !== 'fail') {
                    throw new Error(
                        `上游节点 ${upstreamNode.id} 尚未执行完成（状态: ${upstreamNode.state}）。\n` +
                        `单节点执行需要使用上游的历史输出，请先执行完整工作流。`
                    );
                }

                checkUpstream(edge.from);
            }
        };

        checkUpstream(nodeId);
    }

    /**
     * 验证所有未受影响的节点已执行完成
     *
     * 策略：
     * - 受影响节点：无需验证（会重新执行）
     * - 未受影响节点：必须已完成（success/fail），否则抛出明确错误
     */
    private validateUnaffectedNodesCompletion(
        ctx: WorkflowGraphAst,
        affectedNodes: Set<string>
    ): void {
        const unfinishedNodes: string[] = [];

        for (const node of ctx.nodes) {
            // 跳过受影响节点（会重新执行）
            if (affectedNodes.has(node.id)) {
                continue;
            }

            // 检查未受影响节点是否已完成
            if (node.state !== 'success' && node.state !== 'fail') {
                unfinishedNodes.push(`${node.id} (${node.state})`);
            }
        }
    }

    /**
     * 查找受影响的节点（包括目标节点及其所有下游节点）
     */
    private findAffectedNodes(ast: WorkflowGraphAst, changedNodeId: string): Set<string> {
        const affected = new Set<string>();
        const visited = new Set<string>();

        const findDownstream = (nodeId: string) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);

            // 添加当前节点到受影响集合
            affected.add(nodeId);

            // 查找所有下游节点
            const downstreamEdges = ast.edges.filter(edge => edge.from === nodeId);
            for (const edge of downstreamEdges) {
                findDownstream(edge.to);
            }
        };

        findDownstream(changedNodeId);
        return affected;
    }

    /**
     * 构建增量执行网络 - 复用历史结果
     *
     * 策略：
     * - 受影响节点：重新构建流并执行
     * - 未受影响节点：直接使用历史结果（of(node)）
     * - 递归构建：确保上游依赖先于下游构建
     * - 循环检测：防止死锁
     */
    private buildIncrementalNetwork(
        ctx: WorkflowGraphAst,
        affectedNodes: Set<string>
    ): Map<string, Observable<INode>> {
        const network = new Map<string, Observable<INode>>();
        const building = new Set<string>();

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

            const node = ctx.nodes.find(n => n.id === nodeId);
            if (!node) {
                throw new Error(`节点不存在: ${nodeId}`);
            }

            let stream: Observable<INode>;

            if (affectedNodes.has(nodeId)) {
                // 受影响节点：重新构建并执行
                const incomingEdges = ctx.edges.filter(e => e.to === nodeId);

                // 先递归构建所有上游节点
                incomingEdges.forEach(edge => buildNode(edge.from));

                console.log(`[buildIncrementalNetwork] 构建受影响节点 ${nodeId}:`, {
                    hasIncomingEdges: incomingEdges.length > 0,
                    incomingEdgesCount: incomingEdges.length,
                    isEntryNode: incomingEdges.length === 0
                });

                stream = incomingEdges.length === 0
                    ? this.createEntryNodeStream(node, ctx)
                    : this._createNode(node, incomingEdges, network, ctx);
            } else {
                // 未受影响节点：发射 emitting 状态的历史结果副本，以便下游能接收数据
                if (node.state !== 'success' && node.state !== 'fail') {
                    // 这种情况理论上不会发生（已在 validateUnaffectedNodesCompletion 中检查）
                    throw new Error(
                        `内部错误：节点 ${nodeId} 状态为 ${node.state}，但未被标记为受影响节点。\n` +
                        `这可能是调度器的 bug，请联系开发者。`
                    );
                }
                // 创建 emitting 状态的副本以传递数据给下游，然后立即发射最终状态
                const emittingCopy = { ...node, state: 'emitting' as const };
                stream = of(emittingCopy, node).pipe(
                    shareReplay({ bufferSize: 2, refCount: true })
                );
            }

            network.set(nodeId, stream);
            building.delete(nodeId);

            return stream;
        };

        // 为所有节点构建流（但只有受影响节点会重新执行）
        ctx.nodes.forEach(node => buildNode(node.id));

        return network;
    }

    /**
     * 为节点创建输入流（核心方法 - 按数据完整性分组）
     *
     * 优雅设计:
     * - 入口节点：返回空对象流（立即发射）
     * - 依赖节点：找到所有能提供完整必填输入的源组合
     * - 每个完整组合独立触发执行
     * - 使用 MERGE 合并所有组合流 → 实现多次触发
     *
     * 变更：现在只检查必填且无默认值的属性，可选属性不影响执行
     *
     * 示例：
     * - C需要{a(必填), b(可选), c(默认值10)}，A提供{a}, B提供{b}
     * - 完整组合：[[A]] → 只需 A 即可执行，b 和 c 使用默认值
     * - 结果：A 发射 N 次 → C 执行 N 次
     */
    private _createNodeInputObservable(
        node: INode,
        incomingEdges: IEdge[],
        network: Map<string, Observable<INode>>,
        ctx: WorkflowGraphAst
    ): Observable<any> {
        // 入口节点：返回空对象流（立即触发执行）
        if (incomingEdges.length === 0) {
            return of({});
        }

        // 1. 获取节点必填的输入属性（无默认值）
        const requiredProperties = this.getRequiredInputProperties(node);

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
     * 获取节点所需的必填输入属性（无默认值）
     *
     * 逻辑：
     * 1. 如果装饰器明确指定 required: true 且无 defaultValue → 必填
     * 2. 如果装饰器明确指定 required: false → 非必填
     * 3. 如果装饰器提供了 defaultValue → 非必填
     * 4. 如果未指定 required，尝试从类实例读取默认值：
     *    - 有默认值 → 非必填
     *    - 无默认值（undefined）→ 必填
     */
    private getRequiredInputProperties(node: INode): Set<string> {
        const properties = new Set<string>();

        try {
            const ctor = findNodeType(node.type);
            if (!ctor) return properties;

            const inputs = root.get(INPUT, []).filter(it => it.target === ctor);

            // 尝试实例化以读取默认值
            let instance: any;
            try {
                instance = new ctor();
            } catch {
                // 实例化失败（可能需要构造参数），保守处理：所有输入都视为必填
                inputs.forEach(input => {
                    if (input.required !== false && input.defaultValue === undefined) {
                        properties.add(String(input.propertyKey));
                    }
                });
                return properties;
            }

            inputs.forEach(input => {
                const propKey = String(input.propertyKey);

                // 明确标记为非必填
                if (input.required === false) {
                    return;
                }

                // 装饰器提供了默认值
                if (input.defaultValue !== undefined) {
                    return;
                }

                // 明确标记为必填
                if (input.required === true) {
                    properties.add(propKey);
                    return;
                }

                // 未明确指定：检查类属性初始值
                const initialValue = instance[propKey];
                if (initialValue === undefined) {
                    // 无默认值 → 必填
                    properties.add(propKey);
                }
                // 有默认值 → 非必填（不添加到 properties）
            });
        } catch {
            // 无装饰器元数据，返回空集合
        }

        return properties;
    }

    /**
     * 获取节点输入属性的默认值
     *
     * 优先级：
     * 1. 装饰器的 defaultValue
     * 2. 类属性的初始值
     * 3. undefined
     */
    private getInputDefaultValues(node: INode): Record<string, any> {
        const defaults: Record<string, any> = {};

        try {
            const ctor = findNodeType(node.type);
            if (!ctor) return defaults;

            const inputs = root.get(INPUT, []).filter(it => it.target === ctor);

            // 尝试实例化以读取默认值
            let instance: any;
            try {
                instance = new ctor();
            } catch {
                // 实例化失败，只使用装饰器提供的默认值
                inputs.forEach(input => {
                    if (input.defaultValue !== undefined) {
                        defaults[String(input.propertyKey)] = input.defaultValue;
                    }
                });
                return defaults;
            }

            inputs.forEach(input => {
                const propKey = String(input.propertyKey);

                // 优先使用装饰器的 defaultValue
                if (input.defaultValue !== undefined) {
                    defaults[propKey] = input.defaultValue;
                } else {
                    // 尝试读取类属性的初始值
                    const initialValue = instance[propKey];
                    if (initialValue !== undefined) {
                        defaults[propKey] = initialValue;
                    }
                }
            });
        } catch {
            // 忽略错误
        }

        return defaults;
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

        // 🔧 修复：当无必填属性但有多个源时，强制多源组合（等待所有源发射）
        // 场景：LlmTextAgentAst { system: '', prompt: '' } 两个输入都有默认值
        // 期望：等待两个 TextArea 都发射后再执行（使用 combineLatest）
        // 错误：若不修复，会用 merge，导致每个源发射时单独触发（执行2次）
        if (requiredProperties.size === 0 && edgesBySource.size > 1) {
            const allSourceIds = Array.from(edgesBySource.keys());
            return [allSourceIds];
        }

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
            // 过滤掉空结果 - 但允许空字符串等有效值
            filter(result => result !== null && result !== undefined)
        );
    }

    /**
     * 为节点创建执行流（使用 _createNodeInputObservable）
     *
     * 变更：合并输入数据时，为缺失的属性填充默认值
     */
    private _createNode(
        node: INode,
        incomingEdges: IEdge[],
        network: Map<string, Observable<INode>>,
        ctx: any
    ): Observable<INode> {
        const input$ = this._createNodeInputObservable(node, incomingEdges, network, ctx);

        // 获取节点的默认值
        const defaults = this.getInputDefaultValues(node);

        return input$.pipe(
            // 每次输入变化 → 创建新节点实例执行
            concatMap(inputs => {
                const nodeInstance = this.cloneNode(node);

                // 先填充默认值，再应用连线数据（连线数据优先级更高）
                Object.assign(nodeInstance, defaults, inputs);

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
        ctx: WorkflowGraphAst
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
    private createEntryNodeStream(node: INode, ctx: WorkflowGraphAst): Observable<INode> {
        return this.executeNode(node, ctx).pipe(
            subscribeOn(asyncScheduler),
            shareReplay({ bufferSize: 2, refCount: false })
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
    private executeNode(node: INode, ctx: WorkflowGraphAst): Observable<INode> {
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
     * - 支持增量执行：只订阅受影响节点的流
     *
     * @param network 节点流网络
     * @param ast 工作流图
     * @param affectedNodes 可选：受影响的节点集合。如果提供，只订阅这些节点的流
     */
    private subscribeAndMerge(
        network: Map<string, Observable<INode>>,
        ast: WorkflowGraphAst,
        affectedNodes?: Set<string>
    ): Observable<WorkflowGraphAst> {
        // 筛选要订阅的流：全量执行时订阅所有流，增量执行时只订阅受影响节点
        const streamsToSubscribe = affectedNodes
            ? Array.from(network.entries())
                .filter(([nodeId]) => affectedNodes.has(nodeId))
                .map(([, stream]) => stream)
            : Array.from(network.values());

        console.log('[subscribeAndMerge] 订阅配置:', {
            totalNetworkSize: network.size,
            affectedNodesSize: affectedNodes?.size,
            streamsToSubscribeCount: streamsToSubscribe.length,
            affectedNodeIds: affectedNodes ? Array.from(affectedNodes) : 'all'
        });

        if (streamsToSubscribe.length === 0) {
            ast.state = 'success';
            return of(ast);
        }

        // 合并要订阅的节点流
        const allStreams$ = merge(...streamsToSubscribe).pipe(
            // 每次节点状态变化，更新工作流图
            map(updatedNode => {
                const nodeIndex = ast.nodes.findIndex(n => n.id === updatedNode.id);
                if (nodeIndex !== -1) {
                    const existingNode = ast.nodes[nodeIndex]!;

                    // 自动追踪执行次数和发射次数（Visitor 不再手动累加）
                    // count: 每次节点从 pending 状态变化时 +1（表示新的执行）
                    // emitCount: 每次状态变为 emitting 时 +1
                    let newCount = existingNode.count;
                    let newEmitCount = existingNode.emitCount;

                    const stateTransition = `${existingNode.state} → ${updatedNode.state}`;
                    // count: 只要从 pending 变化到其他状态，就算一次执行
                    const shouldIncrementCount = existingNode.state === 'pending' && updatedNode.state !== 'pending';
                    const shouldIncrementEmitCount = updatedNode.state === 'emitting';

                    if (shouldIncrementCount) {
                        newCount += 1;
                    }

                    if (shouldIncrementEmitCount) {
                        newEmitCount += 1;
                    }

                    console.log('[subscribeAndMerge] 节点状态更新:', {
                        nodeId: updatedNode.id,
                        stateTransition,
                        shouldIncrementCount,
                        shouldIncrementEmitCount,
                        oldCount: existingNode.count,
                        newCount,
                        oldEmitCount: existingNode.emitCount,
                        newEmitCount
                    });

                    ast.nodes[nodeIndex] = {
                        ...updatedNode,
                        count: newCount,
                        emitCount: newEmitCount
                    };
                }
                // 保持 running 状态直到所有流完成
                ast.state = 'running';
                return ast;
            }),
            catchError(error => {
                console.error('[subscribeAndMerge] 执行错误:', error);
                ast.state = 'fail';
                ast.setError(error);
                return of(ast);
            })
        );

        // 在流完成后发射最终状态（包含 finalize 的修改）
        return concat(
            allStreams$,
            new Observable<WorkflowGraphAst>(obs => {
                // finalize 已经修改了 ast.state，现在发射它
                const hasFailures = ast.nodes.some(n => n.state === 'fail');
                ast.state = hasFailures ? 'fail' : 'success';
                console.log('[subscribeAndMerge] 所有流完成，判定最终状态:', ast.state);
                obs.next(ast);
                obs.complete();
            })
        );
    }
}
