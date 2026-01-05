import { Observable, merge, zip, combineLatest } from 'rxjs';
import { map, tap, withLatestFrom } from 'rxjs/operators';
import { EdgeMode, IEdge } from '../types';

/**
 * 边模式组合策略接口
 */
export interface IEdgeModeStrategy {
    combine(sources: Observable<any>[], edges: IEdge[]): Observable<any>;
}

/**
 * MERGE 模式策略
 * 任一边发射值时立即触发，不等待其他边
 */
export class MergeStrategy implements IEdgeModeStrategy {
    combine(sources: Observable<any>[], edges: IEdge[]): Observable<any> {
        return merge(
            ...sources.map((source, sourceIndex) =>
                source.pipe(
                    tap(() => console.log(`[MergeStrategy] 边 ${edges[sourceIndex]!.toProperty} 发射值`)),
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
export class ZipStrategy implements IEdgeModeStrategy {
    combine(sources: Observable<any>[], edges: IEdge[]): Observable<any> {
        return zip(...sources).pipe(
            tap(() => console.log(`[ZipStrategy] 所有边都发射了值`)),
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
export class CombineLatestStrategy implements IEdgeModeStrategy {
    combine(sources: Observable<any>[], edges: IEdge[]): Observable<any> {
        return combineLatest(sources).pipe(
            tap(() => console.log(`[CombineLatestStrategy] 所有边都至少发射了一次值`)),
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
