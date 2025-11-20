import { Injectable } from "@sker/core";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, INode } from '@sker/workflow'
import { WeiboAjaxFeedHotTimelineAst } from '@sker/workflow-ast'
import { useEntityManager, WeiboPostEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { delay } from "./services/utils";
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
    constructor(accountService: WeiboAccountService) {
        super(accountService);
    }

    @Handler(WeiboAjaxFeedHotTimelineAst)
    visit(ast: WeiboAjaxFeedHotTimelineAst, _ctx: any): Observable<INode> {
        return new Observable<INode>(obs => {
            this.handler(ast, obs)
            return () => obs.complete()
        })
    }

    private async handler(ast: WeiboAjaxFeedHotTimelineAst, obs: Subscriber<INode>) {
        try {
            let pageCount = 0;
            ast.state = 'running';
            obs.next({ ...ast })
            while (true) {
                pageCount++;

                const url = this.buildUrl(ast);
                const body = await this.fetchApi<WeiboAjaxFeedHotTimelineResponse>({
                    url,
                    refererOptions: {}
                });
                const statuses = body?.statuses || [];
                if (statuses.length === 0) {
                    console.log(`[WeiboAjaxFeedHotTimelineAstVisitor] 没有更多数据，抓取完成`);
                    break;
                }
                await useEntityManager(async m => {
                    const users = statuses
                        .filter(item => item.user)
                        .map(item => m.create(WeiboUserEntity, item.user as any));

                    if (users.length > 0) {
                        await m.upsert(WeiboUserEntity, users as any[], ['id']);
                    }
                    const posts = statuses.map(item => m.create(WeiboPostEntity, item as any));
                    await m.upsert(WeiboPostEntity, posts as any[], ['id']);
                    posts.map(post => {
                        ast.state = 'emitting';  // 流式输出：每条数据发射触发下游
                        ast.mblogid = post.mblogid;
                        ast.uid = post.user.idstr;
                        obs.next({ ...ast })
                    });
                    console.log(`[WeiboAjaxFeedHotTimelineAstVisitor] 成功入库 ${posts.length} 条微博，${users.length} 个用户`);
                });

                if (body.max_id) ast.max_id = body.max_id;
                if (body.since_id) ast.since_id = body.since_id;

                await delay();
                break;
            }

            console.log(`[WeiboAjaxFeedHotTimelineAstVisitor] 完成，共抓取 ${pageCount} 页数据`);
            ast.state = 'success';  // 完成信号：不触发下游，仅更新工作流状态
            obs.next({...ast})
            obs.complete()
        } catch (error) {
            console.error(`[WeiboAjaxFeedHotTimelineAstVisitor] 抓取失败`, error);
            ast.state = 'fail';
            ast.setError(error);
            obs.next({...ast})
            obs.complete()
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
