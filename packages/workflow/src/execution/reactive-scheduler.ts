import { setAstError, WorkflowGraphAst } from '../ast';
import { INode, IEdge, EdgeMode, hasDataMapping, isNode } from '../types';
import { executeAst } from '../executor';
import { Observable, of, EMPTY, merge, combineLatest, zip, asyncScheduler, concat } from 'rxjs';
import { map, catchError, takeWhile, concatMap, filter, withLatestFrom, shareReplay, subscribeOn, finalize, scan, takeLast, toArray, reduce, expand, tap, take } from 'rxjs/operators';
import { Injectable, root } from '@sker/core';
import { findNodeType, INPUT, InputMetadata, hasMultiMode, hasBufferMode, OUTPUT, type OutputMetadata, resolveConstructor } from '../decorator';
import { Compiler } from '../compiler';

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
     *
     * 重置逻辑：
     * - 清空所有节点的状态、计数
     * - 清空 IS_MULTI/IS_BUFFER 输入属性（避免重复执行时累积）
     * - 清空有输入边的节点的输出属性（输出由计算产生）
     * - 保留入口节点的输入/输出属性（用户输入数据）
     */
    private resetWorkflowGraphAst(ast: WorkflowGraphAst) {
        // ✨ 不可变方式：创建新状态对象
        ast.state = 'pending';

        ast.nodes = ast.nodes.map(node => {
            // ✨ 基础属性更新
            const updates: Partial<INode> = {
                state: 'pending',
                count: 0,
                emitCount: 0
            };

            // 只清空有输入边的节点的 IS_MULTI/IS_BUFFER 属性
            // 入口节点（没有输入边）的值来自用户输入，需要保留
            const hasIncomingEdges = ast.edges.some(edge => edge.to === node.id);
            if (hasIncomingEdges) {
                const clearedInputs = this.getClearedMultiBufferInputs(node);
                Object.assign(updates, clearedInputs);
            }

            // 清空有输入边的节点的输出属性
            // if (hasIncomingEdges) {
            //     const clearedOutputs = this.getClearedNodeOutputs(node);
            //     Object.assign(updates, clearedOutputs);
            // }

            // ✨ 创建新节点对象（保持原型链）
            return Object.assign(
                Object.create(Object.getPrototypeOf(node)),
                node,
                updates
            );
        })
        return ast;
    }

    /**
     * 获取清空后的 IS_MULTI 和 IS_BUFFER 输入属性
     *
     * 原因：这些模式使用数组累积，重复执行会导致数据越积越多
     * ✨ 返回需要更新的属性对象（不可变方式）
     */
    private getClearedMultiBufferInputs(node: INode): Record<string, any> {
        const updates: Record<string, any> = {};
        try {
            const inputMetadataMap = this.getInputMetadataMap(node);

            inputMetadataMap.forEach((metadata, propertyKey) => {
                const isBuffer = hasBufferMode(metadata?.mode);
                const isMulti = hasMultiMode(metadata?.mode) || metadata?.isMulti;
                if (isBuffer || isMulti) {
                    // 清空为空数组（将 propertyKey 转为 string）
                    updates[String(propertyKey)] = [];
                }
            });
        } catch (error) {
            // 无法获取元数据，跳过清空
        }
        return updates;
    }

    /**
     * 获取清空后的输出属性
     *
     * 适用于有输入边的节点，因为输出应该由计算产生
     * ✨ 返回需要更新的属性对象（不可变方式）
     */
    private getClearedNodeOutputs(node: INode): Record<string, any> {
        const updates: Record<string, any> = {};
        try {
            const ctor = resolveConstructor(node);
            const outputs = root.get(OUTPUT, []).filter(it => it.target === ctor);

            outputs.forEach(output => {
                // 将 propertyKey 转为 string
                updates[String(output.propertyKey)] = undefined;
            });
        } catch (error) {
            // 无法获取元数据，跳过清空
        }
        return updates;
    }
    schedule(ast: WorkflowGraphAst, ctx: WorkflowGraphAst): Observable<WorkflowGraphAst> {
        const { state } = this.resetWorkflowGraphAst(ast);
        // 已完成的工作流直接返回
        if (state === 'success' || state === 'fail') {
            return of(ast);
        }

        // 展平 GroupNode 结构：提取所有嵌套节点和边到顶层
        this.flattenWorkflowStructure(ast);

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
        // 展平 GroupNode 结构（确保所有嵌套节点都被处理）
        this.flattenWorkflowStructure(ctx);

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
        // 展平 GroupNode 结构（确保所有嵌套节点都被处理）
        this.flattenWorkflowStructure(ctx);

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
     * - 循环检测：检测到循环依赖时抛出错误（建议使用 MQ 解耦）
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
                const cyclePath = Array.from(building).concat(nodeId);
                const cycleDisplay = cyclePath.join(' → ');

                throw new Error(
                    `检测到循环依赖:\n${cycleDisplay}\n\n` +
                    `工作流不支持循环结构，请使用 MQ 解耦：\n` +
                    `1. 节点 A 输出 → MqPushAst 推送到队列\n` +
                    `2. 节点 B 输入 ← MqPullAst 从队列拉取\n` +
                    `3. 两个节点通过消息队列解耦，避免循环依赖`
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

                // 递归构建所有上游节点
                incomingEdges.forEach(edge => buildNode(edge.from));

                console.log(`[buildIncrementalNetwork] 构建受影响节点 ${nodeId}:`, {
                    hasIncomingEdges: incomingEdges.length > 0,
                    incomingEdgesCount: incomingEdges.length,
                    isEntryNode: incomingEdges.length === 0
                });

                if (incomingEdges.length === 0) {
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
     * 1. **优先使用 node.metadata**：如果节点已编译，直接从 metadata 读取
     * 2. **回退到装饰器**：如果节点未编译，从 DI 容器读取装饰器元数据
     * 3. 如果装饰器明确指定 required: true 且无 defaultValue → 必填
     * 4. 如果装饰器明确指定 required: false → 非必填
     * 5. 如果装饰器提供了 defaultValue → 非必填
     * 6. 如果未指定 required，尝试从类实例读取默认值：
     *    - 有默认值 → 非必填
     *    - 无默认值（undefined）→ 必填
     */
    private getRequiredInputProperties(node: INode): Set<string> {
        const properties = new Set<string>();
        if (!isNode(node)) {
            const compiler = root.get(Compiler)
            node = compiler.compile(node)
        }
        if (!isNode(node)) {
            throw new Error(`getRequiredInputProperties error: node 类型错误`)
        }
        // 🔧 优先使用编译后的 metadata 字段
        node.metadata.inputs.forEach(input => {
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
                properties.add(input.property);
                return;
            }

            // 未明确指定：检查节点实例的属性值
            const currentValue = (node as any)[input.property];
            if (currentValue === undefined) {
                // 无默认值 → 必填
                properties.add(input.property);
            }
        });

        return properties;
        throw new Error(`get node metadata failed`)
    }

    /**
     * 获取节点输入属性的元数据映射
     *
     * 用于检查 isMulti 等属性配置
     *
     * 优雅设计：
     * - **优先使用 node.metadata**：如果节点已编译，直接从 metadata 构建映射
     * - **回退到装饰器**：如果节点未编译，从 DI 容器读取装饰器元数据
     */
    private getInputMetadataMap(node: INode): Map<string | symbol, InputMetadata> {
        if (!isNode(node)) {
            const compiler = root.get(Compiler)
            node = compiler.compile(node)
        }
        if (!isNode(node)) {
            throw new Error(`getRequiredInputProperties error: node 类型错误`)
        }
        const metadataMap = new Map<string | symbol, InputMetadata>();

        // 🔧 优先使用编译后的 metadata 字段
        node.metadata!.inputs.forEach(input => {
            metadataMap.set(input.property, input as any);
        });
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
     * 1. **node.metadata.inputs[].defaultValue**（编译后的元数据）
     * 2. 装饰器的 defaultValue
     * 3. 类属性的初始值
     * 4. undefined
     */
    private getInputDefaultValues(node: INode): Record<string, any> {
        if (!isNode(node)) {
            const compiler = root.get(Compiler)
            node = compiler.compile(node)
        }
        if (!isNode(node)) {
            throw new Error(`getRequiredInputProperties error: node 类型错误`)
        }
        const defaults: Record<string, any> = {};

        // 🔧 优先使用编译后的 metadata 字段
        node.metadata!.inputs.forEach(input => {
            const propKey = String(input.property);

            // 优先使用装饰器的 defaultValue
            if (input.defaultValue !== undefined) {
                defaults[propKey] = input.defaultValue;
            } else {
                // 尝试读取节点实例的当前值
                const currentValue = (node as any)[propKey];
                if (currentValue !== undefined) {
                    defaults[propKey] = currentValue;
                }
            }
        });
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
     * 构建流网络 - 使用拓扑排序保证依赖顺序
     *
     * 优雅设计:
     * - 递归构建：先构建上游，再构建下游
     * - 去重保护：使用 Map 防止重复构建
     * - 循环检测：检测到循环依赖时抛出错误（建议使用 MQ 解耦）
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
                const cyclePath = Array.from(building).concat(nodeId);
                const cycleDisplay = cyclePath.join(' → ');

                throw new Error(
                    `检测到循环依赖:\n${cycleDisplay}\n\n` +
                    `工作流不支持循环结构，请使用 MQ 解耦：\n` +
                    `1. 节点 A 输出 → MqPushAst 推送到队列\n` +
                    `2. 节点 B 输入 ← MqPullAst 从队列拉取\n` +
                    `3. 两个节点通过消息队列解耦，避免循环依赖`
                );
            }

            building.add(nodeId);

            const node = ast.nodes.find(n => n.id === nodeId);
            if (!node) {
                throw new Error(`节点不存在: ${nodeId}`);
            }

            const incomingEdges = ast.edges.filter(e => e.to === nodeId);

            // 递归构建所有上游节点
            incomingEdges.forEach(edge => buildNode(edge.from));

            let stream$: Observable<INode>;

            if (incomingEdges.length === 0) {
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
                const failedNodes = ast.nodes.filter(n => n.state === 'fail');
                const hasFailures = failedNodes.length > 0;

                // 【调试日志】输出失败节点信息
                if (hasFailures) {
                    console.error('[subscribeAndMerge] 发现失败节点:', failedNodes.map(n => ({
                        id: n.id,
                        type: n.type,
                        state: n.state,
                        error: n.error,
                        isGroupNode: (n as any).isGroupNode
                    })));
                }

                ast.state = hasFailures ? 'fail' : 'success';

                // 恢复 GroupNode 的嵌套结构（确保 UI 层和保存时的数据正确）
                this.restoreGroupStructure(ast);

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
     * 展平 GroupNode 结构 - 递归提取所有嵌套节点和边到顶层
     *
     * 设计理念：
     * - GroupNode 仅作为 UI 层的容器（分组、折叠、布局）
     * - 执行层面，所有节点和边都应该在顶层被调度
     * - 递归遍历所有 GroupNode，提取内部的 nodes 和 edges
     * - 保留节点的 parentId 属性（用于 UI 层识别分组关系）
     *
     * 重要：
     * - 不修改传入的 ast 对象（保留 UI 层的嵌套结构）
     * - 返回展平后的节点和边数组副本
     * - 节点状态同步回原始 AST 由 subscribeAndMerge 处理
     */
    private flattenWorkflowStructure(ast: WorkflowGraphAst): void {
        const allNodes: INode[] = [];
        const allEdges: IEdge[] = [];
        const originalGroupContents = new Map<string, {
            nodes: INode[],
            edges: IEdge[],
            groupMeta: INode  // 保存 GroupNode 自身的元数据
        }>();

        // 递归收集所有节点（包括嵌套的）
        const collectNodes = (nodes: INode[]) => {
            for (const node of nodes) {
                // 检查是否是 GroupNode（使用 isGroupNode 标记，不依赖类实例）
                const isGroup = (node as any).isGroupNode === true;

                if (isGroup) {
                    // 保存 GroupNode 的原始内容（用于后续恢复）
                    const groupNodes = (node as any).nodes || [];
                    const groupEdges = (node as any).edges || [];
                    originalGroupContents.set(node.id, {
                        nodes: [...groupNodes],
                        edges: [...groupEdges],
                        groupMeta: { ...node }  // 保存 GroupNode 自身的所有属性
                    });

                    // 【关键修复】GroupNode 本身不参与执行，只提取内部节点
                    // GroupNode 只是 UI 层的组织容器，不是可执行的工作流节点
                    // 如果需要可执行的子工作流，应该使用 WorkflowGraphAst（不带 isGroupNode 标记）

                    // 递归提取 GroupNode 内部的节点
                    if (groupNodes.length > 0) {
                        collectNodes(groupNodes);
                    }

                    // 收集 GroupNode 内部的边
                    if (groupEdges.length > 0) {
                        allEdges.push(...groupEdges);
                    }
                } else {
                    // 普通节点（包括不带 isGroupNode 标记的 WorkflowGraphAst）直接添加
                    allNodes.push(node);
                }
            }
        };

        // 从顶层开始收集
        collectNodes(ast.nodes);
        allEdges.push(...ast.edges);

        // 替换 ast 的节点和边数组（用于执行）
        ast.nodes = allNodes;
        ast.edges = allEdges;

        // 将原始内容存储在 AST 上（用于执行后恢复）
        (ast as any).__originalGroupContents = originalGroupContents;
    }

    /**
     * 恢复 GroupNode 的嵌套结构（执行完成后调用）
     *
     * 用途：
     * - 将展平的节点和边重新组织回嵌套结构
     * - 确保 UI 层能正确显示 GroupNode 的父子关系
     * - 保证数据保存时不丢失嵌套信息
     *
     * 变更：
     * - GroupNode 本身在展平时已被移除，需要重新创建
     */
    private restoreGroupStructure(ast: WorkflowGraphAst): void {
        const originalContents = (ast as any).__originalGroupContents as Map<string, {
            nodes: INode[],
            edges: IEdge[],
            groupMeta: INode
        }>;
        if (!originalContents || originalContents.size === 0) {
            return; // 没有 GroupNode，无需恢复
        }

        // 从展平的节点数组中分离顶层节点和子节点
        const topLevelNodes: INode[] = [];
        const childNodeMap = new Map<string, INode[]>(); // parentId -> 子节点数组

        for (const node of ast.nodes) {
            if (node.parentId) {
                // 有 parentId 的是子节点
                if (!childNodeMap.has(node.parentId)) {
                    childNodeMap.set(node.parentId, []);
                }
                childNodeMap.get(node.parentId)!.push(node);
            } else {
                // 无 parentId 的是顶层节点
                topLevelNodes.push(node);
            }
        }

        // 重新创建 GroupNode 并恢复其内部结构
        originalContents.forEach((originalContent, groupId) => {
            const childNodes = childNodeMap.get(groupId) || [];

            // 提取该分组的内部边（两端都是该分组的子节点）
            const childNodeIds = new Set(childNodes.map(n => n.id));
            const internalEdges = ast.edges.filter(edge =>
                childNodeIds.has(edge.from) && childNodeIds.has(edge.to)
            );

            // 创建 GroupNode（恢复原始结构）
            const groupNode: INode = {
                ...originalContent.groupMeta,  // 恢复 GroupNode 自身的所有属性
                nodes: childNodes,
                edges: internalEdges,
                state: 'success', // GroupNode 自身状态默认成功
            } as any;

            // 确保 isGroupNode 标记存在
            (groupNode as any).isGroupNode = true;

            // 添加到顶层
            topLevelNodes.push(groupNode);
        });

        // 恢复顶层节点数组
        ast.nodes = topLevelNodes;

        // 恢复顶层边数组（排除分组内部边）
        const allChildNodeIds = new Set<string>();
        childNodeMap.forEach(nodes => {
            nodes.forEach(n => allChildNodeIds.add(n.id));
        });
        ast.edges = ast.edges.filter(edge =>
            !allChildNodeIds.has(edge.from) || !allChildNodeIds.has(edge.to)
        );

        // 清理临时数据
        delete (ast as any).__originalGroupContents;

        console.log('[restoreGroupStructure] 恢复完成:', {
            topLevelNodes: topLevelNodes.length,
            groupNodes: topLevelNodes.filter(n => (n as any).isGroupNode === true).length
        });
    }
}
