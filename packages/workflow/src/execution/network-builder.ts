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
} from 'rxjs/operators';
import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, EdgeMode, isBehaviorSubject } from '../types';
import { NodeExecutor } from './node-executor';

interface EdgeGroup {
    nodeId: string;
    edges: IEdge[];
    sources: Map<string, BehaviorSubject<any>>;
}

/**
 * 网络构建器 - 将工作流转换为反应式 Observable 网络
 *
 * 设计哲学：编译与执行分离
 * - buildNetwork() 只构建网络结构，不执行任何代码
 * - 返回 Observable 网络是"虚拟"的，只有订阅时才真正运行
 * - 同一个网络可以执行多次
 *
 * 网络结构：
 * ┌─────────────────────────────────────┐
 * │  buildNodeObservable(A, input$) →   │
 * │  Observable<INode>                  │
 * │          ↓                          │
 * │    @Output: BehaviorSubject         │
 * │          ↓                          │
 * │  buildEdgeStream(A→B) →             │
 * │  input$ for B                       │
 * │          ↓                          │
 * │  buildNodeObservable(B, input$) →   │
 * │  Observable<INode>                  │
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
     * 6. 合并所有节点的 Observable，形成完整网络
     *
     * 返回值：Observable<WorkflowGraphAst>
     * - 每次发射都是最新的工作流状态快照
     * - 只有 subscribe 时才真正执行
     */
    buildNetwork(
        ast: WorkflowGraphAst,
        ctx: WorkflowGraphAst
    ): Observable<WorkflowGraphAst> {
        // Step 1: 初始化所有节点的 @Output BehaviorSubject
        this.initializeOutputSubjects(ast);

        // Step 2: 为每个节点创建输入 Subject 和 Observable
        const nodeObservables = new Map<string, Observable<INode>>();
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

        // Step 6: 合并所有节点的 Observable
        return this.mergeNodeStreams(ast, nodeObservables).pipe(
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
     * 为单个节点构建 Observable
     *
     * 输入：
     * - node: 节点 AST
     * - input$: 输入流（来自前端或上游节点的 @Output）
     *
     * 输出：
     * - Observable<INode>
     *   - 流式发射节点的执行状态和中间结果
     *   - 同时更新节点的 @Output BehaviorSubject
     *
     * 核心机制：
     * 1. 当 input$ 发射时，触发节点执行
     * 2. 节点执行返回 Observable<INode>（可多次发射）
     * 3. 每次发射时，自动更新 @Output BehaviorSubject
     * 4. @Output BehaviorSubject 的变化自动流向下游
     */
    private buildNodeObservable(
        node: INode,
        input$: Observable<any>,
        ast: WorkflowGraphAst,
        ctx: WorkflowGraphAst
    ): Observable<INode> {
        return input$.pipe(
            switchMap(inputData => {
                // 将输入数据赋给节点
                if (inputData) {
                    Object.assign(node, inputData);
                }

                // 执行节点并处理错误
                return this.nodeExecutor.execute(node, ast, ctx).pipe(
                    tap(updatedNode => {
                        this.updateOutputSubjects(updatedNode as INode);
                    }),
                    catchError(error => {
                        console.error(`Node ${node.id} execution failed:`, error);
                        node.state = 'fail';
                        node.error = error;
                        return new Observable<INode>(obs => {
                            obs.next(node);
                            obs.error(error);
                        });
                    })
                );
            }),
            shareReplay(1)
        );
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
     * 合并所有节点的 Observable
     *
     * 返回一个"聚合" Observable，代表整个工作流的状态流
     */
    private mergeNodeStreams(
        ast: WorkflowGraphAst,
        nodeObservables: Map<string, Observable<INode>>
    ): Observable<WorkflowGraphAst> {
        const allNodeStreams = Array.from(nodeObservables.values());

        if (allNodeStreams.length === 0) {
            return new Observable(obs => {
                obs.next(ast);
                obs.complete();
            });
        }

        return merge(...allNodeStreams).pipe(
            tap(updatedNode => {
                const idx = ast.nodes.findIndex(n => n.id === updatedNode.id);
                if (idx >= 0) {
                    ast.nodes[idx] = updatedNode;
                }
            }),
            map(() => ast),
            finalize(() => {
                if (ast.state !== 'fail') {
                    ast.state = 'success';
                }
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
