import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboRepostEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, INode } from "@sker/workflow";
import { WeiboAjaxStatusesRepostTimelineAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable } from "rxjs";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";

export interface WeiboAjaxStatusesRepostTimelineResponse {
    readonly ok: number
    readonly data: WeiboRepostEntity[]
    readonly max_page: number
    readonly next_cursor: number
    readonly total_number: number;
}

@Injectable()
export class WeiboAjaxStatusesRepostTimelineAstVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(WeiboAjaxStatusesRepostTimelineAst)
    visit(ast: WeiboAjaxStatusesRepostTimelineAst, _ctx: any): Observable<INode> {
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
                        ast.setError(new Error('工作流已取消'));
                        obs.next({ ...ast });
                        return;
                    }

                    ast.state = 'running';
                    ast.count += 1;
                    obs.next({ ...ast });

                    let page = 1;
                    for await (const body of this.fetchWithPagination<WeiboAjaxStatusesRepostTimelineResponse>({
                        buildUrl: (p) => {
                            page = p;
                            return `https://weibo.com/ajax/statuses/repostTimeline?id=${ast.mid}&page=${p}&moduleID=feed&count=10`;
                        },
                        refererOptions: { uid: ast.uid, mid: ast.mid },
                        shouldContinue: (data) => data.data.length > 0
                    })) {
                        // 检查取消信号（每次分页后）
                        if (wrappedCtx.abortSignal?.aborted) {
                            ast.state = 'fail';
                            ast.setError(new Error('工作流已取消'));
                            obs.next({ ...ast });
                            return;
                        }

                        await useEntityManager(async m => {
                            const uniqueUsers = Array.from(
                                new Map(body.data.map(item => [item.user.id, item.user])).values()
                            );
                            const users = uniqueUsers.map(user => m.create(WeiboUserEntity, user));
                            await m.upsert(WeiboUserEntity, users as any[], ['id']);

                            const entities = body.data.map(item => m.create(WeiboRepostEntity, item));
                            console.log(`[WeiboAjaxStatusesRepostTimelineAstVisitor] ${page} 页 共${entities.length}条数据`);
                            await m.upsert(WeiboRepostEntity, entities as any[], ['id']);
                        });
                    }

                    ast.state = 'emitting';
                    ast.is_end = true;
                    obs.next({ ...ast });

                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete()
                } catch (error) {
                    console.error(`[WeiboAjaxStatusesRepostTimelineAstVisitor] mid: ${ast.mid}`, error);
                    ast.state = 'fail';
                    ast.setError(error, process.env.NODE_ENV === 'development');
                    obs.next({ ...ast });
                    obs.complete()
                }
            };
            handler();

            // 返回清理函数
            return () => {
                console.log('[WeiboAjaxStatusesRepostTimelineAstVisitor] 订阅被取消，触发 AbortSignal');
                abortController.abort();
                obs.complete();
            };
        });
    }
}