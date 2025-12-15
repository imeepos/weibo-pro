import { Injectable } from '@sker/core'
import { Handler, LoopAst, NodeEvent } from '@sker/workflow'
import { Observable, from, of, EMPTY } from 'rxjs'
import { concatMap, delay, tap, finalize } from 'rxjs/operators'

/**
 * 循环节点执行器
 *
 * 逐个发射数组元素，支持批量和延迟控制
 */
@Injectable()
export class LoopAstVisitor {
    @Handler(LoopAst)
    visit(ast: LoopAst, input$: Observable<any>, ctx: any) {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            input$.pipe(
                tap(inputData => {
                    ast.emitCount += 1;
                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as any)[key] = inputData[key];
                        });
                    }
                }),
                concatMap(() => {
                    let items: any[] = ast.items;
                    if (!Array.isArray(items)) {
                        items = [items];
                    }
                    items = items.flat().filter(v => v != null);

                    const batchSize = Math.max(1, ast.batchSize || 1);
                    const delayMs = Math.max(0, ast.delay || 0);
                    const total = items.length;

                    ast.total += total;
                    obs.next({ type: 'node_emit', id: ast.id, property: 'total', value: ast.total });

                    if (total === 0) {
                        ast.done = true;
                        obs.next({ type: 'node_emit', id: ast.id, property: 'done', value: ast.done });
                        return EMPTY;
                    }

                    const chunks: any[] = [];
                    for (let i = 0; i < items.length; i += batchSize) {
                        chunks.push(
                            batchSize === 1
                                ? items[i]
                                : items.slice(i, Math.min(i + batchSize, items.length))
                        );
                    }

                    return from(chunks).pipe(
                        concatMap((batch, index) =>
                            of(batch).pipe(
                                delay(index === 0 ? 0 : delayMs),
                                tap(() => {
                                    ast.index = index * batchSize;
                                    ast.current = batch;
                                    obs.next({ type: 'node_emit', id: ast.id, property: 'index', value: ast.index });
                                    obs.next({ type: 'node_emit', id: ast.id, property: 'current', value: ast.current });
                                })
                            )
                        )
                    );
                }),
                finalize(() => {
                    ast.state = 'success';
                    ast.done = true;
                    obs.next({ type: 'node_emit', id: ast.id, property: 'done', value: ast.done });
                    obs.next({ type: 'node_success', id: ast.id, data: ast });
                    obs.complete();
                })
            ).subscribe({
                error: (error) => {
                    ast.state = 'fail';
                    obs.next({ type: 'node_fail', id: ast.id, data: ast });
                    obs.complete();
                }
            });
        });
    }
}
