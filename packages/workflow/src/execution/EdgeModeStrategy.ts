import { Observable, merge, zip, combineLatest } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
import { EdgeMode, IEdge } from '../types';
import { Injectable, MapInjectionToken, Provider } from '@sker/core';

/**
 * 边模式组合策略接口
 */
export interface IEdgeModeStrategy {
    combine(sources: Observable<any>[], edges: IEdge[]): Observable<any>;
}
export const EDGE_MODE_STRATEGY = new MapInjectionToken<EdgeMode, IEdgeModeStrategy>(`EDGE_MODE_STRATEGY`, {
    factory: () => {
        const map = new Map()
        return map;
    }
})
/**
 * MERGE 模式策略
 * 任一边发射值时立即触发，不等待其他边
 */
@Injectable()
export class MergeStrategy implements IEdgeModeStrategy {
    combine(sources: Observable<any>[], edges: IEdge[]): Observable<any> {
        return merge(
            ...sources.map((source, sourceIndex) =>
                source.pipe(
                    map(value => ({ [edges[sourceIndex]!.toProperty!]: value }))
                )
            )
        );
    }
}

/**
 * ZIP 模式策略
 * 等待所有边都发射第 N 个值后，组合成第 N 个输出
 */
@Injectable()
export class ZipStrategy implements IEdgeModeStrategy {
    combine(sources: Observable<any>[], edges: IEdge[]): Observable<any> {
        return zip(...sources).pipe(
            map(values => this.mapToObject(values, edges))
        );
    }

    private mapToObject(values: any[], edges: IEdge[]): Record<string, any> {
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
    }
}

/**
 * COMBINE_LATEST 模式策略（默认）
 * 等待所有边都至少发射一次值后，任一边发射新值时触发
 */
@Injectable()
export class CombineLatestStrategy implements IEdgeModeStrategy {
    combine(sources: Observable<any>[], edges: IEdge[]): Observable<any> {
        return combineLatest(sources).pipe(
            map(values => this.mapToObject(values, edges))
        );
    }

    private mapToObject(values: any[], edges: IEdge[]): Record<string, any> {
        const result: Record<string, any> = {};
        values.forEach((value, index) => {
            const prop = edges[index]?.toProperty;
            if (prop) result[prop] = value;
        });
        return result;
    }
}

/**
 * WITH_LATEST_FROM 模式策略
 * 主流触发，携带辅流最新值
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
@Injectable()
export class WithLatestFromStrategy implements IEdgeModeStrategy {
    combine(sources: Observable<any>[], edges: IEdge[]): Observable<any> {
        // 找到主流（isPrimary === true）
        const primaryIndex = edges.findIndex(edge => edge.isPrimary === true);

        if (primaryIndex === -1) {
            console.warn('[WithLatestFromStrategy] 未找到主流（isPrimary=true），回退到 combineLatest');
            return this.fallbackToCombineLatest(sources, edges);
        }

        // 分离主流和辅流
        const primarySource = sources[primaryIndex]!;
        const secondarySources = sources.filter((_, i) => i !== primaryIndex);
        const primaryEdge = edges[primaryIndex]!;
        const secondaryEdges = edges.filter((_, i) => i !== primaryIndex);

        if (secondarySources.length === 0) {
            // 只有主流，直接返回
            return primarySource.pipe(
                map(value => ({ [primaryEdge.toProperty!]: value }))
            );
        }

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
     * 回退到 combineLatest（当未找到主流时）
     */
    private fallbackToCombineLatest(sources: Observable<any>[], edges: IEdge[]): Observable<any> {
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
}


export const providers: Provider[] = [
    { provide: EDGE_MODE_STRATEGY, useClass: MergeStrategy, multi: 'map', mapKey: EdgeMode.MERGE },
    { provide: EDGE_MODE_STRATEGY, useClass: ZipStrategy, multi: 'map', mapKey: EdgeMode.ZIP },
    { provide: EDGE_MODE_STRATEGY, useClass: CombineLatestStrategy, multi: 'map', mapKey: EdgeMode.COMBINE_LATEST },
    { provide: EDGE_MODE_STRATEGY, useClass: WithLatestFromStrategy, multi: 'map', mapKey: EdgeMode.WITH_LATEST_FROM },
]

