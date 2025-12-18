import { Injectable, Inject } from '@sker/core';
import { Observable, EMPTY, merge, defer, of, combineLatest, zip, isObservable } from 'rxjs';
import { filter, map, catchError, shareReplay, concatMap, withLatestFrom } from 'rxjs/operators';
import { NodeExecutor } from './executor';
import { Handler } from './decorator';
import { setAstError, WorkflowGraphAst } from './ast';
import { NodeEmitEvent, NodeEvent } from './execution/events';
import { EdgeMode, IEdge, ROUTE_SKIPPED } from './types';

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
    handler(ast: WorkflowGraphAst, input$: Observable<any>, _parent?: WorkflowGraphAst): Observable<NodeEvent> {
        if (!input$) throw new Error(`[WorkflowGraphAstVisitor.handler] input$ is empty`)
        if (!isObservable(input$)) throw new Error(`[WorkflowGraphAstVisitor.handler] input$ must be an Observable`)

        return input$.pipe(
            concatMap(input => {
                console.log(`[WorkflowGraphAstVisitor] workflow input is ${JSON.stringify(input)}`)

                ast.state = 'running';
                ast.error = undefined;

                const nodeEventStreams = new Map<string, Observable<NodeEvent>>();

                // 1. 构建每个节点的输入流（合并系统输入和边输入）
                const nodeInputStreams = this.buildNodeInputStreams(ast, of(input), nodeEventStreams);

                // 2. 为每个节点创建执行流
                ast.nodes.forEach((node, index) => {
                    const nodeInput$ = nodeInputStreams.get(node.id) || EMPTY;
                    console.log(`[WorkflowGraphAstVisitor] 创建节点 [${index + 1}/${ast.nodes.length}] ${node.id} (${node.type}) 的执行流`);

                    const eventStream$ = this.nodeExecutor.run(node, nodeInput$, ast).pipe(
                        shareReplay({ bufferSize: Infinity, refCount: true })
                    );
                    nodeEventStreams.set(node.id, eventStream$);
                });

                // 3. 合并所有事件流
                return this.mergeNodeEventStreams(ast, nodeEventStreams);
            }),
            catchError(error => {
                ast.state = 'fail';
                ast.error = error;
                return of({ type: 'node_fail', id: ast.id, error: ast.error?.message } as NodeEvent);
            })
        );
    }

    /**
     * 构建每个节点的输入流
     *
     * 核心设计：nodeInput$ = mergeWithCompletion(input$, router$, ...)
     * - 多个输入源通过 merge 合并值
     * - 只有当所有输入源都 complete 时，节点输入流才 complete
     * - 这确保了循环场景下，入口节点不会过早结束
     */
    private buildNodeInputStreams(
        workflow: WorkflowGraphAst,
        systemInput$: Observable<any>,
        nodeEventStreams: Map<string, Observable<NodeEvent>>
    ): Map<string, Observable<any>> {
        const nodeInputStreams = new Map<string, Observable<any>>();
        const entryIds = workflow.entryNodeIds?.length
            ? workflow.entryNodeIds
            : this.findEntryNodes(workflow);

        // 按目标节点分组边
        const edgesByTarget = new Map<string, IEdge[]>();
        workflow.edges.forEach(edge => {
            if (!edgesByTarget.has(edge.to)) {
                edgesByTarget.set(edge.to, []);
            }
            edgesByTarget.get(edge.to)!.push(edge);
        });

        workflow.nodes.forEach(node => {
            const edges = edgesByTarget.get(node.id) || [];
            const isEntry = entryIds.includes(node.id);
            const inputSources: Observable<any>[] = [];

            // 1. 入口节点：添加系统输入流
            if (isEntry) {
                const entryInput$ = systemInput$.pipe(
                    map(input => this.buildNodeInput(node, input))
                );
                inputSources.push(entryInput$);
            }

            // 2. 分离普通边和 router 边
            const normalEdges: IEdge[] = [];
            const routerEdges: IEdge[] = [];

            edges.forEach(edge => {
                const sourceNode = workflow.nodes.find(n => n.id === edge.from);
                const outputMeta = sourceNode?.metadata?.outputs?.find(
                    (out: any) => out.property === edge.fromProperty
                );
                if (outputMeta?.isRouter) {
                    routerEdges.push(edge);
                } else {
                    normalEdges.push(edge);
                }
            });

            // 3. 普通边：按 EdgeMode 组合
            if (normalEdges.length > 0) {
                const normalInput$ = this.buildNormalEdgesInput(workflow, normalEdges, nodeEventStreams);
                if (normalInput$ !== EMPTY) {
                    inputSources.push(normalInput$);
                }
            }

            // 4. router 边：独立添加，携带其他边的最新值
            routerEdges.forEach(edge => {
                const routerInput$ = this.buildRouterEdgeInput(
                    workflow,
                    edge,
                    nodeEventStreams,
                    node.id,
                    edges
                );
                if (routerInput$ !== EMPTY) {
                    inputSources.push(routerInput$);
                }
            });

            // 5. 合并所有输入源（等待所有源 complete）
            if (inputSources.length === 0) {
                // 没有输入源：使用节点自身的静态值作为初始输入
                // 场景：辅流节点（如风格配置），不连接任何上游，只提供静态值
                const staticInput = this.buildNodeInput(node, {});
                console.log(`[buildNodeInputStreams] 节点 ${node.id} 无输入源，使用静态值:`, staticInput);
                nodeInputStreams.set(node.id, of(staticInput));
            } else {
                nodeInputStreams.set(node.id, this.mergeWithCompletion(inputSources));
            }
        });

        return nodeInputStreams;
    }

    /**
     * 合并多个输入流，只有当所有流都 complete 时才 complete
     *
     * 与普通 merge 的区别：
     * - merge: 任一流 complete 不影响其他流，但整体 complete 时机不确定
     * - mergeWithCompletion: 合并所有值，只有当所有流都 complete 时才 complete
     */
    private mergeWithCompletion(sources: Observable<any>[]): Observable<any> {
        if (sources.length === 0) return EMPTY;
        if (sources.length === 1) return sources[0]!;

        return new Observable(subscriber => {
            let completedCount = 0;
            const total = sources.length;

            const subscriptions = sources.map(source =>
                source.subscribe({
                    next: value => subscriber.next(value),
                    error: err => subscriber.error(err),
                    complete: () => {
                        completedCount++;
                        if (completedCount === total) {
                            subscriber.complete();
                        }
                    }
                })
            );

            return () => subscriptions.forEach(sub => sub.unsubscribe());
        });
    }

    /**
     * 构建普通边的输入流（按 EdgeMode 组合）
     */
    private buildNormalEdgesInput(
        workflow: WorkflowGraphAst,
        edges: IEdge[],
        nodeEventStreams: Map<string, Observable<NodeEvent>>
    ): Observable<any> {
        if (edges.length === 0) return EMPTY;

        const mode = edges[0]?.mode ?? EdgeMode.COMBINE_LATEST;
        const sources = edges.map(edge => this.buildEdgeValueStream(workflow, edge, nodeEventStreams));
        const validSources = sources.filter(s => s !== EMPTY);

        if (validSources.length === 0) return EMPTY;
        if (validSources.length === 1) {
            return validSources[0]!.pipe(
                map(value => ({ [edges[0]!.toProperty!]: value }))
            );
        }

        return this.combineEdgeSources(mode, validSources, edges);
    }

    /**
     * 构建 router 边的输入流（独立触发）
     *
     * Router 语义：
     * - 作为主触发源，每次发射都重新触发目标节点
     * - 携带其他输入边的最新值，保持节点的完整输入上下文
     * - 类似 withLatestFrom 的主流，但router边可以有多个
     */
    private buildRouterEdgeInput(
        workflow: WorkflowGraphAst,
        edge: IEdge,
        nodeEventStreams: Map<string, Observable<NodeEvent>>,
        targetNodeId: string,
        allEdgesToTarget: IEdge[]
    ): Observable<any> {
        const valueStream$ = this.buildEdgeValueStream(workflow, edge, nodeEventStreams);
        if (valueStream$ === EMPTY) return EMPTY;

        // 获取目标节点的其他非 router 输入边
        const otherEdges = allEdgesToTarget.filter(e => {
            if (e.id === edge.id) return false; // 排除自己
            const sourceNode = workflow.nodes.find(n => n.id === e.from);
            const outputMeta = sourceNode?.metadata?.outputs?.find(
                (out: any) => out.property === e.fromProperty
            );
            return !outputMeta?.isRouter; // 只包含非 router 边
        });

        // 如果没有其他输入边，直接返回 router 边的值
        if (otherEdges.length === 0) {
            return valueStream$.pipe(
                filter(value => value !== ROUTE_SKIPPED),
                map(value => ({ [edge.toProperty!]: value }))
            );
        }

        // 构建其他边的值流
        const otherValueStreams = otherEdges.map(e =>
            this.buildEdgeValueStream(workflow, e, nodeEventStreams)
        ).filter(s => s !== EMPTY);

        // Router 边作为主流，携带其他边的最新值
        return valueStream$.pipe(
            filter(value => value !== ROUTE_SKIPPED),
            withLatestFrom(...otherValueStreams),
            map(([routerValue, ...otherValues]) => {
                const result: Record<string, any> = {};

                // Router 边的值
                result[edge.toProperty!] = routerValue;

                // 其他边的最新值
                otherValues.forEach((value, index) => {
                    const otherEdge = otherEdges[index];
                    if (otherEdge?.toProperty) {
                        result[otherEdge.toProperty] = value;
                    }
                });

                return result;
            })
        );
    }

    /**
     * 从边构建值流（提取 node_emit 事件的值）
     */
    private buildEdgeValueStream(
        workflow: WorkflowGraphAst,
        edge: IEdge,
        nodeEventStreams: Map<string, Observable<NodeEvent>>
    ): Observable<any> {
        // 使用 defer 延迟获取 eventStream，解决循环依赖
        return defer(() => {
            const eventStream$ = nodeEventStreams.get(edge.from);
            if (!eventStream$) return EMPTY;

            return eventStream$.pipe(
                filter((event): event is NodeEmitEvent =>
                    event.type === 'node_emit' && edge.fromProperty! in (event.data || {})
                ),
                map(event => event.data?.[edge.fromProperty!])
            );
        });
    }

    /**
     * 按 EdgeMode 组合多个边的值流
     */
    private combineEdgeSources(mode: EdgeMode, sources: Observable<any>[], edges: IEdge[]): Observable<any> {
        const mapToObject = (values: any[]) => {
            const result: Record<string, any> = {};
            values.forEach((value, index) => {
                const prop = edges[index]?.toProperty;
                if (prop) {
                    if (result[prop] === undefined) {
                        result[prop] = value;
                    } else if (Array.isArray(result[prop])) {
                        result[prop].push(value);
                    } else {
                        result[prop] = [result[prop], value];
                    }
                }
            });
            return result;
        };

        switch (mode) {
            case EdgeMode.MERGE:
                // 修复：在 merge 前为每个源标记 toProperty，避免使用发射顺序 index
                return merge(
                    ...sources.map((source, sourceIndex) =>
                        source.pipe(
                            map(value => ({ [edges[sourceIndex]!.toProperty!]: value }))
                        )
                    )
                );
            case EdgeMode.ZIP:
                return zip(...sources).pipe(map(mapToObject));
            case EdgeMode.WITH_LATEST_FROM:
                return this.buildWithLatestFrom(sources, edges);
            case EdgeMode.COMBINE_LATEST:
            default:
                return combineLatest(sources).pipe(map(mapToObject));
        }
    }

    /**
     * 构建 withLatestFrom：主流触发，携带辅流最新值
     *
     * 场景示例：
     * - 关键词节点（主流 isPrimary=true）→ 每次发射都触发下游
     * - 风格节点（辅流 isPrimary=false）→ 只提供配置值，不主动触发
     *
     * 行为：
     * 主流: ----A--------B--------C---
     * 辅流: --1-----2---------3------
     * 结果: ----A1-------B2-------C3--
     */
    private buildWithLatestFrom(sources: Observable<any>[], edges: IEdge[]): Observable<any> {
        // 找到主流（isPrimary === true）
        const primaryIndex = edges.findIndex(edge => edge.isPrimary === true);

        if (primaryIndex === -1) {
            console.warn('[buildWithLatestFrom] 未找到主流（isPrimary=true），回退到 combineLatest');
            return combineLatest(sources).pipe(
                map(values => {
                    const result: Record<string, any> = {};
                    values.forEach((value, index) => {
                        const prop = edges[index]?.toProperty;
                        if (prop) result[prop] = value;
                    });
                    return result;
                })
            );
        }

        // 分离主流和辅流
        const primarySource = sources[primaryIndex]!;
        const secondarySources = sources.filter((_, i) => i !== primaryIndex);
        const primaryEdge = edges[primaryIndex]!;
        const secondaryEdges = edges.filter((_, i) => i !== primaryIndex);

        // 主流 + withLatestFrom(辅流1, 辅流2, ...)
        return primarySource.pipe(
            withLatestFrom(...secondarySources),
            map(([primaryValue, ...secondaryValues]) => {
                const result: Record<string, any> = {};

                // 主流值
                if (primaryEdge.toProperty) {
                    result[primaryEdge.toProperty] = primaryValue;
                }

                // 辅流值
                secondaryValues.forEach((value, index) => {
                    const prop = secondaryEdges[index]?.toProperty;
                    if (prop) result[prop] = value;
                });

                return result;
            })
        );
    }

    /**
     * 为入口节点构建输入对象
     */
    private buildNodeInput(node: any, input: any): Record<string, any> {
        const nodeInput: Record<string, any> = {};
        const inputs = node.metadata?.inputs || [];

        inputs.forEach((inputMeta: any) => {
            const property = String(inputMeta.property);
            const propertyKey = `${node.id}.${property}`;

            if (input[propertyKey] !== undefined) {
                nodeInput[property] = input[propertyKey];
            } else if (input[node.id]?.[property] !== undefined) {
                nodeInput[property] = input[node.id][property];
            } else if (node[property] !== undefined) {
                nodeInput[property] = node[property];
            } else if (inputMeta.defaultValue !== undefined) {
                nodeInput[property] = inputMeta.defaultValue;
            }
        });

        return nodeInput;
    }

    private findEntryNodes(workflow: WorkflowGraphAst): string[] {
        const inDegrees = new Map<string, number>();
        workflow.nodes.forEach(node => inDegrees.set(node.id, 0));
        workflow.edges.forEach(edge => {
            inDegrees.set(edge.to, (inDegrees.get(edge.to) ?? 0) + 1);
        });


        const entryNodes = Array.from(inDegrees.entries())
            .filter(([_, degree]) => degree === 0)
            .map(([nodeId]) => nodeId);

        return entryNodes;
    }

    private mergeNodeEventStreams(
        workflow: WorkflowGraphAst,
        nodeEventStreams: Map<string, Observable<NodeEvent>>
    ): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            obs.next({ type: 'node_runing', id: workflow.id });

            const allStreams = Array.from(nodeEventStreams.values());
            if (allStreams.length === 0) {
                workflow.state = 'success';
                obs.next({ type: 'node_success', id: workflow.id });
                obs.complete();
                return;
            }

            let completedCount = 0;
            const totalNodes = allStreams.length;
            const nodeStates = new Map<string, 'success' | 'fail'>();

            const subscriptions = allStreams.map(nodeStream =>
                nodeStream.subscribe({
                    next: event => {
                        obs.next(event);
                        if (event.type === 'node_fail') {
                            nodeStates.set(event.id!, 'fail');
                        } else if (event.type === 'node_success') {
                            nodeStates.set(event.id!, 'success');
                        }
                    },
                    error: err => {
                        workflow.state = 'fail';
                        workflow.error = err;
                        setAstError(workflow, err)
                        obs.next({ type: 'node_fail', id: workflow.id, error: workflow.error?.message });
                        obs.complete();
                        subscriptions.forEach(sub => sub.unsubscribe());
                    },
                    complete: () => {
                        completedCount++;
                        if (completedCount === totalNodes) {
                            const hasError = Array.from(nodeStates.values()).some(s => s === 'fail');
                            workflow.state = hasError ? 'fail' : 'success';
                            obs.next(hasError
                                ? { type: 'node_fail', id: workflow.id, error: workflow.error?.message }
                                : { type: 'node_success', id: workflow.id }
                            );
                            obs.complete();
                        }
                    }
                })
            );

            return () => subscriptions.forEach(sub => sub.unsubscribe());
        });
    }
}