import { Inject, Injectable } from "@sker/core";
import { WeiboAccountService } from "./services/weibo-account.service";
import { WeiboAjaxStatusesMymblogAst } from "@sker/workflow-ast";
import { Handler, INode, setAstError } from "@sker/workflow";
import { useEntityManager, WeiboPostEntity } from "@sker/entities";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable } from "rxjs";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";

export interface WeiboAjaxStatusesMymblogAstResponse {
    ok: number;
    data: {
        list: any[];
    }
}

@Injectable()
export class WeiboAjaxStatusesMymblogAstVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(WeiboAjaxStatusesMymblogAst)
    visit(ast: WeiboAjaxStatusesMymblogAst, _ctx: any): Observable<INode> {
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

                    for await (const body of this.fetchWithPagination<WeiboAjaxStatusesMymblogAstResponse>({
                        buildUrl: (page) => `https://weibo.com/ajax/statuses/mymblog?uid=${ast.uid}&page=${page}&feature=0`,
                        refererOptions: { uid: ast.uid },
                        shouldContinue: (data) => data.data.list.length > 0
                    })) {
                        // 检查取消信号（每次分页后）
                        if (wrappedCtx.abortSignal?.aborted) {
                            ast.state = 'fail';
                            setAstError(ast, new Error('工作流已取消'));
                            obs.next({ ...ast });
                            return;
                        }

                        await useEntityManager(async m => {
                            const posts = body.data.list.map(item => m.create(WeiboPostEntity, item));
                            await m.upsert(WeiboPostEntity, posts as any, ['id']);
                        });
                    }

                    ast.state = 'emitting';
                    ast.isEnd = true;
                    obs.next({ ...ast });

                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete()
                } catch (error) {
                    console.error(`[WeiboAjaxStatusesMymblogAstVisitor] uid: ${ast.uid}`, error);
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ ...ast });
                    obs.complete()
                }
            };
            handler();

            // 返回清理函数
            return () => {
                console.log('[WeiboAjaxStatusesMymblogAstVisitor] 订阅被取消，触发 AbortSignal');
                abortController.abort();
                obs.complete();
            };
        });
    }
}