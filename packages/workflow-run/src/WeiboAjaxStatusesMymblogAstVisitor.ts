import { Injectable } from "@sker/core";
import { WeiboAccountService } from "./weibo-account.service";
import { WeiboAjaxStatusesMymblogAst } from "@sker/workflow-ast";
import { Handler } from "@sker/workflow";
import { useEntityManager, WeiboPostEntity } from "@sker/entities";
import { WeiboApiClient } from "./weibo-api-client.base";

export interface WeiboAjaxStatusesMymblogAstResponse {
    ok: number;
    data: {
        list: any[];
    }
}

@Injectable()
export class WeiboAjaxStatusesMymblogAstVisitor extends WeiboApiClient {
    constructor(accountService: WeiboAccountService) {
        super(accountService);
    }

    @Handler(WeiboAjaxStatusesMymblogAst)
    async visit(ast: WeiboAjaxStatusesMymblogAst, _ctx: any) {
        try {
            for await (const body of this.fetchWithPagination<WeiboAjaxStatusesMymblogAstResponse>({
                buildUrl: (page) => `https://weibo.com/ajax/statuses/mymblog?uid=${ast.uid}&page=${page}&feature=0`,
                refererOptions: { uid: ast.uid },
                shouldContinue: (data) => data.data.list.length > 0
            })) {
                await useEntityManager(async m => {
                    const posts = body.data.list.map(item => m.create(WeiboPostEntity, item));
                    await m.upsert(WeiboPostEntity, posts as any, ['id']);
                });
            }
            ast.state = 'success';
        } catch (error) {
            console.error(`[WeiboAjaxStatusesMymblogAstVisitor] uid: ${ast.uid}`, error);
            ast.state = 'fail';
            ast.error = error instanceof Error ? error : new Error(String(error));
        }
        return ast;
    }
}