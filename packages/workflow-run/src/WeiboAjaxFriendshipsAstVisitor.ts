import { Inject, Injectable } from "@sker/core";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, NodeEvent, setAstError } from "@sker/workflow";
import { WeiboAjaxFriendshipsAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";

export interface WeiboAjaxFriendshipsResponse {
    ok: number;
    data: Record<string, unknown>;
}

@Injectable()
export class WeiboAjaxFriendshipsAstVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(WeiboAjaxFriendshipsAst)
    visit(ast: WeiboAjaxFriendshipsAst, input$: Observable<Record<string, unknown>>, _ctx: Record<string, unknown>): Observable<NodeEvent> {
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

                    const url = `https://weibo.com/ajax/friendships/friends?page=${ast.page || 1}&uid=${ast.uid}`;
                    const body = await this.fetchApi<WeiboAjaxFriendshipsResponse>({
                        url,
                        refererOptions: { uid: ast.uid }
                    });

                    ast.isEnd = true;

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { isEnd: true, data: body.data } }
                    ];
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    console.error(`[WeiboAjaxFriendshipsAstVisitor] uid: ${ast.uid}`, error);
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
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
