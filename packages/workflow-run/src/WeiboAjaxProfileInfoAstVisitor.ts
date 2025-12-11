import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, INode, setAstError } from "@sker/workflow";
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
            // 创建专门的 AbortController
            const abortController = new AbortController();

            // 包装 ctx
            const wrappedCtx = {
                ..._ctx,
                abortSignal: abortController.signal
            };

            const handler = async () => {
                try {
                    // 检查取消信号
                    if (wrappedCtx.abortSignal?.aborted) {
                        ast.state = 'fail';
                        setAstError(ast, new Error('工作流已取消'));
                        obs.next({ ...ast });
                        return;
                    }

                    ast.state = 'running';
                    ast.count += 1;
                    obs.next({ ...ast });

                    const url = `https://weibo.com/ajax/profile/info?uid=${ast.uid}`;
                    const body = await this.fetchApi<WeiboAjaxProfileInfoAstResponse>({
                        url,
                        refererOptions: { uid: ast.uid }
                    });

                    // 检查取消信号（网络请求后）
                    if (wrappedCtx.abortSignal?.aborted) {
                        ast.state = 'fail';
                        setAstError(ast, new Error('工作流已取消'));
                        obs.next({ ...ast });
                        return;
                    }

                    await useEntityManager(async m => {
                        const user = m.create(WeiboUserEntity, body.data.user as any);
                        ast.uid = `${user.id}`;
                        await m.upsert(WeiboUserEntity, user as any, ['id']);
                    });

                    await this.fetchDetail(ast, wrappedCtx);
                    ast.isEnd.next(true);
                    obs.next({ ...ast });

                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete()
                } catch (error) {
                    console.error(`[WeiboAjaxProfileInfoAstVisitor] uid: ${ast.uid}`, error);
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ ...ast });
                    obs.complete()
                }
            };
            handler();

            // 返回清理函数
            return () => {
                console.log('[WeiboAjaxProfileInfoAstVisitor] 订阅被取消，触发 AbortSignal');
                abortController.abort();
                obs.complete();
            };
        });
    }

    private async fetchDetail(ast: WeiboAjaxProfileInfoAst, _ctx: any) {
        // 检查取消信号
        if (_ctx.abortSignal?.aborted) {
            console.log('[WeiboAjaxProfileInfoAstVisitor] fetchDetail 已取消');
            return;
        }

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
