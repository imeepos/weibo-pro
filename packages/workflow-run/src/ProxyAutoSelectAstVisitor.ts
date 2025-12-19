import { Inject, Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { ProxyAutoSelectAst } from '@sker/workflow-ast';
import { ProxyPool, type ProxyInfo } from '@sker/ip-proxy';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';

@Injectable()
export class ProxyAutoSelectAstVisitor {
    constructor(
        @Inject(ProxyPool) private readonly proxyPool: ProxyPool,
    ) { }

    @Handler(ProxyAutoSelectAst)
    visit(ast: ProxyAutoSelectAst, input$: Observable<Record<string, unknown>>, _ctx: Record<string, unknown>): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1;
                    obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                        });
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消');
                    }

                    await this.proxyPool.initialize(ast.initialCount);

                    const proxy = await this.proxyPool.getProxy();

                    const poolStatus = await this.proxyPool.getPoolStatus();

                    ast.proxyList = poolStatus.proxies.map((p: ProxyInfo) => ({
                        url: p.url,
                        provider: p.provider,
                        expiresAt: p.expiresAt,
                        useCount: 0
                    }));

                    ast.selectedProxyUrl = proxy.url;
                    ast.proxyUrl = proxy.url;
                    ast.proxyInfo = {
                        url: proxy.url,
                        provider: proxy.provider,
                        expiresAt: proxy.expiresAt
                    };

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { proxyUrl: proxy.url, proxyInfo: ast.proxyInfo } }
                    ];
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error, process.env.NODE_ENV === 'development');
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
                abortController.abort();
                obs.complete();
            };
        });
    }
}
