import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboPostEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";
import { Handler, INode } from "@sker/workflow";
import { WeiboAjaxStatusesShowAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable } from "rxjs";
import { checkAbortSignal } from "./utils/abort-helper";

export interface WeiboAjaxStatusesShowAstReponse extends WeiboPostEntity {
    ok: number;
}

@Injectable()
export class WeiboAjaxStatusesShowAstVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(WeiboAjaxStatusesShowAst)
    visit(ast: WeiboAjaxStatusesShowAst, ctx: any): Observable<INode> {
        return new Observable<INode>(obs => {
            const handler = async () => {
                try {
                    // 检查取消信号
                    if (checkAbortSignal(ctx, ast)) {
                        obs.next({ ...ast });
                        obs.complete();
                        return;
                    }

                    ast.state = 'running';
                    obs.next({ ...ast });

                    const url = `https://weibo.com/ajax/statuses/show?id=${ast.mblogid}&locale=zh-CN&isGetLongText=true`;
                    const body = await this.fetchApi<WeiboAjaxStatusesShowAstReponse>({
                        url,
                        refererOptions: { uid: ast.uid, mid: ast.mblogid }
                    });

                    // 检查取消信号（网络请求后）
                    if (checkAbortSignal(ctx, ast)) {
                        obs.next({ ...ast });
                        obs.complete();
                        return;
                    }

                    await useEntityManager(async m => {
                        const user = m.create(WeiboUserEntity, body.user as any);
                        ast.uid = `${user.id}`;
                        await m.upsert(WeiboUserEntity, user as any, ['id']);

                        const post = m.create(WeiboPostEntity, body);
                        ast.mid = post.mid;

                        // 使用安全的 upsert 方式，处理可能的重复插入
                        try {
                            await m.upsert(WeiboPostEntity, post as any, ['id']);
                        } catch (error) {
                            // 如果 upsert 失败，尝试查找现有记录
                            const existingPost = await m.findOne(WeiboPostEntity, {
                                where: { id: post.id }
                            });

                            if (existingPost) {
                                // 如果记录已存在，更新它
                                await m.update(WeiboPostEntity, { id: post.id }, post as any);
                            } else {
                                // 如果记录不存在，重新抛出错误
                                throw error;
                            }
                        }
                    });

                    ast.state = 'emitting';
                    console.log(`[WeiboAjaxStatusesShowAstVisitor] 成功保存一条帖子`)
                    obs.next({ ...ast });

                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete()
                } catch (error) {
                    console.error(`[WeiboAjaxStatusesShowAstVisitor] postId: ${ast.id}`, error);
                    ast.state = 'fail';
                    ast.setError(error, process.env.NODE_ENV === 'development');
                    obs.next({ ...ast });
                    obs.complete()
                }
            };
            handler();
            return () => obs.complete();
        });
    }
}