import { Injectable } from "@sker/core";
import { WeiboAccountService } from "./weibo-account.service";
import { Handler } from '@sker/workflow'
import { WeiboAjaxFeedHotTimelineAst } from '@sker/workflow-ast'
import { useEntityManager, WeiboPostEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboApiClient } from "./weibo-api-client.base";
import { delay } from "./utils";

export interface WeiboAjaxFeedHotTimelineResponse {
    readonly ok: number;
    readonly data: {
        statuses: WeiboPostEntity[];
        since_id: string;
        max_id: string;
        total_number: number;
    };
}

@Injectable()
export class WeiboAjaxFeedHotTimelineAstVisitor extends WeiboApiClient {
    constructor(accountService: WeiboAccountService) {
        super(accountService);
    }

    @Handler(WeiboAjaxFeedHotTimelineAst)
    async visit(ast: WeiboAjaxFeedHotTimelineAst, _ctx: any) {
        try {
            let pageCount = 0;

            while (true) {
                pageCount++;

                const url = this.buildUrl(ast);
                const body = await this.fetchApi<WeiboAjaxFeedHotTimelineResponse>({
                    url,
                    refererOptions: {}
                });

                const statuses = body.data?.statuses || [];

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

                    console.log(`[WeiboAjaxFeedHotTimelineAstVisitor] 成功入库 ${posts.length} 条微博，${users.length} 个用户`);
                });

                ast.max_id = body.data.max_id;
                ast.since_id = body.data.since_id;

                await delay();
            }

            console.log(`[WeiboAjaxFeedHotTimelineAstVisitor] 完成，共抓取 ${pageCount} 页数据`);
            ast.state = 'success';
        } catch (error) {
            console.error(`[WeiboAjaxFeedHotTimelineAstVisitor] 抓取失败`, error);
            ast.state = 'fail';
            ast.setError(error);
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
