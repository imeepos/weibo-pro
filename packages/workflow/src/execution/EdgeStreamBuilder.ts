import { Observable, EMPTY, defer } from 'rxjs';
import { filter, map, tap, toArray } from 'rxjs/operators';
import { IEdge, INode, ROUTE_SKIPPED } from '../types';
import { NodeEmitEvent, NodeEvent } from './events';
import { evaluateTransform } from '../edge-transform';
import { Injectable, createLogger } from '@sker/core';
import { hasBufferMode } from '../decorator';

const logger = createLogger('EdgeStreamBuilder');

/**
 * 边流构建器
 *
 * 职责：
 * - 从边构建值流（提取 node_emit 事件的值）
 * - 应用边转换表达式
 * - 处理 ROUTE_SKIPPED 逻辑
 */
@Injectable()
export class EdgeStreamBuilder {
    /**
     * 从边构建值流
     *
     * @param edge 边定义
     * @param nodeEventStreams 所有节点的事件流映射
     * @param targetNode 目标节点，用于检查 IS_BUFFER 模式
     * @returns 边的值流
     */
    buildEdgeValueStream(
        edge: IEdge,
        nodeEventStreams: Map<string, Observable<NodeEvent>>,
        targetNode?: INode
    ): Observable<any> {
        // 使用 defer 延迟获取 eventStream，解决循环依赖
        return defer(() => {
            const eventStream$ = nodeEventStreams.get(edge.from);
            if (!eventStream$) {
                return EMPTY;
            }

            let valueStream$ = eventStream$.pipe(
                filter((event): event is NodeEmitEvent =>
                    event.type === 'node_emit' && edge.fromProperty! in (event.data || {})
                ),
                tap(event => {
                    logger.debug('[EdgeStreamBuilder] 边数据流:', {
                        edgeId: edge.id,
                        from: edge.from,
                        fromProperty: edge.fromProperty,
                        to: edge.to,
                        toProperty: edge.toProperty,
                        eventData: event.data
                    });
                }),
                map(event => this.extractAndTransformValue(event, edge))
            );

            // 检查目标端口是否有 IS_BUFFER 模式
            if (targetNode) {
                const inputMeta = targetNode.metadata?.inputs?.find(
                    (input: any) => input.property === edge.toProperty
                );
                if (hasBufferMode(inputMeta?.mode)) {
                    valueStream$ = valueStream$.pipe(toArray());
                }
            }

            return valueStream$;
        });
    }

    /**
     * 提取并转换边的值
     */
    private extractAndTransformValue(event: NodeEmitEvent, edge: IEdge): any {
        let value = event.data?.[edge.fromProperty!];

        // 应用边转换表达式
        if (edge.transform) {
            value = evaluateTransform(value, edge.transform);
        }

        return value;
    }

    /**
     * 过滤掉 ROUTE_SKIPPED 的值
     */
    filterRouteSkipped(stream$: Observable<any>): Observable<any> {
        return stream$.pipe(
            filter(value => value !== ROUTE_SKIPPED)
        );
    }
}
