import { Injectable } from "@sker/core";
import { useEntityManager, WeiboUserEntity, WeiboLikeEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, INode } from "@sker/workflow";
import { WeiboAjaxStatusesLikeShowAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable } from "rxjs";

export interface WeiboStatusAttitude {
    readonly user: WeiboUserEntity;
    readonly attitude: number
}

export interface WeiboStatusLikeShowResponse {
    readonly ok: number
    readonly data: WeiboStatusAttitude[]
    readonly total_number: number
}

@Injectable()
export class WeiboAjaxStatusesLikeShowAstVisitor extends WeiboApiClient {
    constructor(accountService: WeiboAccountService) {
        super(accountService);
    }

    @Handler(WeiboAjaxStatusesLikeShowAst)
    handler(ast: WeiboAjaxStatusesLikeShowAst, _ctx: any): Observable<INode> {
        return new Observable<INode>(obs => {
            const handle = async () => {
                try {
                    ast.state = 'running';
                    ast.count += 1;
                    obs.next({ ...ast });

                    let page = 1;
                    for await (const body of this.fetchWithPagination<WeiboStatusLikeShowResponse>({
                        buildUrl: (p) => {
                            page = p;
                            return `https://weibo.com/ajax/statuses/likeShow?id=${ast.mid}&attitude_type=${ast.attitude_type}&attitude_enable=${ast.attitude_enable}&page=${p}&count=${ast.count}`;
                        },
                        refererOptions: { uid: ast.uid, mid: ast.mid },
                        shouldContinue: (data) => data.data.length > 0
                    })) {
                        await useEntityManager(async m => {
                            const userEntities = body.data.map(item => m.create(WeiboUserEntity, item.user));
                            console.log(`[${page}]处理${userEntities.length}个用户`);
                            await m.upsert(WeiboUserEntity, userEntities as any[], ['id']);

                            const likeEntities = body.data.map(item =>
                                m.create(WeiboLikeEntity, {
                                    userWeiboId: String(item.user.id),
                                    targetWeiboId: ast.mid
                                })
                            );
                            await m.upsert(WeiboLikeEntity, likeEntities as any[], ['userWeiboId', 'targetWeiboId']);
                            console.log(`[${page}]保存${likeEntities.length}条点赞记录`);
                        });
                    }

                    ast.state = 'emitting';
                    ast.is_end = true;
                    obs.next({ ...ast });

                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete()
                } catch (error) {
                    console.error(`[WeiboAjaxStatusesLikeShowAstVisitor] mid: ${ast.mid}`, error);
                    ast.state = 'fail';
                    ast.setError(error);
                    obs.next({ ...ast });
                    obs.complete()
                }
            };
            handle();
            return () => obs.complete();
        });
    }
}
