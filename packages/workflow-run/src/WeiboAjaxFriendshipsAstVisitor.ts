import { Inject, Injectable } from "@sker/core";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, INode, setAstError } from "@sker/workflow";
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
    visit(ast: WeiboAjaxFriendshipsAst, _ctx: any): Observable<INode> {
        return new Observable<INode>(obs => {
            const handler = async () => {
                try {
                    ast.state = 'running';
                    ast.count += 1;
                    obs.next({ ...ast });

                    const url = `https://weibo.com/ajax/friendships/friends?page=${ast.page || 1}&uid=${ast.uid}`;
                    const body = await this.fetchApi<WeiboAjaxFriendshipsResponse>({
                        url,
                        refererOptions: { uid: ast.uid }
                    });

                    ast.isEnd.next(true);
                    obs.next({ ...ast });

                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete()
                } catch (error) {
                    console.error(`[WeiboAjaxFriendshipsAstVisitor] uid: ${ast.uid}`, error);
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ ...ast });
                    obs.complete()
                }
            };
            handler();
            return () => obs.complete();
        });
    }
}
