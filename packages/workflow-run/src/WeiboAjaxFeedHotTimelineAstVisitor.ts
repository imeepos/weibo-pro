import { Inject, Injectable } from "@sker/core";
import { WeiboAccountService } from "./services/weibo-account.service";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";
import { Handler, INode } from '@sker/workflow'
import { WeiboAjaxFeedHotTimelineAst } from '@sker/workflow-ast'
import { useEntityManager, WeiboPostEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable, Subscriber } from 'rxjs'
export interface WeiboAjaxFeedHotTimelineResponse {
    readonly ok: number;
    statuses: WeiboPostEntity[];
    since_id: string;
    max_id: string;
    total_number: number;
}

@Injectable()
export class WeiboAjaxFeedHotTimelineAstVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(WeiboAjaxFeedHotTimelineAst)
    visit(ast: WeiboAjaxFeedHotTimelineAst, _ctx: any): Observable<INode> {
        return new Observable<INode>(obs => {
            // 创建专门的 AbortController
            const abortController = new AbortController();

            // 包装 ctx
            const wrappedCtx = {
                ..._ctx,
                abortSignal: abortController.signal
            };

            this.handler(ast, obs, wrappedCtx);

            // 返回清理函数
            return () => {
                console.log('[WeiboAjaxFeedHotTimelineAstVisitor] 订阅被取消，触发 AbortSignal');
                abortController.abort();
                obs.complete();
            };
        });
    }

    private async handler(ast: WeiboAjaxFeedHotTimelineAst, obs: Subscriber<INode>, ctx: any) {
        try {
            // 检查取消信号
            if (ctx.abortSignal?.aborted) {
                ast.state = 'fail';
                ast.setError(new Error('工作流已取消'));
                obs.next({ ...ast });
                return;
            }

            let pageCount = 0;
            ast.count += 1;
            ast.state = 'running';
            obs.next({ ...ast });

            while (true) {
                // 检查取消信号（循环开始）
                if (ctx.abortSignal?.aborted) {
                    ast.state = 'fail';
                    ast.setError(new Error('工作流已取消'));
                    obs.next({ ...ast });
                    return;
                }

                pageCount++;

                const url = this.buildUrl(ast);
                const body = await this.fetchApi<WeiboAjaxFeedHotTimelineResponse>({
                    url,
                    refererOptions: {}
                });

                // 检查取消信号（网络请求后）
                if (ctx.abortSignal?.aborted) {
                    ast.state = 'fail';
                    ast.setError(new Error('工作流已取消'));
                    obs.next({ ...ast });
                    return;
                }

                const statuses = body?.statuses || [];
                if (statuses.length === 0) {
                    console.log(`[WeiboAjaxFeedHotTimelineAstVisitor] 没有更多数据，抓取完成`);
                    break;
                }

                await useEntityManager(async m => {
                    const uniqueUsers = Array.from(
                        new Map(
                            statuses
                                .filter(item => item.user)
                                .map(item => [item.user.id, item.user])
                        ).values()
                    );
                    const users = uniqueUsers.map(user => m.create(WeiboUserEntity, user as any));

                    if (users.length > 0) {
                        await m.upsert(WeiboUserEntity, users as any[], ['id']);
                    }
                    const posts = statuses.map(item => m.create(WeiboPostEntity, item as any));
                    await m.upsert(WeiboPostEntity, posts as any[], ['id']);
                    posts.map(post => {
                        ast.state = 'emitting';  // 流式输出：每条数据发射触发下游
                        ast.mblogid = post.mblogid;
                        ast.uid = post.user.idstr;
                        obs.next({ ...ast });
                    });
                    console.log(`[WeiboAjaxFeedHotTimelineAstVisitor] 成功入库 ${posts.length} 条微博，${users.length} 个用户`);
                });

                if (body.max_id) ast.max_id = body.max_id;
                if (body.since_id) ast.since_id = body.since_id;

                await this.delayService.randomDelay(3, 5);
                break;
            }

            console.log(`[WeiboAjaxFeedHotTimelineAstVisitor] 完成，共抓取 ${pageCount} 页数据`);
            ast.state = 'success';  // 完成信号：不触发下游，仅更新工作流状态
            obs.next({ ...ast });
            obs.complete();
        } catch (error) {
            console.error(`[WeiboAjaxFeedHotTimelineAstVisitor] 抓取失败`, error);
            ast.state = 'fail';
            ast.setError(error);
            obs.next({ ...ast });
            obs.complete();
        }
        return ast;
    }

    private buildUrl(ast: WeiboAjaxFeedHotTimelineAst): string {
        const url = new URL('https://weibo.com/ajax/feed/hottimeline');
        url.searchParams.set('since_id', ast.since_id);
        url.searchParams.set('refresh', String(ast.refresh));
        url.searchParams.set('group_id', ast.group_id);
        url.searchParams.set('containerid', ast.containerid);
        url.searchParams.set('extparam', ast.extparam);
        url.searchParams.set('max_id', ast.max_id);
        url.searchParams.set('count', String(ast.count));
        return url.toString();
    }
}
