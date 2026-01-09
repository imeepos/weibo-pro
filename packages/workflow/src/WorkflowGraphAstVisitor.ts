import { Injectable, Inject } from '@sker/core';
import { Observable, EMPTY, of, isObservable, throwError, merge, zip, combineLatest } from 'rxjs';
import { map, catchError, shareReplay, concatMap, filter, tap, withLatestFrom, startWith } from 'rxjs/operators';
import { NodeExecutor } from './executor';
import { Handler } from './decorator';
import { WorkflowGraphAst } from './ast';
import { NodeEvent } from './execution/events';
import { EdgeMode, IEdge, ROUTE_SKIPPED, EDGE_MODE_PRIORITY } from './types';
import { NodeInputBuilder } from './execution/NodeInputBuilder';
import { EdgeStreamBuilder } from './execution/EdgeStreamBuilder';
import { EdgeCombiner } from './execution/EdgeCombiner';
import { StreamMerger } from './execution/StreamMerger';
import { WorkflowEventMerger } from './execution/WorkflowEventMerger';
import { EDGE_MODE_STRATEGY, IEdgeModeStrategy } from './execution/EdgeModeStrategy';

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
 *
 * 重构后职责：
 * - 协调各个辅助类完成工作流执行
 * - 保持 handler 方法简洁清晰
 */
@Injectable()
export class WorkflowGraphAstVisitor {
    constructor(
        @Inject(NodeExecutor) private nodeExecutor: NodeExecutor,
        @Inject(NodeInputBuilder) private nodeInputBuilder: NodeInputBuilder,
        @Inject(EdgeStreamBuilder) private edgeStreamBuilder: EdgeStreamBuilder,
        @Inject(EdgeCombiner) private edgeCombiner: EdgeCombiner,
        @Inject(StreamMerger) private streamMerger: StreamMerger,
        @Inject(WorkflowEventMerger) private workflowEventMerger: WorkflowEventMerger,
        @Inject(EDGE_MODE_STRATEGY) private strategies: Map<EdgeMode, IEdgeModeStrategy>,
    ) { }

    @Handler(WorkflowGraphAst)
    handler(ast: WorkflowGraphAst, input$: Observable<any>, _parent?: WorkflowGraphAst): Observable<NodeEvent> {
        if (!input$) throw new Error(`[WorkflowGraphAstVisitor.handler] input$ is empty`)
        if (!isObservable(input$)) throw new Error(`[WorkflowGraphAstVisitor.handler] input$ must be an Observable`)

        return input$.pipe(
            concatMap(input => {
                ast.state = 'running';
                ast.error = undefined;

                const nodeEventStreams = new Map<string, Observable<NodeEvent>>();

                // 1. 构建每个节点的输入流（合并系统输入和边输入）
                const nodeInputStreams = this.buildNodeInputStreams(ast, of(input), nodeEventStreams);

                // 2. 为每个节点创建执行流
                ast.nodes.forEach((node, index) => {
                    const nodeInput$ = nodeInputStreams.get(node.id) || EMPTY;

                    const eventStream$ = this.nodeExecutor.run(node, nodeInput$, ast).pipe(
                        shareReplay({ bufferSize: Infinity, refCount: false })
                    );
                    nodeEventStreams.set(node.id, eventStream$);
                });

                // 3. 合并所有事件流
                return this.workflowEventMerger.mergeNodeEventStreams(ast, nodeEventStreams);
            }),
            catchError(error => {
                ast.state = 'fail';
                ast.error = error;
                // 发射 node_fail 事件和包含 null 的 node_emit 事件，让下游节点继续处理
                return of(
                    { type: 'node_fail' as const, id: ast.id, error: (error as Error).message },
                    { type: 'node_emit' as const, id: ast.id, data: {} }
                );
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

        // 识别入口节点
        const entryIds = workflow.entryNodeIds?.length
            ? workflow.entryNodeIds
            : this.nodeInputBuilder.findEntryNodes(workflow);

        // 按目标节点分组边
        const edgesByTarget = this.nodeInputBuilder.groupEdgesByTarget(workflow.edges);

        workflow.nodes.forEach(node => {
            const edges = edgesByTarget.get(node.id) || [];
            const isEntry = entryIds.includes(node.id);
            const inputSources: Observable<any>[] = [];

            // 1. 入口节点：添加系统输入流
            if (isEntry) {
                const entryInput$ = systemInput$.pipe(
                    map(input => this.nodeInputBuilder.buildNodeInput(node, input))
                );
                inputSources.push(entryInput$);
            }

            // 2. 分离普通边和 router 边
            const { normalEdges, routerEdges } = this.nodeInputBuilder.separateEdgesByType(edges, workflow);

            // 3. 普通边：按 EdgeMode 组合
            if (normalEdges.length > 0) {
                const normalInput$ = this.buildNormalEdgesInput(workflow, normalEdges, nodeEventStreams, node);
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
                    edges,
                    node
                );
                if (routerInput$ !== EMPTY) {
                    inputSources.push(routerInput$);
                }
            });

            // 5. 合并所有输入源（等待所有源 complete）
            if (inputSources.length === 0) {
                // 没有输入源：使用节点自身的静态值作为初始输入
                const staticInput = this.nodeInputBuilder.buildNodeInput(node, {});
                nodeInputStreams.set(node.id, of(staticInput));
            } else if (inputSources.length === 1) {
                nodeInputStreams.set(node.id, inputSources[0]!);
            } else {
                nodeInputStreams.set(node.id, this.streamMerger.mergeWithCompletion(inputSources));
            }
        });

        return nodeInputStreams;
    }

    /**
     * 构建普通边的输入流（按 EdgeMode 组合）
     */
    private buildNormalEdgesInput(
        workflow: WorkflowGraphAst,
        edges: IEdge[],
        nodeEventStreams: Map<string, Observable<NodeEvent>>,
        targetNode: any
    ): Observable<any> {
        if (edges.length === 0) return EMPTY;

        // 验证端口边数量
        this.nodeInputBuilder.validatePortEdges(targetNode, edges);

        // 按 EdgeMode 分组
        const modeGroups = this.edgeCombiner.groupEdgesByMode(edges);

        // 为每个模式组构建流
        const groupStreams: Array<{ mode: EdgeMode; priority: number; stream$: Observable<any> }> = [];

        modeGroups.forEach((edgesInMode, mode) => {
            const stream$ = this.combineEdgesByMode(workflow, mode, edgesInMode, nodeEventStreams, targetNode);
            if (stream$ !== EMPTY) {
                groupStreams.push({
                    mode,
                    priority: EDGE_MODE_PRIORITY[mode],
                    stream$
                });
            }
        });

        // 按优先级合并所有模式组
        if (groupStreams.length === 0) return EMPTY;
        if (groupStreams.length === 1) return groupStreams[0]!.stream$;

        groupStreams.sort((a, b) => a.priority - b.priority);

        return combineLatest(groupStreams.map(g => g.stream$)).pipe(
            map(results => Object.assign({}, ...results))
        );
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
        allEdgesToTarget: IEdge[],
        targetNode?: any
    ): Observable<any> {
        const valueStream$ = this.edgeStreamBuilder.buildEdgeValueStream(edge, nodeEventStreams, targetNode);
        if (valueStream$ === EMPTY) return EMPTY;

        // 过滤 ROUTE_SKIPPED
        const filteredStream$ = this.edgeStreamBuilder.filterRouteSkipped(valueStream$);

        // 获取目标节点的其他非 router 输入边
        const otherEdges = this.getOtherNonRouterEdges(workflow, edge, allEdgesToTarget);

        // 如果没有其他输入边，直接返回 router 边的值
        if (otherEdges.length === 0) {
            return filteredStream$.pipe(
                map(value => ({ [edge.toProperty!]: value }))
            );
        }

        // 构建其他边的值流并携带
        return this.buildRouterWithOtherEdges(filteredStream$, edge, otherEdges, nodeEventStreams, targetNode);
    }

    /**
     * 获取其他非 router 边
     */
    private getOtherNonRouterEdges(
        workflow: WorkflowGraphAst,
        currentEdge: IEdge,
        allEdges: IEdge[]
    ): IEdge[] {
        return allEdges.filter(e => {
            if (e.id === currentEdge.id) return false; // 排除自己
            const sourceNode = workflow.nodes.find(n => n.id === e.from);
            const outputMeta = sourceNode?.metadata?.outputs?.find(
                (out: any) => out.property === e.fromProperty
            );
            return !outputMeta?.isRouter; // 只包含非 router 边
        });
    }

    /**
     * 构建 router 边携带其他边的值流
     */
    private buildRouterWithOtherEdges(
        routerStream$: Observable<any>,
        routerEdge: IEdge,
        otherEdges: IEdge[],
        nodeEventStreams: Map<string, Observable<NodeEvent>>,
        targetNode?: any
    ): Observable<any> {
        const otherValueStreams = otherEdges
            .map(e => this.edgeStreamBuilder.buildEdgeValueStream(e, nodeEventStreams, targetNode))
            .filter(s => s !== EMPTY)
            // 关键：给每个流添加 startWith(undefined)，确保 withLatestFrom 不会等待
            .map(s => s.pipe(startWith(undefined)));

        if (otherValueStreams.length === 0) {
            return routerStream$.pipe(
                map(value => ({ [routerEdge.toProperty!]: value }))
            );
        }

        // 使用 withLatestFrom 而不是 combineLatest
        // withLatestFrom 只在主流（router）发射时触发，并携带其他流的最新值
        // startWith(undefined) 确保即使其他流还没发射过值，router 也能立即触发
        return routerStream$.pipe(
            withLatestFrom(...otherValueStreams),
            map(([routerValue, ...otherValues]) => {
                const result: Record<string, any> = {};
                result[routerEdge.toProperty!] = routerValue;
                otherValues.forEach((value, index) => {
                    const otherEdge = otherEdges[index];
                    if (otherEdge?.toProperty && value !== undefined) {
                        result[otherEdge.toProperty] = value;
                    }
                });
                return result;
            })
        );
    }

    /**
     * 按 EdgeMode 组合边的值流
     */
    private combineEdgesByMode(
        workflow: WorkflowGraphAst,
        mode: EdgeMode,
        edges: IEdge[],
        nodeEventStreams: Map<string, Observable<NodeEvent>>,
        targetNode?: any
    ): Observable<any> {
        const sources = edges
            .map(edge => this.edgeStreamBuilder.buildEdgeValueStream(edge, nodeEventStreams, targetNode))
            .filter(s => s !== EMPTY);

        if (sources.length === 0) return EMPTY;
        // 使用策略模式处理所有 EdgeMode
        const strategy = this.strategies.get(mode) || this.strategies.get(EdgeMode.COMBINE_LATEST);
        return strategy!.combine(sources, edges);
    }
}