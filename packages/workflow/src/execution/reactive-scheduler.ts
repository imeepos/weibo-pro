import { setAstError, WorkflowGraphAst } from '../ast';
import { INode, IEdge, EdgeMode, hasDataMapping } from '../types';
import { executeAst } from '../executor';
import { Observable, of, EMPTY, merge, combineLatest, zip, asyncScheduler, concat } from 'rxjs';
import { map, catchError, takeWhile, concatMap, filter, withLatestFrom, shareReplay, subscribeOn, finalize, scan, takeLast, toArray, reduce, expand, tap, take } from 'rxjs/operators';
import { Injectable, root } from '@sker/core';
import { findNodeType, INPUT, InputMetadata, hasMultiMode, hasBufferMode, OUTPUT, type OutputMetadata, resolveConstructor } from '../decorator';

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

        // 3. 检测首次执行场景：如果有未受影响的节点从未执行过（状态为 pending）
        //    则回退到完整工作流执行，避免增量执行逻辑的假设冲突
        const hasUnexecutedNodes = ctx.nodes.some(node =>
            !affectedNodes.has(node.id) && node.state === 'pending'
        );

        if (hasUnexecutedNodes) {
            console.log('[fineTuneNode] 检测到首次执行场景，回退到完整工作流执行');
            return this.schedule(ctx, ctx);
        }

        // 4. 验证所有未受影响的节点已执行完成
        this.validateUnaffectedNodesCompletion(ctx, affectedNodes);

        // 5. 重置受影响节点状态
        ctx.nodes.forEach(node => {
            if (affectedNodes.has(node.id)) {
                node.state = 'pending';
                node.error = undefined;
            }
        });

        // 6. 构建增量执行网络
        const network = this.buildIncrementalNetwork(ctx, affectedNodes);

        // 7. 订阅并合并结果（只订阅受影响节点）
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
     * 构建增量执行网络 - 复用历史结果，支持循环
     *
     * 策略：
     * - 受影响节点：重新构建流并执行
     * - 未受影响节点：直接使用历史结果（of(node)）
     * - 递归构建：确保上游依赖先于下游构建
     * - 循环支持：回路边不参与常规拓扑排序，循环入口节点使用特殊流
     * - 循环检测：区分合法的回路边和非法的未标记循环依赖
     */
    private buildIncrementalNetwork(
        ctx: WorkflowGraphAst,
        affectedNodes: Set<string>
    ): Map<string, Observable<INode>> {
        const network = new Map<string, Observable<INode>>();
        const building = new Set<string>();

        // 检测循环结构
        const { loops, loopEntries } = this.detectLoops(ctx);

        // 为每个循环入口节点找到对应的回路边
        const loopBackEdgeMap = new Map<string, IEdge>();
        loops.forEach(loopEdge => {
            loopBackEdgeMap.set(loopEdge.to, loopEdge);
        });

        const buildNode = (nodeId: string): Observable<INode> => {
            // 已构建：直接返回
            if (network.has(nodeId)) {
                return network.get(nodeId)!;
            }

            // 正在构建：检测到非法循环依赖（未使用 isLoopBack 标记）
            if (building.has(nodeId)) {
                const cyclePath = Array.from(building).concat(nodeId);
                const cycleDisplay = cyclePath.join(' → ');

                // 找到回路边：从最后一个节点指向第一次出现的节点
                const loopStartIndex = cyclePath.indexOf(nodeId);
                const loopBackFrom = cyclePath[cyclePath.length - 2];
                const loopBackTo = nodeId;

                // 查找这条边
                const loopBackEdge = ctx.edges.find(
                    e => e.from === loopBackFrom && e.to === loopBackTo
                );

                const edgeInfo = loopBackEdge
                    ? `\n\n需要标记的边：\n  ID: ${loopBackEdge.id}\n  从节点: ${loopBackFrom}\n  到节点: ${loopBackTo}\n\n修复方法：在此边上添加属性 isLoopBack: true`
                    : '';

                throw new Error(
                    `检测到未标记的循环依赖:\n${cycleDisplay}${edgeInfo}\n\n` +
                    `循环功能需要显式标记回路边，请设置：\n` +
                    `{\n` +
                    `  isLoopBack: true,\n` +
                    `  maxLoopIterations: 100,  // 可选：最大循环次数\n` +
                    `  loopConditionProperty: 'shouldContinue'  // 可选：停止条件属性\n` +
                    `}`
                );
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

                // 先递归构建所有上游节点（排除回路边）
                incomingEdges
                    .filter(edge => !edge.isLoopBack)
                    .forEach(edge => buildNode(edge.from));

                console.log(`[buildIncrementalNetwork] 构建受影响节点 ${nodeId}:`, {
                    hasIncomingEdges: incomingEdges.length > 0,
                    incomingEdgesCount: incomingEdges.length,
                    isEntryNode: incomingEdges.length === 0,
                    isLoopEntry: loopEntries.has(nodeId)
                });

                // 检查是否是循环入口节点
                if (loopEntries.has(nodeId)) {
                    const loopBackEdge = loopBackEdgeMap.get(nodeId)!;
                    stream = this.createLoopNodeStream(node, incomingEdges, loopBackEdge, network, ctx);
                } else if (incomingEdges.length === 0) {
                    stream = this.createEntryNodeStream(node, ctx);
                } else {
                    stream = this._createNode(node, incomingEdges, network, ctx);
                }
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

        // 调试日志：打印边模式信息
        const edgeMode = this.detectEdgeMode(incomingEdges);
        if (edgeMode === 'withLatestFrom') {
            const primaryEdge = incomingEdges.find(e => e.isPrimary);
            console.log('[_createNodeInputObservable] withLatestFrom 模式:', {
                nodeId: node.id,
                nodeType: node.type,
                primarySourceId: primaryEdge?.from,
                allSourceIds: Array.from(edgesBySource.keys()),
                edgesCount: incomingEdges.length
            });
        }

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
                    network,
                    node
                );
            } else {
                // 多源互补：根据边模式组合
                const groupedStreams = sourceIds.map(sourceId => {
                    return this.createSingleSourceStream(
                        sourceId,
                        edgesBySource.get(sourceId)!,
                        network,
                        node
                    );
                });
                // 【路由节点支持】如果所有源流都被路由过滤，groupedStreams 可能为空
                if (groupedStreams.length === 0) {
                    return EMPTY;
                }
                // 传递 sourceIds 确保流顺序一致性（修复 withLatestFrom 索引错位）
                return this.combineGroupedStreamsByMode(groupedStreams, incomingEdges, node, sourceIds);
            }
        });

        // 5. 使用 MERGE 合并所有完整组合的流
        // 【路由节点支持】无有效输入组合，节点不需要执行
        if (combinationStreams.length === 0) {
            console.log(`[_createNodeInputObservable] 节点 ${node.id} 无有效输入，跳过执行`);
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
     * 获取节点输入属性的元数据映射
     *
     * 用于检查 isMulti 等属性配置
     */
    private getInputMetadataMap(node: INode): Map<string | symbol, InputMetadata> {
        const metadataMap = new Map<string | symbol, InputMetadata>();

        try {
            const ctor = findNodeType(node.type);
            if (!ctor) return metadataMap;

            const inputs = root.get(INPUT, []).filter(it => it.target === ctor);
            inputs.forEach(input => {
                metadataMap.set(input.propertyKey, input);
            });
        } catch {
            // 无装饰器元数据，返回空映射
        }

        return metadataMap;
    }

    /**
     * 将输入数据赋值到节点实例（元数据感知）
     *
     * 优雅设计：
     * - IS_BUFFER：value 已在流层面累积成数组，直接赋值
     * - IS_MULTI（无 IS_BUFFER）：累加到数组
     * - IS_MULTI | IS_BUFFER：value 已是所有边所有发射的数组，直接赋值
     * - 普通输入：直接赋值
     */
    private assignInputsToNodeInstance(
        nodeInstance: INode,
        inputs: Record<string, any>
    ): void {
        const metadataMap = this.getInputMetadataMap(nodeInstance);

        Object.entries(inputs).forEach(([key, value]) => {
            const metadata = metadataMap.get(key);
            const isBuffer = hasBufferMode(metadata?.mode);
            const isMulti = hasMultiMode(metadata?.mode) || metadata?.isMulti;

            if (isBuffer) {
                // IS_BUFFER 模式：value 已在流层面累积成数组，直接赋值
                (nodeInstance as any)[key] = value;
            } else if (isMulti) {
                // IS_MULTI 模式（无 IS_BUFFER）：累加到数组
                if (!Array.isArray((nodeInstance as any)[key])) {
                    (nodeInstance as any)[key] = [];
                }
                // 如果 value 已经是数组，展开后累加（处理多源情况）
                if (Array.isArray(value)) {
                    (nodeInstance as any)[key].push(...value);
                } else {
                    (nodeInstance as any)[key].push(value);
                }
            } else {
                // 单值模式：直接赋值
                (nodeInstance as any)[key] = value;
            }
        });
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
     *
     * 支持 IS_BUFFER 模式：收集单边的所有发射，直到上游完成
     */
    private createSingleSourceStream(
        sourceId: string,
        edges: IEdge[],
        network: Map<string, Observable<INode>>,
        targetNode: INode
    ): Observable<any> {
        const sourceStream = network.get(sourceId);
        if (!sourceStream) {
            throw new Error(`上游节点流未找到: ${sourceId}`);
        }

        // 检查是否有任何边的目标属性使用 IS_BUFFER 模式
        const inputMetadataMap = this.getInputMetadataMap(targetNode);
        const hasAnyBufferMode = edges.some(edge => {
            if (!edge.toProperty) return false;
            const metadata = inputMetadataMap.get(edge.toProperty);
            return hasBufferMode(metadata?.mode);
        });

        const dataStream = sourceStream.pipe(
            // 只响应 emitting 状态（不使用 takeWhile，让流自然完成）
            // 在 MERGE 模式下，节点可以多次执行，每次都会发射 emitting 和 success
            // takeWhile 会在第一个 success 后终止流，导致后续发射丢失
            filter(ast => ast.state === 'emitting'),
            // 一次性处理该源的所有边
            map(ast => {
                const edgeValues = edges.map(edge => {
                    // 【路由节点支持】检查 isRouter 输出是否为 undefined
                    if (edge.fromProperty) {
                        const sourceOutputMeta = this.getOutputMetadata(ast, edge.fromProperty)
                        if (sourceOutputMeta?.isRouter) {
                            const value = (ast as any)[edge.fromProperty]
                            // 路由输出为 undefined 时，过滤掉此边
                            if (value === undefined) {
                                return null
                            }
                        }
                    }

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

                return this.mergeEdgeValues(edgeValues, targetNode);
            }),
            // 过滤掉空结果 - 但允许空字符串等有效值
            filter(result => result !== null && result !== undefined)
        );

        // IS_BUFFER 模式：收集所有发射，只在流完成时发射一次
        if (hasAnyBufferMode) {
            return dataStream.pipe(
                // 使用 reduce 累积所有发射
                reduce((acc: any, curr: any) => {
                    // 检查每个属性是否需要 buffer
                    Object.entries(curr).forEach(([key, value]) => {
                        const metadata = inputMetadataMap.get(key);
                        if (hasBufferMode(metadata?.mode)) {
                            // IS_BUFFER：累积到数组
                            if (!acc[key]) {
                                acc[key] = [];
                            }
                            acc[key].push(value);
                        } else {
                            // 非 IS_BUFFER：保留最新值
                            acc[key] = value;
                        }
                    });
                    return acc;
                }, {})
            );
        }

        // 非 IS_BUFFER 模式：保持原有行为（每次发射立即传递）
        return dataStream;
    }

    /**
     * 为节点创建执行流（使用 _createNodeInputObservable）
     *
     * 变更：使用元数据感知的赋值逻辑，支持 @Input({ isMulti: true })
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

                // 先填充默认值（直接赋值）
                Object.assign(nodeInstance, defaults);

                // 再应用连线数据（使用元数据感知的赋值逻辑）
                this.assignInputsToNodeInstance(nodeInstance, inputs);

                return this.executeNode(nodeInstance, ctx);
            }),
            catchError(error => {
                const failedNode = this.cloneNode(node);
                failedNode.state = 'fail';
                failedNode.error = error;
                return of(failedNode);
            }),
            // refCount: false 确保流持续存在，支持 MERGE 模式的多次触发
            // 即使下游节点暂时取消订阅，流仍然保持活跃，等待新的订阅者
            shareReplay({ bufferSize: 2, refCount: false })
        );
    }
    /**
     * 构建流网络 - 使用拓扑排序保证依赖顺序，支持循环
     *
     * 优雅设计:
     * - 递归构建：先构建上游，再构建下游
     * - 去重保护：使用 Map 防止重复构建
     * - 循环支持：回路边不参与常规拓扑排序，循环入口节点使用特殊流
     * - 循环检测：区分合法的回路边和非法的未标记循环依赖
     */
    private buildStreamNetwork(
        ast: WorkflowGraphAst,
        ctx: WorkflowGraphAst
    ): Map<string, Observable<INode>> {
        const network = new Map<string, Observable<INode>>();
        const building = new Set<string>(); // 正在构建的节点（非法循环检测）

        // 检测循环结构
        const { loops, loopEntries } = this.detectLoops(ast);

        // 为每个循环入口节点找到对应的回路边
        const loopBackEdgeMap = new Map<string, IEdge>();
        loops.forEach(loopEdge => {
            loopBackEdgeMap.set(loopEdge.to, loopEdge);
        });

        /**
         * 递归构建单个节点流
         */
        const buildNode = (nodeId: string): Observable<INode> => {
            // 已构建：直接返回
            if (network.has(nodeId)) {
                return network.get(nodeId)!;
            }

            // 正在构建：检测到非法循环依赖（未使用 isLoopBack 标记）
            if (building.has(nodeId)) {
                const cyclePath = Array.from(building).concat(nodeId);
                const cycleDisplay = cyclePath.join(' → ');

                // 找到回路边：从最后一个节点指向第一次出现的节点
                const loopStartIndex = cyclePath.indexOf(nodeId);
                const loopBackFrom = cyclePath[cyclePath.length - 2];
                const loopBackTo = nodeId;

                // 查找这条边
                const loopBackEdge = ast.edges.find(
                    e => e.from === loopBackFrom && e.to === loopBackTo
                );

                const edgeInfo = loopBackEdge
                    ? `\n\n需要标记的边：\n  ID: ${loopBackEdge.id}\n  从节点: ${loopBackFrom}\n  到节点: ${loopBackTo}\n\n修复方法：在此边上添加属性 isLoopBack: true`
                    : '';

                throw new Error(
                    `检测到未标记的循环依赖:\n${cycleDisplay}${edgeInfo}\n\n` +
                    `循环功能需要显式标记回路边，请设置：\n` +
                    `{\n` +
                    `  isLoopBack: true,\n` +
                    `  maxLoopIterations: 100,  // 可选：最大循环次数\n` +
                    `  loopConditionProperty: 'shouldContinue'  // 可选：停止条件属性\n` +
                    `}`
                );
            }

            building.add(nodeId);

            const node = ast.nodes.find(n => n.id === nodeId);
            if (!node) {
                throw new Error(`节点不存在: ${nodeId}`);
            }

            const incomingEdges = ast.edges.filter(e => e.to === nodeId);

            // 先递归构建所有上游节点（排除回路边）
            incomingEdges
                .filter(edge => !edge.isLoopBack)
                .forEach(edge => buildNode(edge.from));

            let stream$: Observable<INode>;

            // 检查是否是循环入口节点
            if (loopEntries.has(nodeId)) {
                const loopBackEdge = loopBackEdgeMap.get(nodeId)!;
                console.log('[buildStreamNetwork] 构建循环节点:', {
                    nodeId,
                    loopBackEdge: loopBackEdge.id
                });
                stream$ = this.createLoopNodeStream(node, incomingEdges, loopBackEdge, network, ctx);
            } else if (incomingEdges.length === 0) {
                // 入口节点
                stream$ = this.createEntryNodeStream(node, ctx);
            } else {
                // 常规节点
                stream$ = this._createNode(node, incomingEdges, network, ctx);
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
     * - 智能合并：IS_MULTI 属性聚合数组，非 IS_MULTI 属性后者覆盖前者
     */
    private combineGroupedStreamsByMode(
        groupedStreams: Observable<any>[],
        edges: IEdge[],
        targetNode: INode,
        sourceIds?: string[]  // 新增：显式传递流的顺序映射
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
                    map(groups => this.smartMergeGroups(groups, targetNode))
                );

            case EdgeMode.COMBINE_LATEST:
                // 任一变化触发：使用所有最新值
                return combineLatest(groupedStreams).pipe(
                    map(groups => this.smartMergeGroups(groups, targetNode))
                );

            case EdgeMode.WITH_LATEST_FROM:
                // 主流触发：携带其他流的最新值
                return this.combineGroupedByWithLatestFrom(groupedStreams, edges, sourceIds);

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
     *
     * 修复：使用显式的 sourceIds 参数建立流的映射关系，避免索引错位
     */
    private combineGroupedByWithLatestFrom(
        groupedStreams: Observable<any>[],
        edges: IEdge[],
        sourceIds?: string[]  // 显式传递流的顺序映射
    ): Observable<any> {
        // 找到主流（isPrimary: true）
        const primaryEdge = edges.find(e => e.isPrimary);

        if (!primaryEdge) {
            // 没有主流标记，回退到 combineLatest
            console.warn('[combineGroupedByWithLatestFrom] 未找到主流标记 (isPrimary: true)，回退到 combineLatest');
            return combineLatest(groupedStreams).pipe(
                map(groups => Object.assign({}, ...groups))
            );
        }

        const primarySourceId = primaryEdge.from;

        // 如果没有传递 sourceIds，从 edges 重建（保持向后兼容，但会有索引错位风险）
        const actualSourceIds = sourceIds || Array.from(new Set(edges.map(e => e.from)));

        // 建立 sourceId -> stream 的映射
        const streamMap = new Map<string, Observable<any>>();
        actualSourceIds.forEach((id, index) => {
            if (groupedStreams[index]) {
                streamMap.set(id, groupedStreams[index]!);
            }
        });

        const primaryStream = streamMap.get(primarySourceId);
        if (!primaryStream) {
            // 主流不存在，回退到 combineLatest
            console.error('[combineGroupedByWithLatestFrom] 主流不存在:', {
                primarySourceId,
                actualSourceIds,
                streamMapSize: streamMap.size
            });
            return combineLatest(groupedStreams).pipe(
                map(groups => Object.assign({}, ...groups))
            );
        }

        // 提取所有副流（非主流）
        const otherStreams: Observable<any>[] = [];
        actualSourceIds.forEach(id => {
            if (id !== primarySourceId) {
                const stream = streamMap.get(id);
                if (stream) {
                    otherStreams.push(stream);
                }
            }
        });

        if (otherStreams.length === 0) {
            // 只有主流，直接返回
            return primaryStream;
        }

        console.log('[combineGroupedByWithLatestFrom] 配置成功:', {
            primarySourceId,
            otherSourcesCount: otherStreams.length,
            actualSourceIds
        });

        return primaryStream.pipe(
            withLatestFrom(...otherStreams),
            map(([primary, ...others]) => Object.assign({}, primary, ...others))
        );
    }

    /**
     * 检测边模式（优先级：ZIP > WITH_LATEST_FROM > COMBINE_LATEST > MERGE）
     *
     * 优雅设计：
     * - 多条边可以有不同的 mode 配置
     * - 按优先级选择最严格的模式（ZIP 最严格，MERGE 最宽松）
     * - ZIP：要求精确配对，最严格
     * - WITH_LATEST_FROM：要求主从关系，次严格
     * - COMBINE_LATEST：等待所有上游至少一次，中等
     * - MERGE：任一上游即可触发，最宽松
     */
    private detectEdgeMode(edges: IEdge[]): EdgeMode {
        // 按优先级检查（从严格到宽松）
        if (edges.some(e => e.mode === EdgeMode.ZIP)) {
            return EdgeMode.ZIP;
        }
        if (edges.some(e => e.mode === EdgeMode.WITH_LATEST_FROM)) {
            return EdgeMode.WITH_LATEST_FROM;
        }
        if (edges.some(e => e.mode === EdgeMode.COMBINE_LATEST)) {
            return EdgeMode.COMBINE_LATEST;
        }
        if (edges.some(e => e.mode === EdgeMode.MERGE)) {
            return EdgeMode.MERGE;
        }

        // 默认 COMBINE_LATEST（等待所有上游就绪）
        return EdgeMode.COMBINE_LATEST;
    }

    /**
     * 智能合并多组数据（支持 IS_MULTI 模式聚合）
     *
     * 优雅设计：
     * - IS_MULTI 属性：聚合所有组的值到一个数组
     * - 非 IS_MULTI 属性：使用最后一组的值（覆盖）
     */
    private smartMergeGroups(groups: any[], targetNode: INode): any {
        const merged: any = {};
        const inputMetadataMap = this.getInputMetadataMap(targetNode);

        // 遍历所有组
        groups.forEach(group => {
            if (!group || typeof group !== 'object') return;

            // 遍历组内所有属性
            Object.entries(group).forEach(([key, value]) => {
                let metadata = inputMetadataMap.get(key);

                // 特殊处理：子工作流的动态输入属性（格式：nodeId.property）
                if (!metadata && targetNode.type === 'WorkflowGraphAst' && key.includes('.')) {
                    metadata = this.resolveSubworkflowInputMetadata(targetNode, key);
                }

                const isMulti = hasMultiMode(metadata?.mode) || metadata?.isMulti;

                if (isMulti) {
                    // IS_MULTI 模式：聚合到数组
                    if (!Array.isArray(merged[key])) {
                        merged[key] = [];
                    }
                    // 如果 value 是数组（已经被 IS_BUFFER reduce 处理过），展开合并
                    if (Array.isArray(value)) {
                        merged[key].push(...value);
                    } else {
                        merged[key].push(value);
                    }
                } else {
                    // 非 IS_MULTI：覆盖
                    merged[key] = value;
                }
            });
        });

        return merged;
    }

    /**
     * 合并边值数据
     *
     * 优雅设计:
     * - 有 toProperty：检查聚合模式，聚合或覆盖
     * - 无 toProperty 且值是对象：直接合并（展开）
     * - 其他情况：使用 fromProperty 或默认 key
     *
     * 支持位标志聚合模式：IS_MULTI
     */
    private mergeEdgeValues(edgeValues: { edge: IEdge; value: any }[], targetNode: INode): any {
        const merged: any = {};

        // 获取目标节点的输入元数据
        const inputMetadataMap = this.getInputMetadataMap(targetNode);

        edgeValues.forEach(({ edge, value }) => {
            if (edge.toProperty) {
                // 检查聚合模式
                let metadata = inputMetadataMap.get(edge.toProperty);

                // 特殊处理：子工作流的动态输入属性（格式：nodeId.property）
                if (!metadata && targetNode.type === 'WorkflowGraphAst' && edge.toProperty.includes('.')) {
                    metadata = this.resolveSubworkflowInputMetadata(targetNode, edge.toProperty);
                }

                const shouldAggregate = hasMultiMode(metadata?.mode) || metadata?.isMulti;

                if (shouldAggregate) {
                    // IS_MULTI 模式：累加多条边的数据到数组
                    if (!Array.isArray(merged[edge.toProperty])) {
                        merged[edge.toProperty] = [];
                    }
                    merged[edge.toProperty].push(value);
                } else {
                    // 单值模式：直接覆盖
                    merged[edge.toProperty] = value;
                }
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
     * 解析子工作流内部节点的输入元数据
     *
     * 当边连接到子工作流的动态输入属性（nodeId.property）时，
     * 需要查找内部节点的真实元数据，判断是否支持 IS_MULTI
     */
    private resolveSubworkflowInputMetadata(
        workflow: INode,
        dynamicProperty: string
    ): InputMetadata | undefined {
        // 解析 nodeId.property 格式（支持 nodeId 包含点）
        const lastDotIndex = dynamicProperty.lastIndexOf('.');
        if (lastDotIndex === -1) return undefined;

        const nodeId = dynamicProperty.substring(0, lastDotIndex);
        const property = dynamicProperty.substring(lastDotIndex + 1);

        // 查找内部节点（仅当 workflow 是子工作流时）
        if (workflow.type !== 'WorkflowGraphAst') return undefined;

        // 类型断言：已确认是 WorkflowGraphAst 类型
        const workflowAst = workflow as unknown as WorkflowGraphAst;
        const internalNode = workflowAst.nodes?.find(n => n.id === nodeId);
        if (!internalNode) return undefined;

        // 获取内部节点的输入元数据
        try {
            const ctor = findNodeType(internalNode.type);
            if (!ctor) return undefined;

            const inputs = root.get(INPUT, []).filter(it => it.target === ctor);
            return inputs.find(input => String(input.propertyKey) === property);
        } catch {
            return undefined;
        }
    }

    /**
     * 解析属性路径（支持子工作流动态输出）
     *
     * 优先级：
     * 1. 先尝试直接访问完整路径（支持动态输出如 "nodeId.output"）
     * 2. 如果不存在，再按点号分割（支持嵌套对象如 "user.name"）
     */
    private resolveProperty(obj: any, path: string): any {
        if (!path.includes('.')) {
            return obj?.[path];
        }

        // 优先尝试直接访问完整路径（用于子工作流动态输出）
        if (obj?.[path] !== undefined) {
            return obj[path];
        }

        // 回退：按点号分割访问嵌套属性
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

                    // 简化的计数逻辑：基于流的自然发射，而非状态检测
                    // 原理：RxJS 流每次发射都是独立的事件，直接响应即可
                    let newCount = existingNode.count;
                    let newEmitCount = existingNode.emitCount;

                    // emitCount: 每次发射 emitting 状态 +1（明确的输出事件）
                    if (updatedNode.state === 'emitting') {
                        newEmitCount += 1;
                    }

                    // count: 每次发射 success 或 fail 状态 +1（一次完整执行）
                    // 不依赖 existingNode 的状态，让流自然驱动计数
                    if (updatedNode.state === 'success' || updatedNode.state === 'fail') {
                        newCount += 1;
                    }

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
                setAstError(ast, error);
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
                obs.next(ast);
                obs.complete();
            })
        );
    }

    /**
     * 获取输出属性的元数据
     * 用于路由节点检测 isRouter 标识
     */
    private getOutputMetadata(ast: INode, propertyKey: string): OutputMetadata | undefined {
        const ctor = resolveConstructor(ast)
        const outputs = root.get(OUTPUT, [])
        return outputs.find(
            meta => meta.target === ctor && meta.propertyKey === propertyKey
        )
    }

    /**
     * 检测工作流中的循环结构
     *
     * 返回值：
     * - loops: 循环边数组（isLoopBack: true 的边）
     * - loopNodes: 参与循环的节点ID集合
     * - loopEntries: 循环入口节点ID集合（被回路边指向的节点）
     */
    private detectLoops(ast: WorkflowGraphAst): {
        loops: IEdge[];
        loopNodes: Set<string>;
        loopEntries: Set<string>;
    } {
        const loops = ast.edges.filter(edge => edge.isLoopBack);
        const loopEntries = new Set<string>();
        const loopNodes = new Set<string>();

        // 收集循环入口节点
        loops.forEach(loopEdge => {
            loopEntries.add(loopEdge.to);
        });

        // 收集循环体内的所有节点（从入口到回路边源节点之间的路径）
        loops.forEach(loopEdge => {
            const entryNode = loopEdge.to;
            const exitNode = loopEdge.from;

            // 使用 BFS 找到从入口到出口的所有节点
            const visited = new Set<string>();
            const queue: string[] = [entryNode];

            while (queue.length > 0) {
                const current = queue.shift()!;
                if (visited.has(current)) continue;
                visited.add(current);
                loopNodes.add(current);

                // 找到下游节点（排除回路边）
                const downstreamEdges = ast.edges.filter(
                    e => e.from === current && !e.isLoopBack
                );

                downstreamEdges.forEach(edge => {
                    if (!visited.has(edge.to)) {
                        queue.push(edge.to);
                    }
                });

                // 如果到达回路边的源节点，停止扩展
                if (current === exitNode) {
                    continue;
                }
            }
        });

        return { loops, loopNodes, loopEntries };
    }

    /**
     * 为循环入口节点创建循环执行流
     *
     * 核心设计（受 RxJS expand 启发）：
     * - 初始执行：节点首次执行（使用常规输入）
     * - 反馈执行：使用回路边传递的数据作为输入，重新执行节点
     * - 停止条件：达到最大迭代次数 || 条件属性为 falsy
     * - 数据隔离：每次迭代创建新的节点实例
     */
    private createLoopNodeStream(
        node: INode,
        incomingEdges: IEdge[],
        loopBackEdge: IEdge,
        network: Map<string, Observable<INode>>,
        ctx: WorkflowGraphAst
    ): Observable<INode> {
        // 分离常规输入边和回路边
        const regularEdges = incomingEdges.filter(e => !e.isLoopBack);

        // 配置循环参数
        const maxIterations = loopBackEdge.maxLoopIterations ?? 100;
        const conditionProperty = loopBackEdge.loopConditionProperty;

        console.log('[createLoopNodeStream] 创建循环节点流:', {
            nodeId: node.id,
            maxIterations,
            conditionProperty,
            regularEdgesCount: regularEdges.length,
            hasLoopBack: true
        });

        // 创建初始输入流（仅来自常规边）
        const initialInput$ = regularEdges.length > 0
            ? this._createNodeInputObservable(node, regularEdges, network, ctx)
            : of({});

        // 获取节点默认值
        const defaults = this.getInputDefaultValues(node);

        // 使用 expand 实现循环：每次执行结果可能触发下一次迭代
        return initialInput$.pipe(
            concatMap(initialInputs => {
                let iteration = 0;

                // expand：递归展开，每次发射的值会再次进入 expand 函数
                return of(initialInputs).pipe(
                    expand((inputs: any) => {
                        iteration++;

                        console.log('[createLoopNodeStream] 循环迭代:', {
                            nodeId: node.id,
                            iteration,
                            maxIterations,
                            inputs
                        });

                        // 检查是否达到最大迭代次数
                        if (iteration > maxIterations) {
                            console.log('[createLoopNodeStream] 达到最大迭代次数，停止循环');
                            return EMPTY;
                        }

                        // 创建节点实例并执行
                        const nodeInstance = this.cloneNode(node);
                        Object.assign(nodeInstance, defaults);
                        this.assignInputsToNodeInstance(nodeInstance, inputs);

                        // 执行节点，收集输出
                        return this.executeNode(nodeInstance, ctx).pipe(
                            // 只处理 emitting 状态（有输出数据）
                            filter(executedNode => executedNode.state === 'emitting'),
                            concatMap(executedNode => {
                                // 检查循环条件
                                if (conditionProperty) {
                                    const conditionValue = (executedNode as any)[conditionProperty];
                                    if (!conditionValue) {
                                        console.log('[createLoopNodeStream] 循环条件为 falsy，停止循环:', {
                                            conditionProperty,
                                            conditionValue
                                        });
                                        // 发射最终状态，然后停止循环
                                        return concat(
                                            of(executedNode),
                                            of({ ...executedNode, state: 'success' as const })
                                        ).pipe(
                                            tap(() => EMPTY) // 确保 expand 停止
                                        );
                                    }
                                }

                                // 从回路边提取反馈数据
                                const feedbackInputs = this.extractLoopBackInputs(
                                    executedNode,
                                    loopBackEdge,
                                    node
                                );

                                console.log('[createLoopNodeStream] 提取反馈数据:', {
                                    nodeId: node.id,
                                    feedbackInputs,
                                    willContinue: Object.keys(feedbackInputs).length > 0
                                });

                                // 发射当前迭代结果
                                return concat(
                                    of(executedNode),
                                    // 如果有反馈数据，继续下一次迭代
                                    Object.keys(feedbackInputs).length > 0
                                        ? of(feedbackInputs)
                                        : EMPTY
                                );
                            }),
                            catchError(error => {
                                console.error('[createLoopNodeStream] 循环执行错误:', error);
                                const failedNode = this.cloneNode(node);
                                failedNode.state = 'fail';
                                failedNode.error = error;
                                return of(failedNode);
                            })
                        );
                    }),
                    // 限制总输出次数（防止无限流）
                    take(maxIterations * 2), // 每次迭代最多发射 2 次（emitting + success）
                    // 确保最后一个状态是 success 或 fail
                    finalize(() => {
                        console.log('[createLoopNodeStream] 循环结束:', {
                            nodeId: node.id,
                            finalIteration: iteration
                        });
                    })
                );
            }),
            catchError(error => {
                const failedNode = this.cloneNode(node);
                failedNode.state = 'fail';
                failedNode.error = error;
                return of(failedNode);
            }),
            shareReplay({ bufferSize: maxIterations * 2, refCount: true })
        );
    }

    /**
     * 从执行完成的节点中提取回路边的反馈数据
     */
    private extractLoopBackInputs(
        executedNode: INode,
        loopBackEdge: IEdge,
        targetNode: INode
    ): any {
        const feedbackInputs: any = {};

        // 检查条件
        if (loopBackEdge.condition) {
            const value = (executedNode as any)[loopBackEdge.condition.property];
            if (value !== loopBackEdge.condition.value) {
                return feedbackInputs; // 条件不满足，返回空输入
            }
        }

        // 提取数据
        if (hasDataMapping(loopBackEdge) && loopBackEdge.fromProperty) {
            const value = this.resolveProperty(executedNode, loopBackEdge.fromProperty);

            if (loopBackEdge.toProperty) {
                feedbackInputs[loopBackEdge.toProperty] = value;
            } else {
                // 无目标属性，尝试展开对象
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    Object.assign(feedbackInputs, value);
                } else {
                    feedbackInputs[loopBackEdge.fromProperty] = value;
                }
            }
        }

        return feedbackInputs;
    }
}
