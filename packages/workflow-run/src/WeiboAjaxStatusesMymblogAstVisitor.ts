import { Inject, Injectable } from "@sker/core";
import { WeiboAccountService } from "./services/weibo-account.service";
import { WeiboAjaxStatusesMymblogAst } from "@sker/workflow-ast";
import { Handler, NodeEvent, setAstError } from "@sker/workflow";
import { useEntityManager, WeiboPostEntity, WeiboUserEntity, PostSnapshotHelper } from "@sker/entities";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";
import { WeiboWorkerProxyService } from "./services/weibo-worker-proxy.service";
import { ErrorHandlerOperators } from "./utils/error-handler.util";

export interface WeiboAjaxStatusesMymblogAstResponse {
    ok: number;
    data: {
        list: unknown[];
    }
}

@Injectable()
export class WeiboAjaxStatusesMymblogAstVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService,
        @Inject(WeiboWorkerProxyService) workerProxy: WeiboWorkerProxyService
    ) {
        super(accountService, delayService, rateLimiter, workerProxy);
    }

    @Handler(WeiboAjaxStatusesMymblogAst)
    visit(ast: WeiboAjaxStatusesMymblogAst, input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

            const wrappedCtx: Record<string, unknown> & {
                abortSignal: AbortSignal;
                windowDays?: unknown;
            } = {
                ...ctx,
                abortSignal: abortController.signal,
            };
            const historyCutoff = this.resolveHistoryCutoff(wrappedCtx.windowDays);

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1;
                    obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                        });
                    }

                    if (wrappedCtx.abortSignal?.aborted) {
                        throw new Error('工作流已取消');
                    }

                    for await (const body of this.fetchWithPagination<WeiboAjaxStatusesMymblogAstResponse>({
                        buildUrl: (page) => `https://weibo.com/ajax/statuses/mymblog?uid=${ast.uid}&page=${page}&feature=0`,
                        refererOptions: { uid: ast.uid },
                        shouldContinue: (data) => data.data.list.length > 0
                    })) {
                        if (wrappedCtx.abortSignal?.aborted) {
                            throw new Error('工作流已取消');
                        }

                        let reachedHistoryBoundary = false;
                        const timelineItems = body.data.list.filter((item: any) => {
                            if (!historyCutoff) {
                                return true;
                            }

                            const createdAt = this.parseStatusCreatedAt(item?.created_at);
                            if (!createdAt) {
                                return true;
                            }

                            const withinWindow = createdAt >= historyCutoff;
                            if (!withinWindow) {
                                reachedHistoryBoundary = true;
                            }

                            return withinWindow;
                        });

                        await useEntityManager(async m => {
                            const uniqueUsers = Array.from(
                                new Map(
                                    timelineItems
                                        .filter((item: any) => item?.user?.id)
                                        .map((item: any) => [item.user.id, item.user])
                                ).values()
                            );
                            const users = uniqueUsers.map(user => m.create(WeiboUserEntity, user as any));

                            if (users.length > 0) {
                                await m.upsert(WeiboUserEntity, users as any, ['id']);
                            }

                            const posts = timelineItems.map(item => {
                                const { user, ...rest } = item as any;
                                return m.create(WeiboPostEntity, {
                                    ...rest,
                                    user_id: user?.id ?? null,
                                });
                            });
                            if (posts.length > 0) {
                                await m.upsert(WeiboPostEntity, posts as any, ['id']);

                                // 入库后创建快照
                                await PostSnapshotHelper.createSnapshots(m, posts);
                            }
                        });

                        if (reachedHistoryBoundary) {
                            break;
                        }
                    }

                    ast.isEnd = true;
                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { isEnd: ast.isEnd } }
                    ];
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[WeiboAjaxStatusesLikeShowAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[WeiboAjaxStatusesLikeShowAstVisitor]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    obs.next({ type: 'node_emit', id: ast.id, data: { isEnd: false } });
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

    private resolveHistoryCutoff(windowDays: unknown): Date | null {
        const days = Number(windowDays);
        if (!Number.isFinite(days) || days <= 0) {
            return null;
        }

        return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    private parseStatusCreatedAt(value: unknown): Date | null {
        if (!value) {
            return null;
        }

        const parsed = new Date(value as string);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
}
