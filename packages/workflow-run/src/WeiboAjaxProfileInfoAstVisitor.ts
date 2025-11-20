import { Injectable } from "@sker/core";
import { useEntityManager, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler } from "@sker/workflow";
import { WeiboAjaxProfileInfoAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";

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
    constructor(accountService: WeiboAccountService) {
        super(accountService);
    }

    @Handler(WeiboAjaxProfileInfoAst)
    async visit(ast: WeiboAjaxProfileInfoAst, _ctx: any) {
        try {
            const url = `https://weibo.com/ajax/profile/info?uid=${ast.uid}`;
            const body = await this.fetchApi<WeiboAjaxProfileInfoAstResponse>({
                url,
                refererOptions: { uid: ast.uid }
            });

            await useEntityManager(async m => {
                const user = m.create(WeiboUserEntity, body.data.user as any);
                ast.uid = `${user.id}`;
                await m.upsert(WeiboUserEntity, user as any, ['id']);
            });

            await this.fetchDetail(ast, _ctx);

            ast.state = 'success';
        } catch (error) {
            console.error(`[WeiboAjaxProfileInfoAstVisitor] uid: ${ast.uid}`, error);
            ast.state = 'fail';
            ast.setError(error);
        }
        return ast;
    }

    private async fetchDetail(ast: WeiboAjaxProfileInfoAst, _ctx: any) {
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
