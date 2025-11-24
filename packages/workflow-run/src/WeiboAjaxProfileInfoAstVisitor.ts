import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, INode } from "@sker/workflow";
import { WeiboAjaxProfileInfoAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable } from "rxjs";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";

export interface WeiboAjaxProfileInfoAstResponse {
    ok: number;
    data: {
        user: WeiboUserEntity;
    }
}

export interface WeiboAjaxProfileDetailResponse {
    ok: number;
    data: any;
}

@Injectable()
export class WeiboAjaxProfileInfoAstVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(WeiboAjaxProfileInfoAst)
    visit(ast: WeiboAjaxProfileInfoAst, _ctx: any): Observable<INode> {
        return new Observable<INode>(obs => {
            const handler = async () => {
                try {
                    ast.state = 'running';
                    ast.count += 1;
                    obs.next({ ...ast });

                    const url = `https://weibo.com/ajax/profile/info?uid=${ast.uid}`;
                    const body = await this.fetchApi<WeiboAjaxProfileInfoAstResponse>({
                        url,
                        refererOptions: { uid: ast.uid }
                    });

                    await useEntityManager(async m => {
                        const user = m.create(WeiboUserEntity, body.data.user as any);
                        ast.uid = `${user.id}`;
                        await m.upsert(WeiboUserEntity, user as any, ['id']);
                    });

                    await this.fetchDetail(ast, _ctx);

                    ast.state = 'emitting';
                    ast.isEnd = true;
                    obs.next({ ...ast });

                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete()
                } catch (error) {
                    console.error(`[WeiboAjaxProfileInfoAstVisitor] uid: ${ast.uid}`, error);
                    ast.state = 'fail';
                    ast.setError(error);
                    obs.next({ ...ast });
                    obs.complete()
                }
            };
            handler();
            return () => obs.complete();
        });
    }

    private async fetchDetail(ast: WeiboAjaxProfileInfoAst, _ctx: any) {
        const url = `https://weibo.com/ajax/profile/detail?uid=${ast.uid}`;
        const body = await this.fetchApi<WeiboAjaxProfileDetailResponse>({
            url,
            refererOptions: { uid: ast.uid }
        });

        await useEntityManager(async m => {
            const user = m.create(WeiboUserEntity, { detail: body.data, id: Number(ast.uid) });
            await m.upsert(WeiboUserEntity, user as any, ['id']);
        });
    }
}
