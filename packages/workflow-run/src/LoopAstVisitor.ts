import { Injectable } from '@sker/core'
import { Handler, LoopAst, NodeEvent, setAstError } from '@sker/workflow'
import { Observable, from, of, EMPTY } from 'rxjs'
import { concatMap, delay, mergeMap } from 'rxjs/operators'

/**
 * 循环节点执行器
 *
 * 逐个发射数组元素，支持批量和延迟控制
 */
@Injectable()
export class LoopAstVisitor {
    @Handler(LoopAst)
    visit(ast: LoopAst, input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>) {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            ast.total = 0;
            ast.done = false;
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1;
                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                        });
                    }

                    let items: unknown[] = ast.items;
                    if (!Array.isArray(items)) {
                        items = [items];
                    }
                    items = items.flat().filter(v => v != null);

                    const batchSize = Math.max(1, ast.batchSize || 1);
                    const delayMs = Math.max(0, ast.delay || 0);
                    const total = items.length;

                    ast.total += total;

                    const events: NodeEvent[] = [
                        { type: 'node_emit', id: ast.id, data: { total: ast.total } }
                    ];

                    if (total === 0) {
                        ast.done = true;
                        events.push({ type: 'node_emit', id: ast.id, data: { done: ast.done } });
                        return events;
                    }

                    const chunks: unknown[] = [];
                    for (let i = 0; i < items.length; i += batchSize) {
                        chunks.push(
                            batchSize === 1
                                ? items[i]
                                : items.slice(i, Math.min(i + batchSize, items.length))
                        );
                    }

                    for (let index = 0; index < chunks.length; index++) {
                        if (index > 0) {
                            await new Promise(resolve => setTimeout(resolve, delayMs));
                        }

                        const batch = chunks[index];
                        ast.index = index * batchSize;
                        ast.current = batch;
                        events.push({
                            type: 'node_emit',
                            id: ast.id,
                            data: { index: ast.index, current: ast.current }
                        });
                    }

                    ast.done = true;
                    events.push({ type: 'node_emit', id: ast.id, data: { done: ast.done } });

                    return events;
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete();
                }
            });

            return () => {
                subscription.unsubscribe();
                obs.complete();
            };
        });
    }
}
