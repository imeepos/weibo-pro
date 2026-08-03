import { Injectable, Inject } from '@sker/core';
import { Observable, EMPTY, of, combineLatest } from 'rxjs';
import { map, withLatestFrom, startWith } from 'rxjs/operators';
import { WorkflowGraphAst } from '../ast';
import { NodeEvent } from './events';
import { EdgeMode, IEdge, EDGE_MODE_PRIORITY } from '../types';
import { NodeInputBuilder } from './NodeInputBuilder';
import { EdgeStreamBuilder } from './EdgeStreamBuilder';
import { groupEdgesByMode } from './EdgeCombiner';
import { StreamMerger } from './StreamMerger';
import { EDGE_MODE_STRATEGY, IEdgeModeStrategy } from './EdgeModeStrategy';

/**
 * 工作流节点输入流构建器
 *
 * 核心设计：nodeInput$ = mergeWithCompletion(input$, router$, ...)
 * - 多个输入源通过 merge 合并值
 * - 只有当所有输入源都 complete 时，节点输入流才 complete
 * - 这确保了循环场景下，入口节点不会过早结束
 */
@Injectable()
export class WorkflowInputBuilder {
    constructor(
        @Inject(NodeInputBuilder) private nodeInputBuilder: NodeInputBuilder,
        @Inject(EdgeStreamBuilder) private edgeStreamBuilder: EdgeStreamBuilder,
        @Inject(StreamMerger) private streamMerger: StreamMerger,
        @Inject(EDGE_MODE_STRATEGY) private strategies: Map<EdgeMode, IEdgeModeStrategy>,
    ) { }

    /**
     * 构建每个节点的输入流
     */
    buildNodeInputStreams(
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
        const modeGroups = groupEdgesByMode(edges);

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
