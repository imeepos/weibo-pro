import { Injectable } from "@sker/core";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, INode } from "@sker/workflow";
import { WeiboAjaxFriendshipsAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable } from "rxjs";

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
    visit(ast: WeiboAjaxFriendshipsAst, _ctx: any): Observable<INode> {
        return new Observable<INode>(obs => {
            const handler = async () => {
                try {
                    ast.state = 'running';
                    obs.next({ ...ast });

                    const url = `https://weibo.com/ajax/friendships/friends?page=${ast.page || 1}&uid=${ast.uid}`;
                    const body = await this.fetchApi<WeiboAjaxFriendshipsResponse>({
                        url,
                        refererOptions: { uid: ast.uid }
                    });

                    ast.isEnd = true;
                    ast.state = 'emitting';
                    obs.next({ ...ast });

                    ast.state = 'success';
                    obs.next({ ...ast });
                } catch (error) {
                    console.error(`[WeiboAjaxFriendshipsAstVisitor] uid: ${ast.uid}`, error);
                    ast.state = 'fail';
                    ast.setError(error);
                    obs.next({ ...ast });
                }
            };
            handler();
            return () => obs.complete();
        });
    }
}
