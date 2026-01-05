import { Observable, EMPTY, defer } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { IEdge, ROUTE_SKIPPED } from '../types';
import { NodeEmitEvent, NodeEvent } from './events';
import { evaluateTransform } from '../edge-transform';
import { Injectable } from '@sker/core';

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
     * @returns 边的值流
     */
    buildEdgeValueStream(
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
                tap(() => {
                    console.log(`[EdgeStreamBuilder] 边 ${edge.fromProperty} → ${edge.toProperty} 收到值`);
                }),
                map(event => this.extractAndTransformValue(event, edge))
            );
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
