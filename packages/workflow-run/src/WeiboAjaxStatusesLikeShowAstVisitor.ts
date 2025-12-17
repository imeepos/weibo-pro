import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboUserEntity, WeiboLikeEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, NodeEvent, setAstError } from "@sker/workflow";
import { WeiboAjaxStatusesLikeShowAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";

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
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(WeiboAjaxStatusesLikeShowAst)
    handler(ast: WeiboAjaxStatusesLikeShowAst, input$: Observable<any>, ctx: any): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

            const wrappedCtx = {
                ...ctx,
                abortSignal: abortController.signal
            };

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1;
                    obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as any)[key] = inputData[key];
                        });
                    }

                    if (wrappedCtx.abortSignal?.aborted) {
                        throw new Error('工作流已取消');
                    }

                    let page = 1;
                    for await (const body of this.fetchWithPagination<WeiboStatusLikeShowResponse>({
                        buildUrl: (p) => {
                            page = p;
                            return `https://weibo.com/ajax/statuses/likeShow?id=${ast.mid}&attitude_type=${ast.attitude_type}&attitude_enable=${ast.attitude_enable}&page=${p}&count=${ast.count}`;
                        },
                        refererOptions: { uid: ast.uid, mid: ast.mid },
                        shouldContinue: (data) => data.data.length > 0
                    })) {
                        if (wrappedCtx.abortSignal?.aborted) {
                            throw new Error('工作流已取消');
                        }

                        await useEntityManager(async m => {
                            const uniqueUsers = Array.from(
                                new Map(body.data.map(item => [item.user.id, item.user])).values()
                            );
                            const userEntities = uniqueUsers.map(user => m.create(WeiboUserEntity, user));
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

                    ast.is_end = true;
                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { is_end: ast.is_end } }
                    ];
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    console.error(`[WeiboAjaxStatusesLikeShowAstVisitor] mid: ${ast.mid}`, error);
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete();
                }
            });

            return () => {
                console.log('[WeiboAjaxStatusesLikeShowAstVisitor] 订阅被取消，触发 AbortSignal');
                subscription.unsubscribe();
                abortController.abort();
                obs.complete();
            };
        });
    }
}
