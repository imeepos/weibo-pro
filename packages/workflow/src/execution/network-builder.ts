import { Injectable, root } from '@sker/core';
import {
    Observable,
    Subject,
    combineLatest,
    zip,
    merge,
    BehaviorSubject,
    EMPTY,
    Subscription,
    OperatorFunction,
} from 'rxjs';
import {
    map,
    switchMap,
    withLatestFrom,
    tap,
    shareReplay,
    finalize,
    catchError,
    startWith,
    concatMap,
    filter,
} from 'rxjs/operators';
import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, EdgeMode, isBehaviorSubject, isNode } from '../types';
import { NodeExecutor } from './node-executor';
import { Compiler } from '../compiler';

/**
 * 工作流事件类型
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

interface EdgeGroup {
    nodeId: string;
    edges: IEdge[];
    sources: Map<string, BehaviorSubject<any>>;
}

/**
 * 网络构建器 - 将工作流转换为反应式事件流操作符
 *
 * 设计哲学：纯流式架构
 * - buildNetwork() 返回一个 RxJS 操作符 (OperatorFunction)
 * - 所有变化（节点状态、输出、完成）都通过事件发射
 * - 可以通过 pipe() 链式调用：input$.pipe(buildNetwork(ast, ctx))
 *
 * 事件流结构：
 * ┌─────────────────────────────────────┐
 * │  Observable<WorkflowEvent>          │
 * │    ├─ node_state: 节点状态变化      │
 * │    ├─ output_emit: 输出发射        │
 * │    ├─ workflow_complete: 完成      │
 * │    └─ workflow_error: 错误         │
 * └─────────────────────────────────────┘
 */
@Injectable()
export class NetworkBuilder {
    private subscriptions = new Map<string, Subscription>();

    constructor(private nodeExecutor: NodeExecutor) { }

    /**
     * 构建完整的工作流网络操作符（不执行）
     *
     * 作为 RxJS 操作符使用：
     * ```typescript
     * input$.pipe(buildNetwork(ast, ctx))
     * ```
     *
     * 步骤：
     * 1. 初始化所有节点的 @Output BehaviorSubject
     * 2. 为每个节点创建执行 Observable 和输入 Subject
     * 3. 按输入节点分组收集边，构建边流
     * 4. 为每个节点的边流创建数据连接
     * 5. 将外部输入流连接到起始节点（入度为 0）
     * 6. 合并所有节点的事件流，形成完整网络
     *
     * 返回值：OperatorFunction<any, WorkflowEvent>
     * - 接收外部输入流
     * - 返回工作流事件流
     * - 只有 subscribe 时才真正执行
     */
    buildNetwork(
        ast: WorkflowGraphAst,
        ctx: WorkflowGraphAst
    ): OperatorFunction<any, WorkflowEvent> {
        return (input$: Observable<any>) => {
            // Step 1: 初始化所有节点的 @Output BehaviorSubject
            this.initializeOutputSubjects(ast);

            // Step 2: 为每个节点创建输入 Subject 和 Observable
            const nodeObservables = new Map<string, Observable<WorkflowEvent>>();
            const inputSubjects = new Map<string, Subject<any>>();
            const inDegrees = this.calculateInDegrees(ast);

            ast.nodes.forEach(node => {
                const input$ = new Subject<any>();
                inputSubjects.set(node.id, input$);

                const nodeObs$ = this.buildNodeObservable(node, input$, ast, ctx);
                nodeObservables.set(node.id, nodeObs$);
            });

            // Step 3: 按目标节点分组收集边
            const edgeGroups = this.groupEdgesByTarget(ast);

            // Step 4: 为每个节点的边创建数据连接
            edgeGroups.forEach(group => {
                this.connectEdgesToNode(group, ast, inputSubjects);
            });

            // Step 5: 将外部输入流连接到起始节点（入度为 0）
            this.connectInputToStartNodes(ast, inDegrees, inputSubjects, input$);

            // Step 6: 合并所有节点的事件流
            return this.mergeNodeEventStreams(ast, nodeObservables, inputSubjects).pipe(
                finalize(() => {
                    // 工作流完成后关闭所有输入Subjects，确保流能正确完成
                    inputSubjects.forEach(subject => {
                        if (!subject.closed) {
                            subject.complete();
                        }
                    });
                    // 关闭所有输出Subjects，确保边模式能正确完成
                    this.completeOutputSubjects(ast);
                    this.cleanup();
                })
            );
        };
    }

    /**
     * 清理订阅，防止内存泄漏
     */
    cleanup(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions.clear();
    }

    /**
     * 创建节点执行操作符
     *
     * 将节点执行逻辑封装为操作符，可以在任何流上使用：
     * ```typescript
     * input$.pipe(
     *   networkBuilder.createNodeExecutor(node, ast, ctx),
     *   map(event => event.data)
     * )
     * ```
     */
    createNodeExecutor(
        node: INode,
        ast: WorkflowGraphAst,
        ctx: WorkflowGraphAst
    ): OperatorFunction<any, WorkflowEvent> {
        return (input$: Observable<any>) => {
            return this.buildNodeObservable(node, input$, ast, ctx);
        };
    }
    /**
     * 为单个节点构建事件流（内部实现）
     *
     * 输入：
     * - node: 节点 AST
     * - input$: 输入流（来自前端或上游节点的 @Output）
     *
     * 输出：
     * - Observable<WorkflowEvent>
     *   - 流式发射节点的所有事件（状态变化 + 输出发射）
     *   - 每次节点状态更新时，同时发射输出事件
     *
     * 核心机制：
     * 1. 当 input$ 发射时，触发节点执行
     * 2. 节点执行返回 Observable<INode>（可多次发射）
     * 3. 将每次 INode 发射转换为事件流：
     *    a. 发射 node_state 事件
     *    b. 提取并发射 output_emit 事件
     */
    private buildNodeObservable(
        node: INode,
        input$: Observable<any>,
        ast: WorkflowGraphAst,
        ctx: WorkflowGraphAst
    ): Observable<WorkflowEvent> {
        return input$.pipe(
            switchMap(inputData => {
                // 将输入数据赋给节点
                if (inputData) {
                    Object.assign(node, inputData);
                }

                // 执行节点并转换为事件流
                return this.nodeExecutor.execute(node, ast, ctx).pipe(
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

                        console.log(`[NetworkBuilder] 节点=${updatedNode.id} 发射 ${events.length} 个事件`);
                        return events;
                    }),
                    catchError(error => {
                        console.error(`[NetworkBuilder] 节点 ${node.id} 执行失败:`, error);
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
     * 从节点提取输出事件
     * 检查所有 @Output BehaviorSubject，提取非空值
     */
    private extractOutputEvents(node: INode): OutputEmitEvent[] {
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
     * 计算各节点的入度（指向该节点的边数）
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
     * 按目标节点分组收集边
     * 减少重复遍历边集合
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
     * 创建边流合并操作符
     *
     * 将多条边的流合并为一个流，支持多种合并模式：
     * - MERGE: 任意源发射就传递
     * - ZIP: 等待所有源同步发射
     * - COMBINE_LATEST: 取各源最新值组合
     * - WITH_LATEST_FROM: 主流驱动，取其他源的最新值
     *
     * 使用示例：
     * ```typescript
     * const edgeSources = [
     *   source1$.pipe(map(v => ({ key1: v }))),
     *   source2$.pipe(map(v => ({ key2: v })))
     * ];
     *
     * input$.pipe(
     *   createEdgeMerger(EdgeMode.COMBINE_LATEST, edgeSources, toProperties)
     * )
     * ```
     */
    createEdgeMerger(
        mode: EdgeMode,
        sources: Observable<any>[],
        toProperties: string[]
    ): OperatorFunction<any, any> {
        return (input$: Observable<any>) => {
            switch (mode) {
                case EdgeMode.MERGE:
                    return merge(...sources);
                case EdgeMode.ZIP:
                    return zip(...sources).pipe(
                        map(values => {
                            const combined = {} as any;
                            values.forEach((value, idx) => {
                                combined[toProperties[idx]!] = value;
                            });
                            return combined;
                        })
                    );
                case EdgeMode.COMBINE_LATEST:
                    return combineLatest(sources).pipe(
                        map(values => {
                            const combined = {} as any;
                            values.forEach((value, idx) => {
                                combined[toProperties[idx]!] = value;
                            });
                            return combined;
                        })
                    );
                case EdgeMode.WITH_LATEST_FROM:
                    // 第一个作为主流（简化实现，复杂逻辑在 connectEdgesToNode 中）
                    const primarySource = sources[0]!;
                    const otherSources = sources.slice(1);
                    return primarySource.pipe(
                        withLatestFrom(...otherSources),
                        map(([primaryValue, ...otherValues]) => {
                            const combined = { [toProperties[0]!]: primaryValue } as any;
                            otherValues.forEach((value, idx) => {
                                combined[toProperties[idx + 1]!] = value;
                            });
                            return combined;
                        })
                    );
                default:
                    return merge(...sources);
            }
        };
    }
    /**
     * 为目标节点连接所有输入边（内部实现）
     * 支持多种流合并模式
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
                const sub = source.asObservable().subscribe(value => {
                    targetSubject.next({ [edge.toProperty!]: value });
                });
                this.subscriptions.set(`${group.nodeId}:0`, sub);
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
            case EdgeMode.WITH_LATEST_FROM:
                this.connectWithLatestFromMode(group, targetSubject);
                break;
        }
    }

    /**
     * MERGE 模式连接：任意源发射就传递
     */
    private connectMergeMode(group: EdgeGroup, targetSubject: Subject<any>): void {
        const sources = group.edges.map(edge => {
            const source = group.sources.get(`${edge.from}:${edge.fromProperty}`);
            return source ? source.asObservable() : EMPTY;
        });

        const sub = merge(...sources).subscribe(value => {
            targetSubject.next(value);
        });
        this.subscriptions.set(group.nodeId, sub);
    }

    /**
     * ZIP 模式连接：等待所有源同步发射
     */
    private connectZipMode(group: EdgeGroup, targetSubject: Subject<any>): void {
        const sources = group.edges.map(edge => {
            const source = group.sources.get(`${edge.from}:${edge.fromProperty}`);
            return source ? source.asObservable() : EMPTY;
        });

        const sub = zip(...sources).subscribe(values => {
            const combined = {} as any;
            group.edges.forEach((edge, idx) => {
                combined[edge.toProperty!] = values[idx];
            });
            targetSubject.next(combined);
        });
        this.subscriptions.set(group.nodeId, sub);
    }

    /**
     * COMBINE_LATEST 模式连接：取各源最新值组合
     */
    private connectCombineLatestMode(group: EdgeGroup, targetSubject: Subject<any>): void {
        const sources = group.edges.map(edge => {
            const source = group.sources.get(`${edge.from}:${edge.fromProperty}`);
            return source ? source.asObservable() : EMPTY;
        });

        const sub = combineLatest(sources).subscribe(values => {
            const combined = {} as any;
            group.edges.forEach((edge, idx) => {
                combined[edge.toProperty!] = values[idx];
            });
            targetSubject.next(combined);
        });
        this.subscriptions.set(group.nodeId, sub);
    }

    /**
     * WITH_LATEST_FROM 模式连接：主流驱动，取其他源的最新值
     */
    private connectWithLatestFromMode(group: EdgeGroup, targetSubject: Subject<any>): void {
        const primaryEdge = group.edges.find(e => e.isPrimary) ?? group.edges[0]!;
        const primarySource = group.sources.get(`${primaryEdge.from}:${primaryEdge.fromProperty}`);

        if (!primarySource) return;

        const otherSources = group.edges
            .filter(e => e !== primaryEdge)
            .map(e => group.sources.get(`${e.from}:${e.fromProperty}`))
            .filter((s): s is BehaviorSubject<any> => !!s);

        if (otherSources.length === 0) {
            // 只有主流，直接连接
            const sub = primarySource.asObservable().subscribe(value => {
                targetSubject.next({ [primaryEdge.toProperty!]: value });
            });
            this.subscriptions.set(group.nodeId, sub);
            return;
        }

        const sub = primarySource
            .asObservable()
            .pipe(withLatestFrom(...otherSources.map(s => s.asObservable())))
            .subscribe(([primaryValue, ...otherValues]) => {
                const combined = { [primaryEdge.toProperty!]: primaryValue } as any;

                // 将其他源的值按顺序赋给对应的边
                let otherValueIndex = 0;
                group.edges.forEach(edge => {
                    if (edge === primaryEdge) return; // 跳过主流

                    const otherSource = group.sources.get(`${edge.from}:${edge.fromProperty}`);
                    if (otherSource && otherValueIndex < otherValues.length) {
                        combined[edge.toProperty!] = otherValues[otherValueIndex];
                        otherValueIndex++;
                    }
                });

                targetSubject.next(combined);
            });

        this.subscriptions.set(group.nodeId, sub);
    }

    /**
     * 将外部输入流连接到起始节点
     * 外部输入流的数据会被分发给所有入度为 0 的起始节点
     */
    private connectInputToStartNodes(
        ast: WorkflowGraphAst,
        inDegrees: Map<string, number>,
        inputSubjects: Map<string, Subject<any>>,
        externalInput$: Observable<any>
    ): void {
        const startNodes = ast.nodes.filter(node => (inDegrees.get(node.id) ?? 0) === 0);

        if (startNodes.length === 0) {
            console.warn('[NetworkBuilder] 未找到起始节点（入度为 0 的节点）');
            return;
        }

        if (startNodes.length === 1) {
            // 只有一个起始节点，直接连接
            const startNode = startNodes[0]!;
            const subject = inputSubjects.get(startNode.id);
            if (subject) {
                const sub = externalInput$.subscribe(value => {
                    subject.next(value);
                });
                this.subscriptions.set(`${startNode.id}:external`, sub);
            }
        } else {
            // 多个起始节点，将外部输入分发给所有起始节点
            const sub = externalInput$.subscribe(value => {
                startNodes.forEach(node => {
                    const subject = inputSubjects.get(node.id);
                    if (subject) {
                        subject.next(value);
                    }
                });
            });
            this.subscriptions.set('external:start-nodes', sub);
        }
    }

    /**
     * 创建事件流合并操作符
     *
     * 将多个节点的事件流合并为一个流，并在结束时发射完成事件
     *
     * 使用示例：
     * ```typescript
     * const nodeStreams = [
     *   node1$.pipe(createNodeExecutor(node1, ast, ctx)),
     *   node2$.pipe(createNodeExecutor(node2, ast, ctx))
     * ];
     *
     * merge(...nodeStreams).pipe(
     *   tap(event => console.log('事件：', event))
     * )
     *
     * // 或者使用辅助方法
     * const allEvents$ = networkBuilder.mergeNodeStreams(nodeStreams, 'workflow-1');
     * ```
     */
    mergeNodeStreams(
        nodeStreams: Observable<WorkflowEvent>[],
        workflowId?: string
    ): Observable<WorkflowEvent> {
        if (nodeStreams.length === 0) {
            return new Observable<WorkflowEvent>(obs => {
                obs.next({
                    type: 'workflow_complete',
                    workflowId
                });
                obs.complete();
            });
        }

        return merge(
            ...nodeStreams,
            new Observable<WorkflowEvent>(obs => {
                obs.next({
                    type: 'workflow_complete',
                    workflowId
                });
                obs.complete();
            })
        ).pipe(
            finalize(() => {
                console.log(`[NetworkBuilder] 工作流 ${workflowId} 执行完成`);
            })
        );
    }
    /**
     * 合并所有节点的事件流（内部实现）
     *
     * 返回一个"聚合" Observable，代表整个工作流的事件流
     * 最后发射一个 workflow_complete 事件
     */
    private mergeNodeEventStreams(
        ast: WorkflowGraphAst,
        nodeObservables: Map<string, Observable<WorkflowEvent>>,
        inputSubjects: Map<string, Subject<any>>
    ): Observable<WorkflowEvent> {
        const allNodeStreams = Array.from(nodeObservables.values());

        if (allNodeStreams.length === 0) {
            return new Observable<WorkflowEvent>(obs => {
                obs.next({
                    type: 'workflow_complete',
                    workflowId: ast.id
                });
                obs.complete();
            });
        }

        return merge(...allNodeStreams, new Observable<WorkflowEvent>(obs => {
            // 流结束时发射完成事件
            obs.next({
                type: 'workflow_complete',
                workflowId: ast.id
            });
            obs.complete();
        })).pipe(
            finalize(() => {
                console.log(`[NetworkBuilder] 工作流 ${ast.id} 执行完成`);
            })
        );
    }

    /**
     * 创建节点状态过滤操作符
     *
     * 过滤出指定节点的状态事件
     *
     * 使用示例：
     * ```typescript
     * workflow$.pipe(
     *   filterNodeState('node-1'),
     *   map(event => event.data)
     * )
     * ```
     */
    filterNodeState(nodeId: string): OperatorFunction<WorkflowEvent, NodeStateEvent> {
        return (input$: Observable<WorkflowEvent>) => {
            return input$.pipe(
                filter(event => event.type === 'node_state' && event.nodeId === nodeId),
                map(event => event as NodeStateEvent)
            );
        };
    }

    /**
     * 创建输出事件过滤操作符
     *
     * 过滤出指定节点和属性的输出事件
     *
     * 使用示例：
     * ```typescript
     * workflow$.pipe(
     *   filterOutputEmit('node-1', 'result'),
     *   map(event => event.value)
     * )
     * ```
     */
    filterOutputEmit(nodeId: string, property?: string): OperatorFunction<WorkflowEvent, OutputEmitEvent> {
        return (input$: Observable<WorkflowEvent>) => {
            return input$.pipe(
                filter(event => {
                    if (event.type !== 'output_emit') return false;
                    if (event.nodeId !== nodeId) return false;
                    if (property && event.property !== property) return false;
                    return true;
                }),
                map(event => event as OutputEmitEvent)
            );
        };
    }

    /**
     * 创建工作流完成事件过滤操作符
     *
     * 过滤出工作流完成事件
     *
     * 使用示例：
     * ```typescript
     * workflow$.pipe(
     *   filterWorkflowComplete(),
     *   tap(() => console.log('工作流完成！'))
     * )
     * ```
     */
    filterWorkflowComplete(): OperatorFunction<WorkflowEvent, WorkflowCompleteEvent> {
        return (input$: Observable<WorkflowEvent>) => {
            return input$.pipe(
                filter(event => event.type === 'workflow_complete'),
                map(event => event as WorkflowCompleteEvent)
            );
        };
    }

    /**
     * 创建工作流错误事件过滤操作符
     *
     * 过滤出工作流错误事件
     *
     * 使用示例：
     * ```typescript
     * workflow$.pipe(
     *   filterWorkflowError(),
     *   tap(event => console.error('工作流错误：', event.error))
     * )
     * ```
     */
    filterWorkflowError(): OperatorFunction<WorkflowEvent, WorkflowErrorEvent> {
        return (input$: Observable<WorkflowEvent>) => {
            return input$.pipe(
                filter(event => event.type === 'workflow_error'),
                map(event => event as WorkflowErrorEvent)
            );
        };
    }
    private initializeOutputSubjects(ast: WorkflowGraphAst): void {
        ast.nodes.forEach(node => {
            if (!node.metadata?.outputs) return;

            node.metadata.outputs.forEach(output => {
                const key = output.property;
                const current = (node as any)[key];

                // 如果还不是 BehaviorSubject，创建一个
                if (!isBehaviorSubject(current)) {
                    (node as any)[key] = new BehaviorSubject(current ?? null);
                }
            });
        });
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
}
