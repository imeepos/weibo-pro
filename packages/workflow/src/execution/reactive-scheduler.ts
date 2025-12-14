import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, EdgeMode, hasDataMapping, isNode, isBehaviorSubject, isRouteSkipped, extractSubjectValue } from '../types';
import { executeAst } from '../executor';
import { Observable, of, EMPTY, merge, combineLatest, zip, asyncScheduler, BehaviorSubject, Subject, concat } from 'rxjs';
import { map, catchError, concatMap, filter, shareReplay, subscribeOn, finalize, scan, takeLast, reduce, take, distinctUntilChanged, skip, tap } from 'rxjs/operators';
import { concatLatestFrom } from '../operators/concat_latest_from';
import { tapResponse } from '../operators/tap-response';
import { Inject, Injectable, root } from '@sker/core';
import { findNodeType, INPUT, InputMetadata, hasMultiMode, hasBufferMode, OUTPUT, type OutputMetadata, resolveConstructor } from '../decorator';
import { Compiler } from '../compiler';
import { WorkflowEventBus } from './workflow-events';
import { updateNodeReducer, finalizeWorkflowReducer, failWorkflowReducer } from './workflow-reducers';
import { createDefaultErrorHandler, getErrorConfigFromNode } from './error-handler';
import { extractEndNodeOutputs } from '../ast-utils';

/**
 * 工作流事件类型 - 借鉴 NetworkBuilder 的事件模型
 */
export type WorkflowEvent =
    | NodeStateEvent
    | OutputEmitEvent
    | WorkflowCompleteEvent
    | WorkflowErrorEvent;

export interface NodeStateEvent {
    type: 'node_state';
    nodeId: string;
    data: INode;
}

export interface OutputEmitEvent {
    type: 'output_emit';
    nodeId: string;
    property: string;
    value: any;
}

export interface WorkflowCompleteEvent {
    type: 'workflow_complete';
    workflowId?: string;
}

export interface WorkflowErrorEvent {
    type: 'workflow_error';
    nodeId?: string;
    error: any;
}

/**
 * 边分组接口 - 借鉴 NetworkBuilder
 */
interface EdgeGroup {
    nodeId: string;
    edges: IEdge[];
    sources: Map<string, BehaviorSubject<any>>;
}

@Injectable()
export class ReactiveScheduler {
    // 缓存编译器实例，避免重复获取
    private readonly compiler = root.get(Compiler);

    // 缓存输入/输出元数据，避免重复查找
    private readonly inputMetadataCache = new Map<string, Map<string | symbol, InputMetadata>>();
    private readonly outputMetadataCache = new Map<string, Map<string | symbol, OutputMetadata>>();

    // 统一的错误消息常量
    private readonly ERRORS = {
        INVALID_NODE: '节点类型错误',
        GET_NODE_METADATA: '获取节点元数据失败'
    };

    constructor(@Inject(WorkflowEventBus) private eventBus: WorkflowEventBus) {}

    /**
     * 初始化节点的 @Output BehaviorSubject
     *
     * 借鉴 NetworkBuilder 的方式，确保每个 @Output 都是一个正确初始化的 BehaviorSubject
     * 这样可以支持纯流式事件发射，避免手动状态管理
     */
    private initializeOutputSubjects(ast: WorkflowGraphAst): void {
        ast.nodes.forEach(node => {
            if (!isNode(node)) {
                node = this.compiler.compile(node);
            }
            if (!node.metadata?.outputs) return;

            node.metadata.outputs.forEach(output => {
                const key = output.property;
                const current = (node as any)[key];

                // 如果还不是 BehaviorSubject，创建一个
                if (!isBehaviorSubject(current)) {
                    (node as any)[key] = new BehaviorSubject(current ?? null);
                }
                // 如果已经是 BehaviorSubject，不做任何修改
                // 这样可以保持测试中手动设置的值
            });
        });
    }

    /**
     * 从节点提取输出事件
     * 检查所有 @Output BehaviorSubject，提取非空值
     */
    private extractOutputEvents(node: INode): OutputEmitEvent[] {
        if (!isNode(node)) {
            node = this.compiler.compile(node);
        }
        if (!node.metadata?.outputs) return [];

        const events: OutputEmitEvent[] = [];

        node.metadata.outputs.forEach(output => {
            const key = output.property;
            const subject = (node as any)[key];

            if (isBehaviorSubject(subject)) {
                const value = subject.getValue();

                // 只有非空值才发射事件
                if (value !== null && value !== undefined && value !== '') {
                    events.push({
                        type: 'output_emit',
                        nodeId: node.id,
                        property: key,
                        value
                    });
                }
            }
        });

        return events;
    }

    /**
     * 为单个节点构建事件流
     *
     * 借鉴 NetworkBuilder 的纯流式事件发射机制：
     * - 将节点执行转换为 Observable<WorkflowEvent>
     * - 每次节点状态更新时，同时发射输出事件
     * - 无需手动订阅管理，使用 finalize 自动清理
     */
    private buildNodeEventStream(
        node: INode,
        input$: Observable<any>,
        ast: WorkflowGraphAst,
        ctx: WorkflowGraphAst
    ): Observable<WorkflowEvent> {
        return input$.pipe(
            concatMap(inputData => {
                // 将输入数据赋给节点
                if (inputData) {
                    Object.assign(node, inputData);
                }

                // 执行节点并转换为事件流
                return executeAst(node, ctx).pipe(
                    concatMap(updatedNode => {
                        const events: WorkflowEvent[] = [];

                        // 1. 发射节点状态事件
                        events.push({
                            type: 'node_state',
                            nodeId: updatedNode.id,
                            data: updatedNode
                        });

                        // 2. 提取并发射输出事件
                        const outputEvents = this.extractOutputEvents(updatedNode as INode);
                        events.push(...outputEvents);

                        console.log(`[ReactiveScheduler] 节点=${updatedNode.id} 发射 ${events.length} 个事件`);
                        return events;
                    }),
                    catchError(error => {
                        console.error(`[ReactiveScheduler] 节点 ${node.id} 执行失败:`, error);
                        node.state = 'fail';
                        node.error = error;
                        return [
                            { type: 'node_state', nodeId: node.id, data: node } as NodeStateEvent,
                            { type: 'workflow_error', nodeId: node.id, error } as WorkflowErrorEvent
                        ];
                    })
                );
            }),
            shareReplay(1)
        );
    }

    /**
     * 构建完整的工作流事件网络
     *
     * 借鉴 NetworkBuilder 的纯流式架构：
     * - 初始化所有节点的 @Output BehaviorSubject
     * - 为每个节点创建输入 Subject 和事件流
     * - 按边分组连接数据流
     * - 触发起始节点
     * - 返回 Observable<WorkflowEvent> 事件流
     */
    private buildEventNetwork(
        ast: WorkflowGraphAst,
        ctx: WorkflowGraphAst
    ): Observable<WorkflowEvent> {
        // Step 1: 初始化所有节点的 @Output BehaviorSubject
        this.initializeOutputSubjects(ast);

        // Step 2: 为每个节点创建输入 Subject 和事件流
        const nodeEventStreams = new Map<string, Observable<WorkflowEvent>>();
        const inputSubjects = new Map<string, Subject<any>>();
        const inDegrees = this.calculateInDegrees(ast);

        // 预分配容量，减少 Map 扩容开销（如果支持的话）
        const nodeCount = ast.nodes.length;
        try {
            if (typeof (nodeEventStreams as any).reserve === 'function') {
                (nodeEventStreams as any).reserve(nodeCount);
            }
            if (typeof (inputSubjects as any).reserve === 'function') {
                (inputSubjects as any).reserve(nodeCount);
            }
        } catch {
            // 忽略不支持的情况
        }

        ast.nodes.forEach(node => {
            const input$ = new Subject<any>();
            inputSubjects.set(node.id, input$);

            const nodeEventStream$ = this.buildNodeEventStream(node, input$, ast, ctx);
            nodeEventStreams.set(node.id, nodeEventStream$);
        });

        // Step 3: 按目标节点分组收集边，连接数据流
        const edgeGroups = this.groupEdgesByTarget(ast);
        edgeGroups.forEach(group => {
            this.connectEdgesToNode(group, ast, inputSubjects);
        });

        // Step 4: 触发起始节点（入度为 0）
        this.triggerStartNodes(ast, inDegrees, inputSubjects);

        // Step 5: 合并所有节点的事件流
        return this.mergeNodeEventStreams(ast, nodeEventStreams, inputSubjects).pipe(
            finalize(() => {
                // 工作流完成后关闭所有输入Subjects，确保流能正确完成
                inputSubjects.forEach(subject => {
                    if (!subject.closed) {
                        subject.complete();
                    }
                });
                // 关闭所有输出Subjects，确保边模式能正确完成
                this.completeOutputSubjects(ast);
                console.log(`[ReactiveScheduler] 工作流 ${ast.id} 事件网络清理完成`);
            })
        );
    }

    /**
     * 重构后的 schedule 方法
     *
     * 融合方案：
     * 1. 使用 buildEventNetwork 构建纯事件流（借鉴 NetworkBuilder）
     * 2. 将事件流转换为状态累积流（保持返回 WorkflowGraphAst）
     * 3. 自动清理订阅（借鉴 NetworkBuilder 的 finalize）
     */
    schedule(ast: WorkflowGraphAst, parent: WorkflowGraphAst): Observable<WorkflowGraphAst> {
        this.eventBus.emitWorkflowStart(ast.id);

        const { state } = this.resetWorkflowGraphAst(ast);
        if (state === 'success' || state === 'fail') {
            return of(ast);
        }

        this.flattenWorkflowStructure(ast);
        ast.state = 'running';

        // 使用纯事件流 + 状态累积（替代原来的 scan + reducer）
        return this.buildEventNetwork(ast, parent).pipe(
            // 将事件流转换为状态累积流
            scan((workflow: WorkflowGraphAst, event: WorkflowEvent) => {
                switch (event.type) {
                    case 'node_state':
                        // 同时发射到事件总线（兼容旧的订阅者）
                        const node = event.data;
                        if (node.state === 'success') {
                            this.eventBus.emitNodeSuccess(node.id, node, ast.id);
                        } else if (node.state === 'fail') {
                            this.eventBus.emitNodeFail(node.id, node.error, ast.id);
                        } else if (node.state === 'running') {
                            this.eventBus.emitNodeEmit(node.id, node, ast.id);
                        }
                        return updateNodeReducer(workflow, {
                            nodeId: event.nodeId,
                            updates: event.data
                        });
                    case 'output_emit':
                        // 发射输出事件到事件总线
                        this.eventBus.emitOutputEmit(
                            event.nodeId,
                            event.property,
                            event.value,
                            ast.id
                        );
                        return workflow;
                    case 'workflow_complete':
                        return finalizeWorkflowReducer(workflow);
                    case 'workflow_error':
                        return failWorkflowReducer(workflow, event.error);
                    default:
                        return workflow;
                }
            }, ast),
            // 最后一次状态就是完整的 WorkflowGraphAst
            takeLast(1),
            map((finalWorkflow: WorkflowGraphAst) => {
                // 提取结束节点输出（保持原有行为）
                if (finalWorkflow.state === 'success' && finalWorkflow.endNodeIds && finalWorkflow.endNodeIds.length > 0) {
                    const outputs = extractEndNodeOutputs(finalWorkflow.nodes, finalWorkflow.endNodeIds);
                    if (Object.keys(outputs).length > 0) {
                        Object.assign(finalWorkflow, outputs);
                    }
                }
                // 恢复 GroupNode 的嵌套结构
                this.restoreGroupStructure(finalWorkflow);
                return finalWorkflow;
            }),
            // 最终发射完成/失败事件（保持原有行为）
            finalize(() => {
                if (ast.state === 'fail') {
                    this.eventBus.emitWorkflowFail(ast.id, ast.error);
                } else {
                    this.eventBus.emitWorkflowComplete(ast.id, ast);
                }

                // 清理缓存，释放内存
                this.inputMetadataCache.clear();
                this.outputMetadataCache.clear();
                console.log(`[ReactiveScheduler] 工作流 ${ast.id} 缓存清理完成`);
            })
        );
    }

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
            return Object.assign(
                Object.create(Object.getPrototypeOf(node)),
                node,
                updates
            );
        })
        return ast;
    }

    /**
     * 计算各节点的入度（指向该节点的边数）
     * 借鉴 NetworkBuilder
     */
    private calculateInDegrees(ast: WorkflowGraphAst): Map<string, number> {
        const inDegrees = new Map<string, number>();

        ast.nodes.forEach(node => inDegrees.set(node.id, 0));
        ast.edges.forEach(edge => {
            const current = inDegrees.get(edge.to) ?? 0;
            inDegrees.set(edge.to, current + 1);
        });

        return inDegrees;
    }

    /**
     * 使用 Kahn 算法检测循环依赖
     * 时间复杂度：O(V + E)
     * 空间复杂度：O(V + E)
     */
    private detectCycleWithKahn(ast: WorkflowGraphAst): { hasCycle: boolean; cyclePath: string[] } {
        // 计算入度
        const inDegrees = new Map<string, number>();
        const adjacencyList = new Map<string, string[]>(); // 邻接表

        // 初始化
        ast.nodes.forEach(node => {
            inDegrees.set(node.id, 0);
            adjacencyList.set(node.id, []);
        });

        // 构建邻接表并计算入度
        ast.edges.forEach(edge => {
            const current = inDegrees.get(edge.to) ?? 0;
            inDegrees.set(edge.to, current + 1);
            adjacencyList.get(edge.from)!.push(edge.to);
        });

        // 找到所有入度为 0 的节点
        const queue: string[] = [];
        inDegrees.forEach((degree, nodeId) => {
            if (degree === 0) {
                queue.push(nodeId);
            }
        });

        let visitedCount = 0;
        const topologicalOrder: string[] = [];

        // Kahn 算法
        while (queue.length > 0) {
            const current = queue.shift()!;
            visitedCount++;
            topologicalOrder.push(current);

            // 处理当前节点的所有邻居
            const neighbors = adjacencyList.get(current)!;
            neighbors.forEach(neighbor => {
                const newDegree = (inDegrees.get(neighbor) ?? 0) - 1;
                inDegrees.set(neighbor, newDegree);

                if (newDegree === 0) {
                    queue.push(neighbor);
                }
            });
        }

        // 如果访问的节点数不等于总节点数，说明存在环
        if (visitedCount !== ast.nodes.length) {
            // 尝试找到环的路径（简化版，返回一个可能的环）
            const cyclePath = this.findCyclePath(ast, inDegrees);
            return { hasCycle: true, cyclePath };
        }

        return { hasCycle: false, cyclePath: [] };
    }

    /**
     * 尝试找到环的路径
     * 从剩余入度大于 0 的节点开始深度优先搜索
     */
    private findCyclePath(ast: WorkflowGraphAst, inDegrees: Map<string, number>): string[] {
        const hasCycle = new Set<string>();
        const visited = new Set<string>();
        const path: string[] = [];

        // 找到所有入度大于 0 的节点（这些节点在环中）
        inDegrees.forEach((degree, nodeId) => {
            if (degree > 0) {
                hasCycle.add(nodeId);
            }
        });

        if (hasCycle.size === 0) {
            return [];
        }

        // 从环中的任意节点开始 DFS
        const startNode = Array.from(hasCycle)[0]!;
        const result = this.dfsFindCycle(startNode, ast, hasCycle, visited, path);

        return result || [startNode];
    }

    /**
     * 深度优先搜索寻找环
     */
    private dfsFindCycle(
        current: string,
        ast: WorkflowGraphAst,
        hasCycle: Set<string>,
        visited: Set<string>,
        path: string[]
    ): string[] | null {
        if (visited.has(current)) {
            // 找到环，返回路径
            const cycleStartIndex = path.indexOf(current);
            return path.slice(cycleStartIndex);
        }

        if (!hasCycle.has(current)) {
            return null;
        }

        visited.add(current);
        path.push(current);

        // 遍历所有邻居
        const neighbors = ast.edges
            .filter(edge => edge.from === current)
            .map(edge => edge.to);

        for (const neighbor of neighbors) {
            const result = this.dfsFindCycle(neighbor, ast, hasCycle, visited, path);
            if (result) {
                return result;
            }
        }

        // 回溯
        path.pop();
        visited.delete(current);

        return null;
    }

    /**
     * 按目标节点分组收集边
     * 借鉴 NetworkBuilder
     */
    private groupEdgesByTarget(ast: WorkflowGraphAst): EdgeGroup[] {
        const groups = new Map<string, EdgeGroup>();

        ast.edges.forEach(edge => {
            if (!groups.has(edge.to)) {
                groups.set(edge.to, {
                    nodeId: edge.to,
                    edges: [],
                    sources: new Map(),
                });
            }

            const group = groups.get(edge.to)!;
            group.edges.push(edge);

            // 预加载源节点的输出
            const sourceNode = ast.nodes.find(n => n.id === edge.from);
            if (sourceNode) {
                const output = (sourceNode as any)[edge.fromProperty!] as BehaviorSubject<any>;
                if (isBehaviorSubject(output)) {
                    groups.get(edge.to)!.sources.set(`${edge.from}:${edge.fromProperty}`, output);
                }
            }
        });

        return Array.from(groups.values());
    }

    /**
     * 为目标节点连接所有输入边
     * 借鉴 NetworkBuilder，支持多种流合并模式
     */
    private connectEdgesToNode(
        group: EdgeGroup,
        ast: WorkflowGraphAst,
        inputSubjects: Map<string, Subject<any>>
    ): void {
        const targetSubject = inputSubjects.get(group.nodeId);
        if (!targetSubject) return;

        if (group.edges.length === 0) return;

        // 如果只有一条边，直接连接
        if (group.edges.length === 1) {
            const edge = group.edges[0]!;
            const source = group.sources.get(`${edge.from}:${edge.fromProperty}`);
            if (source) {
                source.asObservable().subscribe(value => {
                    targetSubject.next({ [edge.toProperty!]: value });
                });
            }
            return;
        }

        // 多条边的流合并处理
        const mode = group.edges[0]!.mode ?? EdgeMode.MERGE;

        switch (mode) {
            case EdgeMode.MERGE:
                this.connectMergeMode(group, targetSubject);
                break;
            case EdgeMode.ZIP:
                this.connectZipMode(group, targetSubject);
                break;
            case EdgeMode.COMBINE_LATEST:
                this.connectCombineLatestMode(group, targetSubject);
                break;
        }
    }

    private connectMergeMode(group: EdgeGroup, targetSubject: Subject<any>): void {
        // 为每条边单独订阅，发射到对应的属性
        group.edges.forEach(edge => {
            const source = group.sources.get(`${edge.from}:${edge.fromProperty}`);
            if (source) {
                source.asObservable().subscribe(value => {
                    const obj = {} as any;
                    obj[edge.toProperty!] = value;
                    targetSubject.next(obj);
                });
            }
        });
    }

    private connectZipMode(group: EdgeGroup, targetSubject: Subject<any>): void {
        const sources = group.edges.map(edge => {
            const source = group.sources.get(`${edge.from}:${edge.fromProperty}`);
            return source ? source.asObservable() : EMPTY;
        });

        zip(...sources).subscribe(values => {
            const combined = {} as any;
            group.edges.forEach((edge, idx) => {
                combined[edge.toProperty!] = values[idx];
            });
            targetSubject.next(combined);
        });
    }

    private connectCombineLatestMode(group: EdgeGroup, targetSubject: Subject<any>): void {
        const sources = group.edges.map(edge => {
            const source = group.sources.get(`${edge.from}:${edge.fromProperty}`);
            return source ? source.asObservable() : EMPTY;
        });

        combineLatest(sources).subscribe(values => {
            const combined = {} as any;
            group.edges.forEach((edge, idx) => {
                combined[edge.toProperty!] = values[idx];
            });
            targetSubject.next(combined);
        });
    }

    /**
     * 触发入度为 0 的起始节点
     * 借鉴 NetworkBuilder
     */
    private triggerStartNodes(
        ast: WorkflowGraphAst,
        inDegrees: Map<string, number>,
        inputSubjects: Map<string, Subject<any>>
    ): void {
        ast.nodes.forEach(node => {
            // 入度为0的节点都应该被触发，不管是否在entryNodeIds中
            // 因为它们没有依赖，可以独立执行
            if ((inDegrees.get(node.id) ?? 0) === 0) {
                const subject = inputSubjects.get(node.id);
                if (subject) {
                    // 触发起始节点（无输入）
                    subject.next({});
                }
            }
        });
    }

    /**
     * 合并所有节点的事件流
     * 借鉴 NetworkBuilder
     */
    private mergeNodeEventStreams(
        ast: WorkflowGraphAst,
        nodeEventStreams: Map<string, Observable<WorkflowEvent>>,
        inputSubjects: Map<string, Subject<any>>
    ): Observable<WorkflowEvent> {
        const allNodeStreams = Array.from(nodeEventStreams.values());

        if (allNodeStreams.length === 0) {
            return new Observable<WorkflowEvent>(obs => {
                obs.next({
                    type: 'workflow_complete',
                    workflowId: ast.id
                });
                obs.complete();
            });
        }

        // 合并所有节点的事件流，在流结束时追加 workflow_complete 事件
        return concat(
            merge(...allNodeStreams),
            of({
                type: 'workflow_complete',
                workflowId: ast.id
            } as WorkflowCompleteEvent)
        );
    }

    /**
     * 关闭所有节点的 @Output BehaviorSubject
     * 用于工作流完成后清理，确保流能正确完成
     */
    private completeOutputSubjects(ast: WorkflowGraphAst): void {
        ast.nodes.forEach(node => {
            if (!isNode(node)) {
                const compiler = root.get(Compiler);
                node = compiler.compile(node);
            }
            if (!node.metadata?.outputs) return;

            node.metadata.outputs.forEach(output => {
                const key = output.property;
                const subject = (node as any)[key];

                if (isBehaviorSubject(subject) && !subject.closed) {
                    subject.complete();
                }
            });
        });
    }

    private getClearedMultiBufferInputs(node: INode): Record<string, any> {
        const updates: Record<string, any> = {};
        try {
            const inputMetadataMap = this.getInputMetadataMap(node);

            inputMetadataMap.forEach((metadata, propertyKey) => {
                const isBuffer = hasBufferMode(metadata?.mode);
                // 只清空 IS_BUFFER 模式的属性
                // IS_MULTI 模式在 assignInputsToNodeInstance 中会检查并重新初始化
                if (isBuffer) {
                    updates[String(propertyKey)] = [];
                }
            });
        } catch (error) {
            // 无法获取元数据，跳过清空
        }
        return updates;
    }

    fineTuneNode(
        ctx: WorkflowGraphAst,
        nodeId: string
    ): Observable<WorkflowGraphAst> {
        this.flattenWorkflowStructure(ctx);
        const targetNode = ctx.nodes.find(n => n.id === nodeId);
        if (!targetNode) {
            throw new Error(`节点不存在: ${nodeId}`);
        }
        const affectedNodes = this.findAffectedNodes(ctx, nodeId);
        const hasUnexecutedNodes = ctx.nodes.some(node =>
            !affectedNodes.has(node.id) && node.state === 'pending'
        );

        if (hasUnexecutedNodes) {
            return this.schedule(ctx, ctx);
        }

        this.validateUnaffectedNodesCompletion(ctx, affectedNodes);

        ctx.nodes.forEach(node => {
            if (affectedNodes.has(node.id)) {
                node.state = 'pending';
                node.error = undefined;
            }
        });

        const network = this.buildIncrementalNetwork(ctx, affectedNodes);

        ctx.state = 'running';
        return this.subscribeAndMerge(network, ctx, affectedNodes);
    }

    executeNodeIsolated(
        ctx: WorkflowGraphAst,
        nodeId: string
    ): Observable<WorkflowGraphAst> {
        this.flattenWorkflowStructure(ctx);

        const targetNode = ctx.nodes.find(n => n.id === nodeId);
        if (!targetNode) {
            throw new Error(`节点不存在: ${nodeId}`);
        }

        // 仅验证上游节点已完成，下游节点无关（不执行）
        this.validateUpstreamCompletion(ctx, nodeId);

        const affectedNodes = new Set<string>([nodeId]);

        // 重置目标节点状态
        targetNode.state = 'pending';
        targetNode.error = undefined;

        const network = this.buildIncrementalNetwork(ctx, affectedNodes);

        ctx.state = 'running';
        return this.subscribeAndMerge(network, ctx, affectedNodes);
    }

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

    private validateUnaffectedNodesCompletion(
        ctx: WorkflowGraphAst,
        affectedNodes: Set<string>
    ): void {
        const unfinishedNodes: string[] = [];

        for (const node of ctx.nodes) {
            if (affectedNodes.has(node.id)) {
                continue;
            }

            if (node.state !== 'success' && node.state !== 'fail') {
                unfinishedNodes.push(`${node.id} (${node.state})`);
            }
        }

        if (unfinishedNodes.length > 0) {
            throw new Error(
                `无法执行增量更新：以下节点尚未完成执行，但不在本次更新范围内：\n` +
                unfinishedNodes.join('\n') +
                `\n\n请先执行完整工作流确保所有节点完成，再进行增量调整。`
            );
        }
    }

    private findAffectedNodes(ast: WorkflowGraphAst, changedNodeId: string): Set<string> {
        const affected = new Set<string>();
        const visited = new Set<string>();

        const findDownstream = (nodeId: string) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            affected.add(nodeId);
            const downstreamEdges = ast.edges.filter(edge => edge.from === nodeId);
            for (const edge of downstreamEdges) {
                findDownstream(edge.to);
            }
        };

        findDownstream(changedNodeId);
        return affected;
    }

    /**
     * 获取有效的入口节点集合
     *
     * 策略：
     * 1. 找出所有没有入边的节点（自然入口节点）
     * 2. 如果 entryNodeIds 为空或未定义，返回所有自然入口节点
     * 3. 如果 entryNodeIds 已指定但不完整（缺少某些自然入口节点），自动补全
     *
     * 这样可以防止用户或前端忘记指定某些入口节点导致工作流无法执行
     */
    private getEffectiveEntryNodes(ast: WorkflowGraphAst): Set<string> {
        // 使用入度映射，避免重复计算
        const inDegrees = this.calculateInDegrees(ast);
        const naturalEntryNodes = new Set<string>();

        for (const [nodeId, degree] of inDegrees) {
            if (degree === 0) {
                naturalEntryNodes.add(nodeId);
            }
        }

        // 如果 entryNodeIds 为空或未定义，返回所有自然入口节点
        if (!ast.entryNodeIds || ast.entryNodeIds.length === 0) {
            return naturalEntryNodes;
        }

        // 检查 entryNodeIds 是否完整
        const specifiedEntryNodes = new Set(ast.entryNodeIds);
        const missingEntryNodes: string[] = [];

        for (const naturalEntry of naturalEntryNodes) {
            if (!specifiedEntryNodes.has(naturalEntry)) {
                missingEntryNodes.push(naturalEntry);
            }
        }

        // 如果有缺失的入口节点，自动补全并警告
        if (missingEntryNodes.length > 0) {
            console.warn(
                `[ReactiveScheduler] 检测到 entryNodeIds 不完整，自动补全缺失的入口节点:\n` +
                `  指定的入口节点: [${Array.from(specifiedEntryNodes).join(', ')}]\n` +
                `  自然入口节点: [${Array.from(naturalEntryNodes).join(', ')}]\n` +
                `  自动补全: [${missingEntryNodes.join(', ')}]`
            );

            // 合并指定的和缺失的入口节点
            return new Set([...specifiedEntryNodes, ...missingEntryNodes]);
        }

        // entryNodeIds 完整，直接使用
        return specifiedEntryNodes;
    }

    private buildIncrementalNetwork(
        ctx: WorkflowGraphAst,
        affectedNodes: Set<string>
    ): Map<string, Observable<INode>> {
        const network = new Map<string, Observable<INode>>();

        // 使用 Kahn 算法检测循环依赖，时间复杂度 O(V + E)
        const cycleResult = this.detectCycleWithKahn(ctx);
        if (cycleResult.hasCycle) {
            throw new Error(
                `检测到循环依赖:\n${cycleResult.cyclePath.join(' → ')}\n\n` +
                `工作流不支持循环结构，请使用 MQ 解耦：\n` +
                `1. 节点 A 输出 → MqPushAst 推送到队列\n` +
                `2. 节点 B 输入 ← MqPullAst 从队列拉取\n` +
                `3. 两个节点通过消息队列解耦，避免循环依赖`
            );
        }

        // 获取有效的入口节点集合（自动补全缺失的入口节点）
        const effectiveEntryNodes = this.getEffectiveEntryNodes(ctx);

        const buildNode = (nodeId: string): Observable<INode> => {
            // 已构建：直接返回
            if (network.has(nodeId)) {
                return network.get(nodeId)!;
            }

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

                // 使用有效的入口节点集合判断
                const isEntryNode = effectiveEntryNodes.has(nodeId);

                if (isEntryNode) {
                    stream = this.createEntryNodeStream(node, ctx);
                } else {
                    stream = this._createNode(node, incomingEdges, network, ctx);
                }
            } else {
                // 未受影响节点：检查状态，决定是否传递数据
                if (node.state === 'fail') {
                    stream = EMPTY;
                } else if (node.state === 'success') {
                    // 成功节点：直接发射历史结果，下游通过 BehaviorSubject 或属性提取数据
                    stream = of(node).pipe(
                        shareReplay({ bufferSize: Infinity, refCount: true })
                    );
                } else {
                    // pending 或其他状态（通常是下游未执行节点）
                    // executeNodeIsolated 场景下，下游节点可能未执行，返回空流阻止对它们的处理
                    stream = EMPTY;
                }
            }

            network.set(nodeId, stream);
            return stream;
        };

        // 为所有节点构建流（但只有受影响节点会重新执行）
        ctx.nodes.forEach(node => buildNode(node.id));

        return network;
    }
    private _createNodeInputObservable(
        node: INode,
        incomingEdges: IEdge[],
        network: Map<string, Observable<INode>>,
        ctx: WorkflowGraphAst
    ): Observable<any> {
        if (incomingEdges.length === 0) {
            return of({});
        }

        const edgesBySource = new Map<string, IEdge[]>();
        incomingEdges.forEach(edge => {
            if (!edgesBySource.has(edge.from)) {
                edgesBySource.set(edge.from, []);
            }
            edgesBySource.get(edge.from)!.push(edge);
        });

        const edgeMode = this.detectEdgeMode(incomingEdges);

        if (edgeMode === EdgeMode.MERGE) {
            const sourceStreams = Array.from(edgesBySource.entries()).map(([sourceId, edges]) => {
                return this.createSingleSourceStream(sourceId, edges, network, node);
            });

            if (sourceStreams.length === 0) {
                return EMPTY;
            } else if (sourceStreams.length === 1) {
                return sourceStreams[0]!;
            } else {
                return merge(...sourceStreams);
            }
        }

        const requiredProperties = this.getRequiredInputProperties(node);
        const hasUpstreamConditionalEdges = Array.from(edgesBySource.keys()).some(sourceId => {
            const sourceUpstreamEdges = ctx.edges.filter(e => e.to === sourceId);
            return sourceUpstreamEdges.some(e => e.condition !== undefined);
        });

        const completeCombinations = this.findCompleteSourceCombinations(
            requiredProperties,
            edgesBySource,
            hasUpstreamConditionalEdges
        );

        const combinationStreams = completeCombinations.map(sourceIds => {
            if (sourceIds.length === 1) {
                return this.createSingleSourceStream(
                    sourceIds[0]!,
                    edgesBySource.get(sourceIds[0]!)!,
                    network,
                    node
                );
            } else {
                const groupedStreams = sourceIds.map(sourceId => {
                    return this.createSingleSourceStream(
                        sourceId,
                        edgesBySource.get(sourceId)!,
                        network,
                        node
                    );
                });
                if (groupedStreams.length === 0) {
                    return EMPTY;
                }
                return this.combineGroupedStreamsByMode(groupedStreams, incomingEdges, node, sourceIds);
            }
        });

        if (combinationStreams.length === 0) {
            return EMPTY;
        } else if (combinationStreams.length === 1) {
            return combinationStreams[0]!;
        } else {
            return merge(...combinationStreams);
        }
    }

    private getRequiredInputProperties(node: INode): Set<string> {
        const properties = new Set<string>();

        // 使用缓存的编译器
        if (!isNode(node)) {
            node = this.compiler.compile(node);
        }
        if (!isNode(node)) {
            throw new Error(`getRequiredInputProperties error: ${this.ERRORS.INVALID_NODE}`);
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
        throw new Error(`get node metadata failed`);
    }

    private getInputMetadataMap(node: INode): Map<string | symbol, InputMetadata> {
        // 检查缓存
        const nodeType = node.type;
        if (this.inputMetadataCache.has(nodeType)) {
            return this.inputMetadataCache.get(nodeType)!;
        }

        if (!isNode(node)) {
            node = this.compiler.compile(node);
        }
        if (!isNode(node)) {
            throw new Error(`getRequiredInputProperties error: ${this.ERRORS.INVALID_NODE}`);
        }
        const metadataMap = new Map<string | symbol, InputMetadata>();

        // 🔧 优先使用编译后的 metadata 字段
        node.metadata!.inputs.forEach(input => {
            metadataMap.set(input.property, input as any);
        });

        // 缓存结果
        this.inputMetadataCache.set(nodeType, metadataMap);
        return metadataMap;
    }

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
                // IS_MULTI 模式（无 IS_BUFFER）：创建新数组而非追加
                // 避免 structuredClone 克隆的数组不可扩展问题
                const existingValue = (nodeInstance as any)[key];
                const existingArray = Array.isArray(existingValue) ? existingValue : [];

                // 创建新数组，合并现有值和新值
                if (Array.isArray(value)) {
                    (nodeInstance as any)[key] = [...existingArray, ...value];
                } else {
                    (nodeInstance as any)[key] = [...existingArray, value];
                }
            } else {
                // 单值模式：直接赋值
                (nodeInstance as any)[key] = value;
            }
        });
    }

    private getInputDefaultValues(node: INode): Record<string, any> {
        if (!isNode(node)) {
            node = this.compiler.compile(node);
        }
        if (!isNode(node)) {
            throw new Error(`getInputDefaultValues error: ${this.ERRORS.INVALID_NODE}`);
        }
        const defaults: Record<string, any> = {};

        // 🔧 优先使用编译后的 metadata 字段
        node.metadata!.inputs.forEach(input => {
            const propKey = String(input.property);
            const isMulti = hasMultiMode(input.mode);

            // 优先使用装饰器的 defaultValue
            if (input.defaultValue !== undefined) {
                defaults[propKey] = input.defaultValue;
            } else {
                const currentValue = (node as any)[propKey];
                // IS_MULTI 模式：始终初始化为空数组，避免累积旧数据
                if (isMulti) {
                    defaults[propKey] = [];
                } else if (currentValue !== undefined) {
                    defaults[propKey] = currentValue;
                }
            }
        });
        return defaults;
    }

    private findCompleteSourceCombinations(
        requiredProperties: Set<string>,
        edgesBySource: Map<string, IEdge[]>,
        hasUpstreamConditionalEdges: boolean = false
    ): string[][] {
        const combinations: string[][] = [];
        const incompleteSources: string[] = [];

        // 如果没有必填属性且有多个源，检查是否有条件边
        if (requiredProperties.size === 0 && edgesBySource.size > 1) {
            const allSourceIds = Array.from(edgesBySource.keys());

            // 如果有上游条件边或需要强制分离源（如 MERGE 模式），每个源单独作为一个组合
            if (hasUpstreamConditionalEdges) {
                return allSourceIds.map(id => [id]);
            }

            // 否则返回所有源的组合（使用 COMBINE_LATEST）
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

    private isComplete(provided: Set<string>, required: Set<string>): boolean {
        if (required.size === 0) return true; // 无输入要求

        for (const prop of required) {
            if (!provided.has(prop)) {
                return false;
            }
        }
        return true;
    }

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

        // 检查边模式：MERGE 模式下不应该去重
        const edgeMode = this.detectEdgeMode(edges);
        const shouldDedup = edgeMode !== EdgeMode.MERGE;

        // 创建数据流：优先使用 BehaviorSubject 模式，回退到旧模式
        let dataStream = this.createDataStreamFromSource(sourceStream, edges, targetNode);

        // 只在非 MERGE 模式下使用去重
        if (shouldDedup) {
            dataStream = dataStream.pipe(
                // 去重：防止同一个源在连续的发射中传递相同的属性值
                distinctUntilChanged((prev, curr) => {
                    try {
                        return JSON.stringify(prev) === JSON.stringify(curr);
                    } catch {
                        return false;
                    }
                })
            );
        }

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
     * 从源流创建数据流
     *
     * 支持两种模式：
     * 1. BehaviorSubject 模式（新）：直接订阅 @Output BehaviorSubject
     * 2. 旧模式（兼容）：监听节点 success 状态，从属性提取值
     */
    private createDataStreamFromSource(
        sourceStream: Observable<INode>,
        edges: IEdge[],
        targetNode: INode
    ): Observable<any> {
        const edgeStreams = edges.map(edge => {
            return sourceStream.pipe(
                filter(ast => ast.state === 'running' || ast.state === 'success'),
                concatMap(ast => {
                    if (edge.fromProperty) {
                        const outputValue = (ast as any)[edge.fromProperty];

                        if (isBehaviorSubject(outputValue)) {
                            return this.createBehaviorSubjectStream(outputValue, edge, ast, targetNode);
                        }
                    }

                    if (ast.state === 'success') {
                        return this.createLegacyValueStream(ast, edge, targetNode);
                    }

                    return EMPTY;
                })
            );
        });

        if (edgeStreams.length === 0) {
            return EMPTY;
        }

        if (edgeStreams.length === 1) {
            return edgeStreams[0]!;
        }

        return merge(...edgeStreams).pipe(
            map(data => data)
        );
    }

    /**
     * 从 BehaviorSubject 创建数据流
     *
     * 使用 ROUTE_SKIPPED 标记区分：
     * - undefined: 初始值，还没准备好，需要等待
     * - ROUTE_SKIPPED: 明确表示此路由分支不激活，直接返回 EMPTY
     */
    private createBehaviorSubjectStream(
        subject: BehaviorSubject<any>,
        edge: IEdge,
        sourceAst: INode,
        targetNode: INode
    ): Observable<any> {
        const currentValue = subject.getValue();

        // 🔑 检测 ROUTE_SKIPPED 标记：这条路不走
        if (isRouteSkipped(currentValue)) {
            return EMPTY;
        }

        // 条件边检查
        if (edge.condition) {
            const conditionValue = (sourceAst as any)[edge.condition.property];
            if (conditionValue !== edge.condition.value) {
                return EMPTY;
            }
        }

        // 判断是否需要跳过初始空值（等待真实数据）
        const isEmptyInitialValue =
            currentValue === '' ||
            currentValue === null ||
            currentValue === undefined ||
            (Array.isArray(currentValue) && currentValue.length === 0);

        const stream$ = subject.asObservable();

        return (isEmptyInitialValue ? stream$.pipe(skip(1)) : stream$).pipe(
            take(1),
            // 过滤掉 ROUTE_SKIPPED（防止订阅后才设置的情况）
            filter(value => !isRouteSkipped(value)),
            // 🔑 发射 OUTPUT_EMIT 事件：数据真正流向下游时触发
            tap(value => {
                if (edge.fromProperty) {
                    this.eventBus.emitOutputEmit(
                        sourceAst.id,
                        edge.fromProperty,
                        value,
                        (sourceAst as any).workflowId
                    );
                }
            }),
            map(value => {
                if (edge.toProperty) {
                    return { [edge.toProperty]: value };
                }
                return value;
            })
        );
    }

    /**
     * 旧模式：从节点属性提取值（兼容现有代码）
     */
    private createLegacyValueStream(
        ast: INode,
        edge: IEdge,
        targetNode: INode
    ): Observable<any> {
        // 检测 ROUTE_SKIPPED 标记（支持 BehaviorSubject 及其序列化形式）
        if (edge.fromProperty) {
            const rawValue = (ast as any)[edge.fromProperty];
            if (isRouteSkipped(rawValue)) {
                return EMPTY;
            }
        }

        // 条件检查
        if (edge.condition) {
            const value = (ast as any)[edge.condition.property];
            if (value !== edge.condition.value) {
                return EMPTY;
            }
        }

        // 数据提取：使用 extractSubjectValue 处理 BehaviorSubject 及其序列化形式
        let value: any;
        if (hasDataMapping(edge) && edge.fromProperty) {
            const rawValue = this.resolveProperty(ast, edge.fromProperty);
            value = extractSubjectValue(rawValue);
        } else {
            value = {};
        }

        // 映射到目标属性
        if (edge.toProperty) {
            return of({ [edge.toProperty]: value });
        }

        return of(value);
    }

    private _createNode(
        node: INode,
        incomingEdges: IEdge[],
        network: Map<string, Observable<INode>>,
        ctx: any
    ): Observable<INode> {
        const input$ = this._createNodeInputObservable(node, incomingEdges, network, ctx);
        const defaults = this.getInputDefaultValues(node);

        return input$.pipe(
            concatMap(inputs => {
                const nodeInstance = this.cloneNode(node);
                Object.assign(nodeInstance, defaults);

                const clearedBufferInputs = this.getClearedMultiBufferInputs(nodeInstance);
                Object.assign(nodeInstance, clearedBufferInputs);

                this.assignInputsToNodeInstance(nodeInstance, inputs);

                return this.executeNode(nodeInstance, ctx);
            }),
            catchError(error => {
                console.error(`[节点] ${node.id} 出错`, error);

                const failedNode = this.cloneNode(node);
                failedNode.state = 'fail';
                failedNode.error = error;
                return of(failedNode);
            }),
            shareReplay({ bufferSize: Infinity, refCount: false })
        );
    }
    private buildStreamNetwork(
        ast: WorkflowGraphAst,
        parent: WorkflowGraphAst
    ): Map<string, Observable<INode>> {
        const network = new Map<string, Observable<INode>>();
        const building = new Set<string>();

        // 获取有效的入口节点集合（自动补全缺失的入口节点）
        const effectiveEntryNodes = this.getEffectiveEntryNodes(ast);

        const buildNode = (nodeId: string): Observable<INode> => {
            if (network.has(nodeId)) {
                return network.get(nodeId)!;
            }

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

            incomingEdges.forEach(edge => buildNode(edge.from));

            // 使用有效的入口节点集合判断
            const isEntryNode = effectiveEntryNodes.has(nodeId);

            let stream$: Observable<INode>;
            if (isEntryNode) {
                stream$ = this.createEntryNodeStream(node, parent);
            } else {
                stream$ = this._createNode(node, incomingEdges, network, parent);
            }

            network.set(nodeId, stream$);
            building.delete(nodeId);

            return stream$;
        };

        ast.nodes.forEach(node => buildNode(node.id));

        return network;
    }
    private createEntryNodeStream(node: INode, parent: WorkflowGraphAst): Observable<INode> {
        return this.executeNode(node, parent).pipe(
            subscribeOn(asyncScheduler),
            shareReplay({ bufferSize: Infinity, refCount: false })
        );
    }
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

        // ✨ 使用 concatLatestFrom 替代 withLatestFrom，避免过早求值陷阱
        // withLatestFrom 在订阅时立即取值，如果副流未发射，主流会被阻塞
        // concatLatestFrom 延迟到主流发射时才取值，保证副流已就绪
        return primaryStream.pipe(
            concatLatestFrom(() => otherStreams),
            map(([primary, ...others]) => Object.assign({}, primary, ...others))
        );
    }
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

        // 检测条件边或路由边：使用 MERGE 模式（任一源发射即触发）
        const hasConditionalOrRouterEdges = edges.some(e => {
            // 有条件的边
            if (e.condition) return true;

            // 来自路由节点的边（需要检查源节点的输出元数据）
            // 注意：这里我们无法直接访问源节点，但可以通过检查多个来自同一源的边来推断
            return false;
        });

        if (hasConditionalOrRouterEdges) {
            return EdgeMode.MERGE;
        }

        // 默认 COMBINE_LATEST（等待所有上游就绪）
        return EdgeMode.COMBINE_LATEST;
    }
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
    private executeNode(node: INode, parent: WorkflowGraphAst): Observable<INode> {
        // 获取节点的错误处理配置
        const errorConfig = getErrorConfigFromNode(node);

        // 执行节点并应用统一的错误处理策略
        const execution$ = executeAst(node, parent);

        return createDefaultErrorHandler(
            execution$,
            node,
            errorConfig,
            this.eventBus
        ).pipe(
            // 如果错误处理器返回失败节点，捕获并返回
            catchError(error => {
                // error 可能是包装后的失败节点或原始错误
                if (error && typeof error === 'object' && 'state' in error) {
                    // 已经是包装的节点对象
                    return of(error as INode);
                }
                // 原始错误，包装为失败节点
                const failedNode = { ...node, state: 'fail' as const, error };
                return of(failedNode);
            })
        );
    }
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
            return of(finalizeWorkflowReducer(ast));
        }

        // 使用 scan + reducer 模式累积状态变更
        const allStreams$ = merge(...streamsToSubscribe).pipe(
            // ✨ 使用 tapResponse 保护事件发射：副作用失败不应中断主流
            tapResponse({
                next: (updatedNode) => {
                    // 移除 emitting 状态依赖，只关心最终状态
                    if (updatedNode.state === 'success') {
                        this.eventBus.emitNodeSuccess(updatedNode.id, updatedNode, ast.id);
                    } else if (updatedNode.state === 'fail') {
                        this.eventBus.emitNodeFail(updatedNode.id, updatedNode.error, ast.id);
                    } else if (updatedNode.state === 'running') {
                        // running 状态可用于 UI 显示进度
                        this.eventBus.emitNodeEmit(updatedNode.id, updatedNode, ast.id);
                    }
                },
                error: (err) => {
                    console.error('[事件发射失败，但不影响工作流执行]', err);
                }
            }),
            // 使用 reducer 累积状态（借鉴 @sker/store 的 scan + reducer 模式）
            scan(
                (workflow, updatedNode) => updateNodeReducer(workflow, {
                    nodeId: updatedNode.id,
                    updates: updatedNode,
                }),
                ast // seed
            ),
            catchError(error => {
                console.error('[subscribeAndMerge] 执行错误:', error);
                return of(failWorkflowReducer(ast, error));
            })
        );

        // 流完成后应用 finalizeWorkflowReducer
        // 使用 takeLast(1) 获取 scan 的最终累积状态，defaultIfEmpty 确保空流也有值
        return allStreams$.pipe(
            takeLast(1),
            map((finalWorkflow: WorkflowGraphAst | typeof ast) => {
                // 如果流为空，使用初始 ast
                const workflow = finalWorkflow as WorkflowGraphAst;

                // 【调试日志】输出失败节点信息
                const failedNodes = workflow.nodes.filter((n: INode) => n.state === 'fail');
                if (failedNodes.length > 0) {
                    console.error('[subscribeAndMerge] 发现失败节点:', failedNodes.map((n: INode) => ({
                        id: n.id,
                        type: n.type,
                        state: n.state,
                        error: n.error,
                        isGroupNode: (n as any).isGroupNode
                    })));
                }

                // 应用最终化 reducer
                const result = finalizeWorkflowReducer(workflow);

                // 【新增】提取结束节点输出（如果工作流成功完成且指定了 endNodeIds）
                if (result.state === 'success' && result.endNodeIds && result.endNodeIds.length > 0) {
                    const outputs = extractEndNodeOutputs(result.nodes, result.endNodeIds);

                    // 如果有输出，附加到工作流实例上（按照 nodeId.property 格式）
                    if (Object.keys(outputs).length > 0) {
                        Object.assign(result, outputs);
                    }
                }

                // 恢复 GroupNode 的嵌套结构（确保 UI 层和保存时的数据正确）
                this.restoreGroupStructure(result);

                return result;
            })
        );
    }

    private getOutputMetadata(ast: INode, propertyKey: string): OutputMetadata | undefined {
        // 优先从编译后的 metadata.outputs 中查找（包含动态添加的输出）
        if (ast.metadata?.outputs) {
            const metaOutput = ast.metadata.outputs.find(
                output => output.property === propertyKey
            )
            if (metaOutput) {
                return metaOutput as unknown as OutputMetadata
            }
        }

        // 回退：从装饰器元数据中查找
        const ctor = resolveConstructor(ast)
        const outputs = root.get(OUTPUT, [])
        return outputs.find(
            meta => meta.target === ctor && meta.propertyKey === propertyKey
        )
    }

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
    }
}
