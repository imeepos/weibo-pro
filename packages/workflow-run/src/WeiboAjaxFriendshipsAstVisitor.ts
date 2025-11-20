import { Injectable } from "@sker/core";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler } from "@sker/workflow";
import { WeiboAjaxFriendshipsAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";

export interface WeiboAjaxFriendshipsResponse {
    ok: number;
    data: any;
}

@Injectable()
export class WeiboAjaxFriendshipsAstVisitor extends WeiboApiClient {
    constructor(accountService: WeiboAccountService) {
        super(accountService);
    }

    @Handler(WeiboAjaxFriendshipsAst)
    async visit(ast: WeiboAjaxFriendshipsAst, _ctx: any) {
        try {
            const url = `https://weibo.com/ajax/friendships/friends?page=${ast.page || 1}&uid=${ast.uid}`;
            const body = await this.fetchApi<WeiboAjaxFriendshipsResponse>({
                url,
                refererOptions: { uid: ast.uid }
            });

            ast.state = 'success';
        } catch (error) {
            console.error(`[WeiboAjaxFriendshipsAstVisitor] uid: ${ast.uid}`, error);
            ast.state = 'fail';
            ast.setError(error);
        }
        return ast;
    }
}
