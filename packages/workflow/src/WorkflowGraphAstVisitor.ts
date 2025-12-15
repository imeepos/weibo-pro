import { Injectable, Inject } from '@sker/core';
import { Observable, EMPTY, merge, defer, ReplaySubject, of, combineLatest, zip, concat } from 'rxjs';
import { filter, map, finalize, tap, catchError, shareReplay } from 'rxjs/operators';
import { NodeExecutor } from './executor';
import { Handler } from './decorator';
import { WorkflowGraphAst } from './ast';
import { NodeEmitEvent, NodeEvent } from './execution/events';
import { EdgeMode, IEdge } from './types';

/**
 * 工作流节点执行器
 *
 * 优雅设计：
 * - 统一工作流与普通节点的执行模式
 * - WorkflowGraphAst 作为一个节点，通过 @Handler 装饰器注册
 * - 管理工作流级别的状态转换（pending → running → success/fail）
 * - 协调子节点执行，构建数据流网络
 * - 监听子节点完成状态，决定工作流最终状态
 *
 * 架构哲学：
 * - 节点平等：WorkflowGraphAst 与其他节点享有相同的 Visitor 模式
 * - 递归优雅：子工作流也通过同样的机制执行
 * - 职责分离：NodeExecutor 仅负责调度，Visitor 负责具体逻辑
 * - 循环依赖解决：通过构造函数注入 NodeExecutor（DI 容器延迟解析）
 */
@Injectable()
export class WorkflowGraphAstVisitor {
    constructor(
        @Inject(NodeExecutor) private nodeExecutor: NodeExecutor
    ) { }

    @Handler(WorkflowGraphAst)
    handler(ast: WorkflowGraphAst, _parent?: WorkflowGraphAst): Observable<NodeEvent> {
        return defer(() => {
            ast.state = 'running';

            const inputSubjects = new Map<string, ReplaySubject<any>>();
            const nodeEventStreams = new Map<string, Observable<NodeEvent>>();

            // 为每个子节点创建输入流和事件流
            ast.nodes.forEach(node => {
                const input$ = new ReplaySubject<any>(1);
                inputSubjects.set(node.id, input$);

                // 调用 NodeExecutor 执行子节点，使用 shareReplay 共享订阅
                const eventStream$ = this.nodeExecutor.run(node, input$, ast).pipe(
                    shareReplay({ bufferSize: Infinity, refCount: false })
                );
                nodeEventStreams.set(node.id, eventStream$);
            });

            // 连接边
            this.connectEdges(ast, inputSubjects, nodeEventStreams);

            // 计算笛卡尔积并触发入口节点
            const combinedInput$ = this.computeCartesianProduct(ast, of({}));
            this.triggerEntryNodes(ast, combinedInput$, inputSubjects);

            // 合并所有事件流
            return this.mergeNodeEventStreams(ast, nodeEventStreams, inputSubjects);
        });
    }

    private connectEdges(
        workflow: WorkflowGraphAst,
        inputSubjects: Map<string, ReplaySubject<any>>,
        nodeEventStreams: Map<string, Observable<NodeEvent>>
    ): void {
        const edgesByTarget = new Map<string, IEdge[]>();
        workflow.edges.forEach(edge => {
            if (!edgesByTarget.has(edge.to)) {
                edgesByTarget.set(edge.to, []);
            }
            edgesByTarget.get(edge.to)!.push(edge);
        });

        edgesByTarget.forEach((edges, targetId) => {
            const targetSubject = inputSubjects.get(targetId);
            if (!targetSubject) return;

            console.log(`[WorkflowGraphAstVisitor] 连接节点 ${targetId} 的边，边数: ${edges.length}`);

            if (edges.length === 1) {
                const edge = edges[0]!;
                const eventStream$ = nodeEventStreams.get(edge.from);
                if (!eventStream$) return;

                eventStream$
                    .pipe(
                        filter((event): event is NodeEmitEvent =>
                            event.type === 'node_emit' && event.property === edge.fromProperty
                        ),
                        map(event => event.value),
                        finalize(() => {
                            console.log(`[WorkflowGraphAstVisitor] 上游节点 ${edge.from} 完成，完成下游节点 ${targetId} 的 subject`);
                            // 当上游节点完成时，完成下游节点的 subject
                            if (!targetSubject.closed) {
                                targetSubject.complete();
                            }
                        })
                    )
                    .subscribe(value => {
                        if (value !== null && value !== undefined) {
                            console.log(`[WorkflowGraphAstVisitor] 边 ${edge.from}(${edge.fromProperty}) -> ${targetId}(${edge.toProperty!}) 发射值:`, value);
                            console.log(`[WorkflowGraphAstVisitor] 准备将数据发送给节点 ${targetId} 的 input$ subject`);
                            targetSubject.next({ [edge.toProperty!]: value });
                        }
                    });
                return;
            }

            const mode = edges[0]?.mode ?? EdgeMode.COMBINE_LATEST;
            const sources = edges.map(edge => {
                const eventStream$ = nodeEventStreams.get(edge.from);
                if (!eventStream$) return EMPTY;

                return eventStream$.pipe(
                    filter((event): event is NodeEmitEvent =>
                        event.type === 'node_emit' && event.property === edge.fromProperty
                    ),
                    map(event => event.value)
                );
            });

            this.mergeEdgeSources(mode, sources, edges).subscribe({
                next: value => {
                    targetSubject.next(value);
                },
                complete: () => {
                    console.log(`[WorkflowGraphAstVisitor] 所有上游节点完成，完成节点 ${targetId} 的 subject`);
                    // 当所有上游节点完成时，完成下游节点的 subject
                    if (!targetSubject.closed) {
                        targetSubject.complete();
                    }
                }
            });
        });
    }

    private mergeEdgeSources(mode: EdgeMode, sources: Observable<any>[], edges: IEdge[]): Observable<any> {
        const validSources = sources.filter(s => s !== EMPTY);
        if (validSources.length === 0) return EMPTY;

        switch (mode) {
            case EdgeMode.MERGE:
                return merge(...validSources).pipe(
                    map((value, index) => {
                        const edge = edges[index];
                        return edge?.toProperty ? { [edge.toProperty]: value } : value;
                    })
                );

            case EdgeMode.ZIP:
                return zip(...validSources).pipe(
                    map(values => {
                        const result: any = {};
                        values.forEach((value, index) => {
                            const edge = edges[index];
                            if (edge?.toProperty) {
                                result[edge.toProperty] = value;
                            }
                        });
                        return result;
                    })
                );

            case EdgeMode.COMBINE_LATEST:
            default:
                return combineLatest(validSources).pipe(
                    map(values => {
                        const result: any = {};
                        values.forEach((value, index) => {
                            const edge = edges[index];
                            if (edge?.toProperty) {
                                result[edge.toProperty] = value;
                            }
                        });
                        return result;
                    })
                );
        }
    }

    /**
     * 计算笛卡尔积：将外部输入与静态入口节点的值组合
     *
     * 例如：
     * - 外部输入: [1, 2, 3]
     * - 静态节点A的值: [x]
     * - 静态节点B的值: [y]
     * - 结果: [(1,x,y), (2,x,y), (3,x,y)]
     */
    private computeCartesianProduct(
        workflow: WorkflowGraphAst,
        input$: Observable<any>
    ): Observable<any> {
        const autoEntryIds = this.findEntryNodes(workflow);
        const dynamicEntryIds = workflow.entryNodeIds && workflow.entryNodeIds.length > 0
            ? workflow.entryNodeIds
            : [];
        const staticEntryIds = autoEntryIds.filter(id => !dynamicEntryIds.includes(id));

        console.log(`[WorkflowGraphAstVisitor] 动态入口节点:`, dynamicEntryIds);
        console.log(`[WorkflowGraphAstVisitor] 静态入口节点:`, staticEntryIds);

        // 如果没有静态入口节点，直接返回外部输入
        if (staticEntryIds.length === 0) {
            return input$;
        }

        // 收集静态节点的值
        const staticValues: Record<string, any> = {};
        staticEntryIds.forEach(nodeId => {
            const node = workflow.nodes.find(n => n.id === nodeId);
            if (node) {
                // 收集节点的所有属性作为静态值
                staticValues[nodeId] = { ...node };
            }
        });

        console.log(`[WorkflowGraphAstVisitor] 静态节点值:`, staticValues);

        // 将外部输入与静态值组合
        return input$.pipe(
            map(dynamicInput => {
                const combined: any = { ...dynamicInput };
                // 将静态值合并到输入中
                staticEntryIds.forEach(nodeId => {
                    combined[`${nodeId}`] = staticValues[nodeId];
                });
                console.log(`[WorkflowGraphAstVisitor] 组合后的输入:`, combined);
                return combined;
            })
        );
    }

    private triggerEntryNodes(
        workflow: WorkflowGraphAst,
        input$: Observable<any>,
        inputSubjects: Map<string, ReplaySubject<any>>
    ): void {
        const entryIds = this.findEntryNodes(workflow);
        console.log(`[WorkflowGraphAstVisitor] 触发入口节点:`, entryIds);

        input$.subscribe({
            next: input => {
                entryIds.forEach(nodeId => {
                    const subject = inputSubjects.get(nodeId);
                    if (subject) {
                        console.log(`[WorkflowGraphAstVisitor] 向入口节点 ${nodeId} 发送输入`);
                        subject.next(input || {});
                    }
                });
            },
            complete: () => {
                console.log(`[WorkflowGraphAstVisitor] 输入流完成，完成所有入口节点的 subject`);
                entryIds.forEach(nodeId => {
                    const subject = inputSubjects.get(nodeId);
                    if (subject && !subject.closed) {
                        console.log(`[WorkflowGraphAstVisitor] 完成入口节点 ${nodeId} 的 subject`);
                        subject.complete();
                    }
                });
            }
        });
    }

    private findEntryNodes(workflow: WorkflowGraphAst): string[] {
        const inDegrees = new Map<string, number>();
        workflow.nodes.forEach(node => inDegrees.set(node.id, 0));
        workflow.edges.forEach(edge => {
            inDegrees.set(edge.to, (inDegrees.get(edge.to) ?? 0) + 1);
        });

        console.log(`[WorkflowGraphAstVisitor] 节点入度统计:`, Object.fromEntries(inDegrees));

        const entryNodes = Array.from(inDegrees.entries())
            .filter(([_, degree]) => degree === 0)
            .map(([nodeId]) => nodeId);

        console.log(`[WorkflowGraphAstVisitor] 找到入口节点:`, entryNodes);
        return entryNodes;
    }

    private mergeNodeEventStreams(
        workflow: WorkflowGraphAst,
        nodeEventStreams: Map<string, Observable<NodeEvent>>,
        inputSubjects: Map<string, ReplaySubject<any>>
    ): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            console.log('[WorkflowGraphAstVisitor] mergeNodeEventStreams 开始，节点数:', nodeEventStreams.size)

            // 先发射工作流运行事件
            obs.next({ type: 'node_runing', id: workflow.id, data: workflow });

            const allStreams = Array.from(nodeEventStreams.values());
            if (allStreams.length === 0) {
                console.log('[WorkflowGraphAstVisitor] 没有子节点，直接完成')
                workflow.state = 'success';
                obs.next({ type: 'node_success', id: workflow.id, data: workflow });
                obs.complete();
                return;
            }

            let hasError = false;
            let completedCount = 0;
            const totalNodes = allStreams.length;

            // 创建一个 Subject 来追踪所有节点的完成
            const completionSubject = new ReplaySubject<void>(1);

            // 订阅每个节点流，追踪完成状态
            const subscriptions = allStreams.map((nodeStream, index) => {
                console.log(`[WorkflowGraphAstVisitor] 订阅节点流 ${index + 1}/${totalNodes}`)

                return nodeStream.subscribe({
                    next: (event) => {
                        // 传递所有事件给观察者
                        obs.next(event);

                        // 检查是否是失败事件
                        if (event.type === 'node_fail') {
                            hasError = true;
                            console.log(`[WorkflowGraphAstVisitor] 节点失败: ${event.id}, 已标记 hasError = true`)
                        }
                    },
                    error: (err) => {
                        console.error(`[WorkflowGraphAstVisitor] 节点流错误:`, err);
                        hasError = true;
                        workflow.state = 'fail';
                        workflow.error = err;
                        obs.next({ type: 'node_fail', id: workflow.id, data: workflow });
                        obs.complete();

                        // 清理资源
                        subscriptions.forEach(sub => sub.unsubscribe());
                        inputSubjects.forEach(subject => {
                            if (!subject.closed) {
                                subject.complete();
                            }
                        });
                    },
                    complete: () => {
                        console.log(`[WorkflowGraphAstVisitor] 节点流 ${index + 1}/${totalNodes} 完成`)
                        completedCount++;
                        console.log(`[WorkflowGraphAstVisitor] 节点流完成 ${completedCount}/${totalNodes}`)
                        if (completedCount === totalNodes) {
                            console.log(`[WorkflowGraphAstVisitor] 所有节点完成 ${completedCount}/${totalNodes}，准备发射工作流完成事件`)
                            completionSubject.next();
                            completionSubject.complete();
                        }
                    }
                });
            });

            // 监听 completionSubject，当所有节点完成后发射工作流完成事件
            const completionSubscription = completionSubject.subscribe(() => {
                console.log(`[WorkflowGraphAstVisitor] 所有节点已完成，发射工作流完成事件`)
                workflow.state = hasError ? 'fail' : 'success';
                const finalEvent: NodeEvent = hasError
                    ? { type: 'node_fail', id: workflow.id, data: workflow }
                    : { type: 'node_success', id: workflow.id, data: workflow };
                obs.next(finalEvent);
                obs.complete();

                // 清理资源
                subscriptions.forEach(sub => sub.unsubscribe());
                inputSubjects.forEach(subject => {
                    if (!subject.closed) {
                        subject.complete();
                    }
                });
            });

            return () => {
                console.log(`[WorkflowGraphAstVisitor] mergeNodeEventStreams 清理资源`)
                subscriptions.forEach(sub => sub.unsubscribe());
                completionSubscription.unsubscribe();
                inputSubjects.forEach(subject => {
                    if (!subject.closed) {
                        subject.complete();
                    }
                });
            };
        });
    }
}