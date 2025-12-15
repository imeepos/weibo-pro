import { Inject, Injectable, root } from '@sker/core';
import { Observable, EMPTY, merge, defer, ReplaySubject, concat, of } from 'rxjs';
import { concatMap, finalize, map, filter } from 'rxjs/operators';
import { INode, IEdge, EdgeMode, isNode } from './types';
import { WorkflowGraphAst, isWorkflowGraphAst } from './ast';
import { NodeEvent } from './execution/events';
import { VisitorExecutor } from './execution/visitor-executor';
import { Compiler } from './compiler';
import { clone } from './utils';

/**
 * 节点执行器 - 统一的节点执行入口
 *
 * 设计哲学：
 * - 每个节点可以多次发射不同的值
 * - input$ 可以多次发射，每次发射触发一次节点执行
 * - WorkflowGraphAst 也是一个节点，平等对待
 */
@Injectable()
export class NodeExecutor {
    constructor(
        @Inject(VisitorExecutor) private visitorExecutor: VisitorExecutor,
        @Inject(Compiler) private compiler: Compiler
    ) { }

    /**
     * 执行节点
     *
     * @param node 要执行的节点
     * @param input$ 输入流（每次发射触发一次执行）
     * @returns 节点事件流
     */
    run<Input = any>(node: INode, input$: Observable<Input>, parent?: WorkflowGraphAst): Observable<NodeEvent> {
        // 确保节点已编译
        if (!isNode(node)) {
            node = this.compiler.compile(node);
        }

        // 判断是否为工作流
        if (isWorkflowGraphAst(node)) {
            return this.runWorkflow(node as WorkflowGraphAst, input$);
        }

        // 普通节点：每次 input$ 发射触发一次执行
        return input$.pipe(
            concatMap(input => {
                // 将输入赋值给节点
                const nodeInstance = this.cloneNode(node);
                if (input && typeof input === 'object') {
                    Object.assign(nodeInstance, input);
                }
                // 调用 Visitor 执行
                if (node.type === 'WorkflowGraphAst') {
                    return this.visitorExecutor.visit(nodeInstance, node as WorkflowGraphAst);
                }
                return this.visitorExecutor.visit(nodeInstance, parent);
            })
        );
    }

    /**
     * 执行工作流
     *
     * 策略：
     * 1. 根据 entryNodeIds 确定入口节点
     * 2. 将 input$ 分发给入口节点
     * 3. 构建内部节点网络
     * 4. 返回所有节点的事件流
     */
    private runWorkflow(workflow: WorkflowGraphAst, input$: Observable<any>): Observable<NodeEvent> {
        return defer(() => {
            // 为每个节点创建输入 Subject
            const inputSubjects = new Map<string, ReplaySubject<any>>();
            const nodeEventStreams = new Map<string, Observable<NodeEvent>>();

            workflow.nodes.forEach(node => {
                const input$ = new ReplaySubject<any>(1);
                inputSubjects.set(node.id, input$);

                // 为每个节点构建事件流
                const eventStream$ = this.run(node, input$);
                nodeEventStreams.set(node.id, eventStream$);
            });

            // 连接边：将上游节点的输出连接到下游节点的输入
            this.connectEdges(workflow, inputSubjects, nodeEventStreams);

            // 触发入口节点
            this.triggerEntryNodes(workflow, input$, inputSubjects);

            // 合并所有节点的事件流
            return this.mergeNodeEventStreams(workflow, nodeEventStreams, inputSubjects);
        });
    }

    /**
     * 连接边：监听上游节点的输出，传递给下游节点
     */
    private connectEdges(
        workflow: WorkflowGraphAst,
        inputSubjects: Map<string, ReplaySubject<any>>,
        nodeEventStreams: Map<string, Observable<NodeEvent>>
    ): void {
        // 按目标节点分组
        const edgesByTarget = new Map<string, IEdge[]>();
        workflow.edges.forEach(edge => {
            if (!edgesByTarget.has(edge.to)) {
                edgesByTarget.set(edge.to, []);
            }
            edgesByTarget.get(edge.to)!.push(edge);
        });

        // 为每个目标节点连接输入
        edgesByTarget.forEach((edges, targetId) => {
            const targetSubject = inputSubjects.get(targetId);
            if (!targetSubject) return;

            // 单边直连
            if (edges.length === 1) {
                const edge = edges[0]!;
                const eventStream$ = nodeEventStreams.get(edge.from);
                if (!eventStream$) return;

                eventStream$.pipe(
                    filter(event => event.type === 'node_emit' && event.property === edge.fromProperty),
                    map(event => event.value)
                ).subscribe(value => {
                    if (value !== null && value !== undefined) {
                        targetSubject.next({ [edge.toProperty!]: value });
                    }
                });
                return;
            }

            // 多边：根据模式合并
            const mode = edges[0]?.mode ?? EdgeMode.COMBINE_LATEST;
            const sources = edges.map(edge => {
                const eventStream$ = nodeEventStreams.get(edge.from);
                if (!eventStream$) return EMPTY;

                return eventStream$.pipe(
                    filter(event => event.type === 'node_emit' && event.property === edge.fromProperty),
                    map(event => event.value)
                );
            });

            this.mergeEdgeSources(mode, sources, edges).subscribe(value => {
                targetSubject.next(value);
            });
        });
    }

    /**
     * 根据边模式合并多个源
     */
    private mergeEdgeSources(
        mode: EdgeMode,
        sources: Observable<any>[],
        edges: IEdge[]
    ): Observable<any> {
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
     * 触发入口节点
     */
    private triggerEntryNodes(
        workflow: WorkflowGraphAst,
        input$: Observable<any>,
        inputSubjects: Map<string, ReplaySubject<any>>
    ): void {
        // 确定入口节点
        const entryIds = workflow.entryNodeIds && workflow.entryNodeIds.length > 0
            ? workflow.entryNodeIds
            : this.findEntryNodes(workflow);

        // 将 input$ 分发给所有入口节点
        input$.subscribe(input => {
            entryIds.forEach(nodeId => {
                const subject = inputSubjects.get(nodeId);
                if (subject) {
                    subject.next(input || {});
                }
            });
        });
    }

    /**
     * 查找入口节点（入度为 0）
     */
    private findEntryNodes(workflow: WorkflowGraphAst): string[] {
        const inDegrees = new Map<string, number>();
        workflow.nodes.forEach(node => inDegrees.set(node.id, 0));
        workflow.edges.forEach(edge => {
            inDegrees.set(edge.to, (inDegrees.get(edge.to) ?? 0) + 1);
        });

        return Array.from(inDegrees.entries())
            .filter(([_, degree]) => degree === 0)
            .map(([nodeId]) => nodeId);
    }

    /**
     * 合并所有节点的事件流
     */
    private mergeNodeEventStreams(
        workflow: WorkflowGraphAst,
        nodeEventStreams: Map<string, Observable<NodeEvent>>,
        inputSubjects: Map<string, ReplaySubject<any>>
    ): Observable<NodeEvent> {
        const allStreams = Array.from(nodeEventStreams.values());

        if (allStreams.length === 0) {
            return of({
                type: 'node_success',
                id: workflow.id,
                data: { ...workflow, state: 'success' }
            } as NodeEvent);
        }

        return concat(
            merge(...allStreams),
            of({
                type: 'node_success',
                id: workflow.id,
                data: { ...workflow, state: 'success' }
            } as NodeEvent)
        ).pipe(
            finalize(() => {
                // 清理：关闭所有 Subject
                inputSubjects.forEach(subject => {
                    if (!subject.closed) {
                        subject.complete();
                    }
                });
            })
        );
    }

    /**
     * 克隆节点
     */
    private cloneNode(node: INode): INode {
        try {
            if (typeof structuredClone !== 'undefined') {
                return structuredClone(node);
            }
        } catch { }

        return clone(node) as INode;
    }
}

/**
 * 执行节点（便捷函数）
 */
export function executeAst(node: INode, input?: any, parent?: WorkflowGraphAst): Observable<NodeEvent> {
    const executor = root.get(NodeExecutor);
    return executor.run(node, of(input || {}), parent);
}

/**
 * 执行工作流（便捷函数）
 */
export function executeWorkflow(workflow: WorkflowGraphAst, input?: any): Observable<NodeEvent> {
    const executor = root.get(NodeExecutor);
    return executor.run(workflow, of(input || {}));
}

/**
 * 执行工作流（立即执行，返回 Promise）
 */
export function executeWorkflowImmediate(workflow: WorkflowGraphAst, input?: any): Promise<WorkflowGraphAst> {
    return new Promise((resolve, reject) => {
        let finalWorkflow = workflow;

        executeWorkflow(workflow, input).subscribe({
            next: (event) => {
                if (event.type === 'node_success' && event.id === workflow.id) {
                    finalWorkflow = event.data as WorkflowGraphAst;
                }
            },
            complete: () => resolve(finalWorkflow),
            error: reject
        });
    });
}

/**
 * 在工作流上下文中执行节点
 */
export function executeAstWithWorkflowGraph(node: INode, input: any, workflow: WorkflowGraphAst): Observable<NodeEvent> {
    const executor = root.get(NodeExecutor);
    return executor.run(node, of(input || {}), workflow);
}

/**
 * 单独执行节点（不依赖工作流）
 */
export function executeNodeIsolated(node: INode, input?: any): Observable<NodeEvent> {
    const executor = root.get(NodeExecutor);
    return executor.run(node, of(input || {}));
}
