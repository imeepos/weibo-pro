import { Injectable } from '@sker/core';
import { Observable, EMPTY } from 'rxjs';

/**
 * 流合并器
 *
 * 职责：
 * - 合并多个流，等待所有流完成才完成
 */
@Injectable()
export class StreamMerger {
    /**
     * 合并多个输入流，只有当所有流都 complete 时才 complete
     *
     * 与普通 merge 的区别：
     * - merge: 任一流 complete 不影响其他流，但整体 complete 时机不确定
     * - mergeWithCompletion: 合并所有值，只有当所有流都 complete 时才 complete
     *
     * 核心设计：nodeInput$ = mergeWithCompletion(input$, router$, ...)
     * - 多个输入源通过 merge 合并值
     * - 只有当所有输入源都 complete 时，节点输入流才 complete
     * - 这确保了循环场景下，入口节点不会过早结束
     */
    mergeWithCompletion(sources: Observable<any>[]): Observable<any> {
        if (sources.length === 0) return EMPTY;
        if (sources.length === 1) return sources[0]!;

        return new Observable(subscriber => {
            let completedCount = 0;
            const total = sources.length;

            const subscriptions = sources.map((source, _index) =>
                source.subscribe({
                    next: value => {
                        subscriber.next(value);
                    },
                    error: err => {
                        subscriber.error(err);
                    },
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
}
