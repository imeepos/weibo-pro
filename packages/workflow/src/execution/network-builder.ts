import { Injectable } from '@sker/core';
import {
    Observable,
    Subject,
    combineLatest,
    zip,
    merge,
    BehaviorSubject,
    EMPTY,
    Subscription,
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
} from 'rxjs/operators';
import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, EdgeMode, isBehaviorSubject } from '../types';
import { NodeExecutor } from './node-executor';

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
 * 网络构建器 - 将工作流转换为反应式事件流
 *
 * 设计哲学：纯流式架构
 * - buildNetwork() 返回 Observable<WorkflowEvent> 事件流
 * - 所有变化（节点状态、输出、完成）都通过事件发射
 * - 无需额外的 EventBus，事件即流
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

    constructor(private nodeExecutor: NodeExecutor) {}

    /**
     * 构建完整的工作流网络（不执行）
     *
     * 步骤：
     * 1. 初始化所有节点的 @Output BehaviorSubject
     * 2. 为每个节点创建执行 Observable 和输入 Subject
     * 3. 按输入节点分组收集边，构建边流
     * 4. 为每个节点的边流创建数据连接
     * 5. 触发起始节点（入度为 0）的执行
     * 6. 合并所有节点的事件流，形成完整网络
     *
     * 返回值：Observable<WorkflowEvent>
     * - 每次发射都是一个工作流事件
     * - 只有 subscribe 时才真正执行
     */
    buildNetwork(
        ast: WorkflowGraphAst,
        ctx: WorkflowGraphAst
    ): Observable<WorkflowEvent> {
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

        // Step 5: 触发起始节点（入度为 0）
        this.triggerStartNodes(ast, inDegrees, inputSubjects);

        // Step 6: 合并所有节点的事件流
        return this.mergeNodeEventStreams(ast, nodeObservables).pipe(
            finalize(() => {
                this.cleanup();
            })
        );
    }

    /**
     * 清理订阅，防止内存泄漏
     */
    cleanup(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions.clear();
    }

    /**
     * 为单个节点构建事件流
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
     * 为目标节点连接所有输入边
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
            .subscribe(([primaryValue]) => {
                const combined = { [primaryEdge.toProperty!]: primaryValue } as any;
                group.edges.forEach((edge, idx) => {
                    if (edge !== primaryEdge && otherSources[idx - 1]) {
                        // 这里简化处理，实际需要对应正确的索引
                    }
                });
                targetSubject.next(combined);
            });

        this.subscriptions.set(group.nodeId, sub);
    }

    /**
     * 触发入度为 0 的起始节点
     */
    private triggerStartNodes(
        ast: WorkflowGraphAst,
        inDegrees: Map<string, number>,
        inputSubjects: Map<string, Subject<any>>
    ): void {
        ast.nodes.forEach(node => {
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
     *
     * 返回一个"聚合" Observable，代表整个工作流的事件流
     * 最后发射一个 workflow_complete 事件
     */
    private mergeNodeEventStreams(
        ast: WorkflowGraphAst,
        nodeObservables: Map<string, Observable<WorkflowEvent>>
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
     * 初始化节点的 @Output BehaviorSubject
     *
     * 确保每个 @Output 都是一个正确初始化的 BehaviorSubject
     */
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
     * 更新节点的 @Output BehaviorSubject
     *
     * 当节点执行时，更新其输出的 BehaviorSubject
     * 注意：现在这个方法只负责更新 Subject，事件在 buildNodeObservable 中统一发射
     */
    private updateOutputSubjects(node: INode): void {
        if (!node.metadata?.outputs) return;

        node.metadata.outputs.forEach(output => {
            const key = output.property;
            const subject = (node as any)[key];
            const value = (node as any)[key];

            // 如果是 BehaviorSubject，发射新值
            if (isBehaviorSubject(subject)) {
                subject.next(value);
            }
        });
    }
}
