import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboCommentEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, INode } from "@sker/workflow";
import { WeiboAjaxStatusesCommentAst } from "@sker/workflow-ast";
import { delay } from "./services/utils";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable } from "rxjs";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";

export interface WeiboAjaxStatusesComponentAstResponse {
    readonly ok: number
    readonly data: WeiboCommentEntity[]
    readonly filter_group: any[];
    readonly max_id: number
    readonly rootComment: any[];
    readonly total_number: number;
    readonly trendsText: string;
}

@Injectable()
export class WeiboAjaxStatusesCommentAstVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(WeiboAjaxStatusesCommentAst)
    visit(ast: WeiboAjaxStatusesCommentAst, _ctx: any): Observable<INode> {
        return new Observable<INode>(obs => {
            const handler = async () => {
                try {
                    ast.state = 'running';
                    ast.count += 1;
                    obs.next({ ...ast });

                    while (true) {
                        const body = await this.fetchComments(ast);

                        const entities = await this.saveComments(body);

                        console.log(`[WeiboAjaxStatusesCommentAstVisitor] 共${entities.length}个`);

                        if (entities.length > 0) {
                            for (let child of entities) {
                                if (child.more_info) {
                                    const childAst = new WeiboAjaxStatusesCommentAst();
                                    childAst.mid = `${child.id}`;
                                    childAst.is_show_bulletin = 2;
                                    childAst.is_mix = 1;
                                    childAst.fetch_level = 1;
                                    childAst.max_id = 0;
                                    childAst.count = 20;
                                    childAst.uid = ast.uid;
                                    await this.visitChildren(childAst, _ctx);
                                }
                            }
                        }

                        if (!body.max_id) {
                            break;
                        }

                        ast.max_id = body.max_id;
                        ast.next_max_id = body.max_id;
                        await delay();
                    }

                    ast.state = 'emitting';
                    ast.is_end = true;
                    obs.next({ ...ast });

                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete()
                } catch (error) {
                    console.error(`[WeiboAjaxStatusesCommentAstVisitor] mid: ${ast.mid}`, error);
                    ast.state = 'fail';
                    ast.setError(error, process.env.NODE_ENV === 'development');
                    obs.next({ ...ast });
                    obs.complete()
                }
            };
            handler();
            return () => obs.complete();
        });
    }

    async visitChildren(ast: WeiboAjaxStatusesCommentAst, _ctx: any) {
        try {
            while (true) {
                const body = await this.fetchComments(ast);
                await this.saveComments(body);

                if (!body.max_id) {
                    break;
                }

                ast.max_id = body.max_id;
                ast.next_max_id = body.max_id;
                await delay();
            }
        } catch (error) {
            console.error(`[WeiboAjaxStatusesCommentAstVisitor] 子评论 mid: ${ast.mid}`, error);
        }
    }

    private async fetchComments(ast: WeiboAjaxStatusesCommentAst): Promise<WeiboAjaxStatusesComponentAstResponse> {
        let url = `https://weibo.com/ajax/statuses/buildComments?is_reload=1&id=${ast.mid}&is_show_bulletin=${ast.is_show_bulletin}&is_mix=${ast.is_mix}&count=${ast.count}&uid=${ast.uid}&fetch_level=${ast.fetch_level}&locale=zh-CN`;
        if (ast.max_id) url += `&max_id=${ast.max_id}`;

        console.log(`url is: ${url}`);

        return await this.fetchApi<WeiboAjaxStatusesComponentAstResponse>({
            url,
            refererOptions: { uid: ast.uid, mid: ast.mid }
        });
    }

    private async saveComments(body: WeiboAjaxStatusesComponentAstResponse): Promise<WeiboCommentEntity[]> {
        return await useEntityManager(async m => {
            const userMap = new Map<number, WeiboUserEntity>();
            body.data.forEach(item => {
                if (item.user?.id) {
                    userMap.set(item.user.id as number, m.create(WeiboUserEntity, item.user));
                }
            });
            const users = Array.from(userMap.values());
            if (users.length > 0) {
                const BATCH_SIZE = 5;
                for (let i = 0; i < users.length; i += BATCH_SIZE) {
                    const batch = users.slice(i, i + BATCH_SIZE);
                    await m.upsert(WeiboUserEntity, batch as any, ['id']);
                }
            }
            const entities = body.data.map(item => m.create(WeiboCommentEntity, item));
            await m.upsert(WeiboCommentEntity, entities as any[], ['id']);
            return entities;
        });
    }
}