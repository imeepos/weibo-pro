import { Injectable } from "@sker/core";
import { useEntityManager, WeiboPostEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./weibo-account.service";
import { Handler } from "@sker/workflow";
import { WeiboAjaxStatusesShowAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./weibo-api-client.base";

export interface WeiboAjaxStatusesShowAstReponse extends WeiboPostEntity {
    ok: number;
}

@Injectable()
export class WeiboAjaxStatusesShowAstVisitor extends WeiboApiClient {
    constructor(accountService: WeiboAccountService) {
        super(accountService);
    }

    @Handler(WeiboAjaxStatusesShowAst)
    async visit(ast: WeiboAjaxStatusesShowAst, _ctx: any) {
        try {
            const url = `https://weibo.com/ajax/statuses/show?id=${ast.mblogid}&locale=zh-CN&isGetLongText=true`;
            console.log(ast)
            const body = await this.fetchApi<WeiboAjaxStatusesShowAstReponse>({
                url,
                refererOptions: { uid: ast.uid, mid: ast.mblogid }
            });

            await useEntityManager(async m => {
                const user = m.create(WeiboUserEntity, body.user as any);
                ast.uid = `${user.id}`;
                await m.upsert(WeiboUserEntity, user as any, ['id']);

                const post = m.create(WeiboPostEntity, body);
                ast.mid = post.mid;
                await m.upsert(WeiboPostEntity, post as any, ['id']);
            });

            ast.state = 'success';
        } catch (error) {
            console.error(`[WeiboAjaxStatusesShowAstVisitor] postId: ${ast.id}`, error);
            ast.state = 'fail';
            ast.error = error instanceof Error ? error : new Error(String(error));
        }
        return ast;
    }
}