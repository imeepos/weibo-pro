import { Injectable } from "@sker/core";
import { useEntityManager, WeiboRepostEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./weibo-account.service";
import { Handler } from "@sker/workflow";
import { WeiboAjaxStatusesRepostTimelineAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./weibo-api-client.base";

export interface WeiboAjaxStatusesRepostTimelineResponse {
    readonly ok: number
    readonly data: WeiboRepostEntity[]
    readonly max_page: number
    readonly next_cursor: number
    readonly total_number: number;
}

@Injectable()
export class WeiboAjaxStatusesRepostTimelineAstVisitor extends WeiboApiClient {
    constructor(accountService: WeiboAccountService) {
        super(accountService);
    }

    @Handler(WeiboAjaxStatusesRepostTimelineAst)
    async visit(ast: WeiboAjaxStatusesRepostTimelineAst, _ctx: any) {
        try {
            let page = 1;
            for await (const body of this.fetchWithPagination<WeiboAjaxStatusesRepostTimelineResponse>({
                buildUrl: (p) => {
                    page = p;
                    return `https://weibo.com/ajax/statuses/repostTimeline?id=${ast.mid}&page=${p}&moduleID=feed&count=10`;
                },
                refererOptions: { uid: ast.uid, mid: ast.mid },
                shouldContinue: (data) => data.data.length > 0
            })) {
                await useEntityManager(async m => {
                    const users = body.data.map(item => m.create(WeiboUserEntity, item.user));
                    await m.upsert(WeiboUserEntity, users as any[], ['id']);

                    const entities = body.data.map(item => m.create(WeiboRepostEntity, item));
                    console.log(`[WeiboAjaxStatusesRepostTimelineAstVisitor] ${page} 页 共${entities.length}条数据`);
                    await m.upsert(WeiboRepostEntity, entities as any[], ['id']);
                });
            }
            ast.state = 'success';
        } catch (error) {
            console.error(`[WeiboAjaxStatusesRepostTimelineAstVisitor] mid: ${ast.mid}`, error);
            ast.state = 'fail';
            ast.error = error instanceof Error ? error : new Error(String(error));
        }
        return ast;
    }
}