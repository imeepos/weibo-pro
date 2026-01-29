import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboUserEntity, WeiboLikeEntity, WeiboPostEntity, UserRelationStatisticsHelper, UserRelationType, HourlyStatisticsHelper } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, NodeEvent } from "@sker/workflow";
import { WeiboAjaxStatusesLikeShowAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";
import { WeiboWorkerProxyService } from "./services/weibo-worker-proxy.service";

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
        @Inject(RateLimiterService) rateLimiter: RateLimiterService,
        @Inject(WeiboWorkerProxyService) workerProxy: WeiboWorkerProxyService
    ) {
        super(accountService, delayService, rateLimiter, workerProxy);
    }

    @Handler(WeiboAjaxStatusesLikeShowAst)
    handler(ast: WeiboAjaxStatusesLikeShowAst, input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

            const wrappedCtx = {
                ...ctx,
                abortSignal: abortController.signal
            };

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                mergeMap(async (inputData) => {
                    ast.emitCount += 1;
                    obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

                    const events: NodeEvent[] = [];
                    try {
                        if (inputData) {
                            Object.keys(inputData).forEach(key => {
                                (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                            });
                        }

                        if (wrappedCtx.abortSignal?.aborted) {
                            throw new Error('工作流已取消');
                        }

                        // 检查必要参数
                        if (!ast.mid || ast.mid === 'null' || !ast.uid || ast.uid === 'null') {
                            console.warn(`[WeiboAjaxStatusesLikeShowAstVisitor] 参数无效，跳过处理: mid=${ast.mid}, uid=${ast.uid}`);
                        } else {
                            let page = 1;
                            let consecutiveExistingCount = 0;

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
                                    const userEntities = uniqueUsers.map(user => m.create(WeiboUserEntity, user as any));
                                    console.log(`[${page}]处理${userEntities.length}个用户`);
                                    await m.upsert(WeiboUserEntity, userEntities as any, ['id']);

                                    // 获取帖子时间作为点赞时间的近似值
                                    const post = await m.findOne(WeiboPostEntity, {
                                        where: { id: ast.mid },
                                        select: ['created_at', 'event_id']
                                    });
                                    const approximateLikeTime = post?.created_at || new Date();

                                    const likeEntities = body.data.map(item =>
                                        m.create(WeiboLikeEntity, {
                                            userWeiboId: String(item.user.id),
                                            targetWeiboId: ast.mid,
                                            targetUserWeiboId: ast.uid,
                                            createdAt: approximateLikeTime
                                        } as any)
                                    );

                                    // 检查是否有新数据：查询当前批次中已存在的记录
                                    const existingRecords = await m.find(WeiboLikeEntity, {
                                        where: likeEntities.map(e => ({
                                            userWeiboId: e.userWeiboId,
                                            targetWeiboId: e.targetWeiboId
                                        }))
                                    });
                                    const existingKeys = new Set(
                                        existingRecords.map(r => `${r.userWeiboId}:${r.targetWeiboId}`)
                                    );
                                    const newCount = likeEntities.filter(e =>
                                        !existingKeys.has(`${e.userWeiboId}:${e.targetWeiboId}`)
                                    ).length;

                                    console.log(`[${page}]保存${likeEntities.length}条点赞记录，新增${newCount}条`);

                                    if (newCount === 0) {
                                        consecutiveExistingCount++;
                                        console.log(`[WeiboAjaxStatusesLikeShowAstVisitor] 连续${consecutiveExistingCount}页无新数据`);
                                    } else {
                                        consecutiveExistingCount = 0;
                                    }

                                    await m.upsert(WeiboLikeEntity, likeEntities as any, ['userWeiboId', 'targetWeiboId']);

                                    // 入库后触发统计（只对新数据）
                                    // 过滤出新数据（利用已有的 existingKeys）
                                    const newLikes = likeEntities.filter(e =>
                                        !existingKeys.has(`${e.userWeiboId}:${e.targetWeiboId}`)
                                    );

                                    if (post?.event_id && newLikes.length > 0) {
                                        // 用户关系统计 - 只对新数据
                                        for (const like of newLikes) {
                                            if (like.userWeiboId !== like.targetUserWeiboId && like.createdAt) {
                                                await UserRelationStatisticsHelper.upsertRelation(
                                                    m,
                                                    like.userWeiboId,
                                                    like.targetUserWeiboId,
                                                    UserRelationType.LIKE,
                                                    like.createdAt,
                                                    post.event_id
                                                );
                                            }
                                        }

                                        // 小时统计 - 只对新数据
                                        for (const like of newLikes) {
                                            if (like.createdAt) {
                                                const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(like.createdAt);
                                                await HourlyStatisticsHelper.upsertStatistics(
                                                    m,
                                                    post.event_id,
                                                    timeDimensions,
                                                    { like_count: 1, user_count: 1 }
                                                );
                                            }
                                        }
                                    }
                                });

                                // 连续5页无新数据，提前结束
                                if (consecutiveExistingCount >= 5) {
                                    console.log(`[WeiboAjaxStatusesLikeShowAstVisitor] 连续5页无新数据，停止爬取`);
                                    break;
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[WeiboAjaxStatusesLikeShowAstVisitor] 处理失败:', e);
                        events.push({ type: 'node_fail' as const, id: ast.id, error: (e as Error)?.message });
                    } finally {
                        ast.is_end = true;
                        events.push({ type: 'node_emit' as const, id: ast.id, data: { is_end: true } });
                    }

                    return events;
                }, 3),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    obs.next({ type: 'node_emit', id: ast.id, data: { is_end: false } });
                    obs.next({ type: 'node_fail', id: ast.id, error: error?.message });
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete();
                }
            });

            return () => {
                subscription.unsubscribe();
                abortController.abort();
                obs.complete();
            };
        });
    }
}
