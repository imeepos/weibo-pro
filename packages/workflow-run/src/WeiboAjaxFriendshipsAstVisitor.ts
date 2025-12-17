import { Inject, Injectable } from "@sker/core";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, NodeEvent, setAstError } from "@sker/workflow";
import { WeiboAjaxFriendshipsAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable } from "rxjs";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";

export interface WeiboAjaxFriendshipsResponse {
    ok: number;
    data: any;
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
    visit(ast: WeiboAjaxFriendshipsAst, input$: Observable<any>, _ctx: any): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            input$.subscribe({
                next: (inputData) => {
                    ast.emitCount += 1;
                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as any)[key] = inputData[key];
                        });
                    }
                },
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    obs.complete();
                },
                complete: async () => {
                    const handler = async () => {
                        try {
                            const url = `https://weibo.com/ajax/friendships/friends?page=${ast.page || 1}&uid=${ast.uid}`;
                            const body = await this.fetchApi<WeiboAjaxFriendshipsResponse>({
                                url,
                                refererOptions: { uid: ast.uid }
                            });

                            ast.isEnd = true;
                            obs.next({ type: 'node_runing', id: ast.id });

                            ast.state = 'success';
                            obs.next({ type: 'node_success', id: ast.id });
                            obs.complete()
                        } catch (error) {
                            console.error(`[WeiboAjaxFriendshipsAstVisitor] uid: ${ast.uid}`, error);
                            ast.state = 'fail';
                            setAstError(ast, error);
                            obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                            obs.complete()
                        }
                    };
                    handler();
                }
            });

            return () => obs.complete();
        });
    }
}
