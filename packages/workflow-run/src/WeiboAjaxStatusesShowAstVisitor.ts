import { Injectable } from "@sker/core";
import { useEntityManager, WeiboPostEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./weibo-account.service";
import { Handler, INode } from "@sker/workflow";
import { WeiboAjaxStatusesShowAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./weibo-api-client.base";
import { Observable } from "rxjs";

export interface WeiboAjaxStatusesShowAstReponse extends WeiboPostEntity {
    ok: number;
}

@Injectable()
export class WeiboAjaxStatusesShowAstVisitor extends WeiboApiClient {
    constructor(accountService: WeiboAccountService) {
        super(accountService);
    }

    @Handler(WeiboAjaxStatusesShowAst)
    visit(ast: WeiboAjaxStatusesShowAst, _ctx: any): Observable<INode> {
        return new Observable<INode>(obs => {
            const handler = async () => {
                try {
                    ast.state = 'running'
                    obs.next(ast)
                    const url = `https://weibo.com/ajax/statuses/show?id=${ast.mblogid}&locale=zh-CN&isGetLongText=true`;
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
                    obs.next(ast)
                } catch (error) {
                    console.error(`[WeiboAjaxStatusesShowAstVisitor] postId: ${ast.id}`, error);
                    ast.state = 'fail';
                    ast.setError(error, process.env.NODE_ENV === 'development');
                    obs.next(ast)
                }
                return ast;
            }
            handler()
            return () => obs.complete()
        })

    }


}