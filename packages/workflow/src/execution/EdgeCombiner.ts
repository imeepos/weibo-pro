import { Observable, EMPTY, merge, zip, combineLatest } from 'rxjs';
import { map, tap, withLatestFrom } from 'rxjs/operators';
import { EdgeMode, IEdge, EDGE_MODE_PRIORITY } from '../types';

/**
 * 边组合器
 *
 * 职责：
 * - 按 EdgeMode 分组边
 * - 按优先级合并模式组
 * - 构建 withLatestFrom 流
 */
export class EdgeCombiner {
    /**
     * 按 EdgeMode 分组边
     */
    groupEdgesByMode(edges: IEdge[]): Map<EdgeMode, IEdge[]> {
        const groups = new Map<EdgeMode, IEdge[]>();

        edges.forEach(edge => {
            const mode = edge.mode ?? EdgeMode.COMBINE_LATEST;
            if (!groups.has(mode)) {
                groups.set(mode, []);
            }
            groups.get(mode)!.push(edge);
        });

        return groups;
    }

    /**
     * 按优先级合并模式组
     *
     * 策略：
     * 1. 按 EdgeMode 分组边
     * 2. 每组边按其模式组合成一个流
     * 3. 多个模式组按优先级排序
     * 4. 使用 combineLatest 合并所有模式组的结果
     */
    combineGroupsByPriority(
        modeGroups: Map<EdgeMode, IEdge[]>,
        buildStream: (mode: EdgeMode, edges: IEdge[]) => Observable<any>
    ): Observable<any> {
        const groupStreams: Array<{ mode: EdgeMode; priority: number; stream$: Observable<any> }> = [];

        modeGroups.forEach((edgesInMode, mode) => {
            const stream$ = buildStream(mode, edgesInMode);
            if (stream$ !== EMPTY) {
                groupStreams.push({
                    mode,
                    priority: EDGE_MODE_PRIORITY[mode],
                    stream$
                });
            }
        });

        if (groupStreams.length === 0) return EMPTY;
        if (groupStreams.length === 1) return groupStreams[0]!.stream$;

        groupStreams.sort((a, b) => a.priority - b.priority);

        return combineLatest(groupStreams.map(g => g.stream$)).pipe(
            map(results => Object.assign({}, ...results))
        );
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
    buildWithLatestFrom(sources: Observable<any>[], edges: IEdge[]): Observable<any> {
        // 找到主流（isPrimary === true）
        const primaryIndex = edges.findIndex(edge => edge.isPrimary === true);

        if (primaryIndex === -1) {
            console.warn('[EdgeCombiner] 未找到主流（isPrimary=true），回退到 combineLatest');
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
