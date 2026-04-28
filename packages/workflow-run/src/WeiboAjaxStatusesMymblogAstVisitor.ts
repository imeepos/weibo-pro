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
import { ErrorClassifier } from "./utils/error-handler.util";

export interface WeiboAjaxStatusesMymblogAstResponse {
    ok: number;
    data: {
        list: unknown[];
    }
}

export interface WeiboTimelineCollectionProgress {
    page: number;
    collectedPostCount: number;
    newPostCount: number;
    duplicatePostCount: number;
    failedPageCount: number;
    latestPostAt: string | null;
    oldestPostAt: string | null;
    partial: boolean;
    warnings: string[];
    message: string;
}

interface TimelineCollectionResult extends WeiboTimelineCollectionProgress {}

interface TimelinePageIngestResult {
    collectedCount: number;
    newCount: number;
    duplicateCount: number;
    reachedHistoryBoundary: boolean;
    latestPostAt: Date | null;
    oldestPostAt: Date | null;
    sanitizedUserRefCount: number;
}

class PageRetryExhaustedError extends Error {
    constructor(
        readonly page: number,
        readonly attempts: number,
        readonly cause: unknown,
    ) {
        super(`第 ${page} 页抓取在 ${attempts} 次尝试后仍失败`);
        this.name = 'PageRetryExhaustedError';
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
                    const events: NodeEvent[] = [];
                    ast.emitCount += 1;
                    obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

                    try {
                        if (inputData) {
                            Object.keys(inputData).forEach(key => {
                                (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                            });
                        }

                        if (wrappedCtx.abortSignal?.aborted) {
                            throw new Error('工作流已取消');
                        }

                        const result = await this.collectTimeline(ast, historyCutoff, wrappedCtx.abortSignal, obs);
                        ast.isEnd = true;
                        ast.state = 'success';
                        events.push({
                            type: 'node_emit',
                            id: ast.id,
                            data: {
                                isEnd: ast.isEnd,
                                collectedPostCount: result.collectedPostCount,
                                failedPageCount: result.failedPageCount,
                                partial: result.partial,
                                warnings: result.warnings,
                                message: result.message,
                            },
                        });
                    } catch (error) {
                        ast.state = 'fail';
                        ast.isEnd = false;
                        setAstError(ast, error instanceof Error ? error : new Error(String(error)));
                        events.push({ type: 'node_emit', id: ast.id, data: { isEnd: false } });
                        events.push({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    }

                    return events;
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    obs.next({ type: 'node_emit', id: ast.id, data: { isEnd: false } });
                    obs.next({ type: 'node_fail', id: ast.id, error: error?.message });
                },
                complete: () => {
                    if (ast.state === 'success') {
                        obs.next({ type: 'node_success', id: ast.id });
                    }
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

    private async collectTimeline(
        ast: WeiboAjaxStatusesMymblogAst,
        historyCutoff: Date | null,
        abortSignal: AbortSignal | undefined,
        obs: { next: (event: NodeEvent) => void },
    ): Promise<TimelineCollectionResult> {
        const maxPageRetries = this.resolvePositiveInteger(process.env.USER_HISTORY_PAGE_MAX_RETRIES, 2);
        const maxConsecutiveNoProgressPages = this.resolvePositiveInteger(
            process.env.USER_HISTORY_MAX_CONSECUTIVE_STALLED_PAGES,
            3,
        );

        let page = 1;
        let collectedPostCount = 0;
        let newPostCount = 0;
        let duplicatePostCount = 0;
        let failedPageCount = 0;
        let consecutiveNoProgressPages = 0;
        let latestPostAt: Date | null = null;
        let oldestPostAt: Date | null = null;
        const warnings: string[] = [];

        while (true) {
            if (abortSignal?.aborted) {
                throw new Error('工作流已取消');
            }

            let body: WeiboAjaxStatusesMymblogAstResponse;
            try {
                body = await this.fetchPageWithRetry(
                    ast,
                    page,
                    maxPageRetries,
                    {
                        page,
                        collectedPostCount,
                        newPostCount,
                        duplicatePostCount,
                        failedPageCount,
                        latestPostAt: latestPostAt?.toISOString() ?? null,
                        oldestPostAt: oldestPostAt?.toISOString() ?? null,
                        partial: warnings.length > 0,
                        warnings,
                        message: `正在抓取第 ${page} 页`,
                    },
                    obs,
                );
            } catch (error) {
                if (error instanceof PageRetryExhaustedError) {
                    failedPageCount += 1;
                    const warning = `第 ${page} 页连续重试 ${error.attempts} 次后仍失败，已结束抓取并继续分析`;
                    warnings.push(warning);
                    return this.buildCollectionResult({
                        page,
                        collectedPostCount,
                        newPostCount,
                        duplicatePostCount,
                        failedPageCount,
                        latestPostAt: latestPostAt?.toISOString() ?? null,
                        oldestPostAt: oldestPostAt?.toISOString() ?? null,
                        partial: true,
                        warnings,
                        message: warning,
                    }, obs, ast.id, 'completed');
                }

                throw error;
            }

            const rawList = Array.isArray(body?.data?.list) ? body.data.list : [];
            if (rawList.length === 0) {
                return this.buildCollectionResult({
                    page,
                    collectedPostCount,
                    newPostCount,
                    duplicatePostCount,
                    failedPageCount,
                    latestPostAt: latestPostAt?.toISOString() ?? null,
                    oldestPostAt: oldestPostAt?.toISOString() ?? null,
                    partial: warnings.length > 0,
                    warnings,
                    message: collectedPostCount > 0
                        ? `历史发帖抓取完成，共处理 ${collectedPostCount} 条帖子`
                        : '历史发帖抓取完成，未发现符合窗口条件的帖子',
                }, obs, ast.id, 'completed');
            }

            const pageResult = await this.ingestPage(body, historyCutoff);
            collectedPostCount += pageResult.collectedCount;
            newPostCount += pageResult.newCount;
            duplicatePostCount += pageResult.duplicateCount;
            latestPostAt = this.pickLaterDate(latestPostAt, pageResult.latestPostAt);
            oldestPostAt = this.pickEarlierDate(oldestPostAt, pageResult.oldestPostAt);

            if (pageResult.sanitizedUserRefCount > 0) {
                warnings.push(`第 ${page} 页有 ${pageResult.sanitizedUserRefCount} 条帖子缺少可落库作者，已按匿名帖子保存`);
            }

            if (pageResult.newCount === 0) {
                consecutiveNoProgressPages += 1;
            } else {
                consecutiveNoProgressPages = 0;
            }

            this.emitProgress(obs, ast.id, {
                page,
                collectedPostCount,
                newPostCount,
                duplicatePostCount,
                failedPageCount,
                latestPostAt: latestPostAt?.toISOString() ?? null,
                oldestPostAt: oldestPostAt?.toISOString() ?? null,
                partial: warnings.length > 0,
                warnings,
                message: `第 ${page} 页完成，累计处理 ${collectedPostCount} 条帖子（新增 ${newPostCount}，重复 ${duplicatePostCount}）`,
            }, 'executing');

            if (pageResult.reachedHistoryBoundary) {
                return this.buildCollectionResult({
                    page,
                    collectedPostCount,
                    newPostCount,
                    duplicatePostCount,
                    failedPageCount,
                    latestPostAt: latestPostAt?.toISOString() ?? null,
                    oldestPostAt: oldestPostAt?.toISOString() ?? null,
                    partial: warnings.length > 0,
                    warnings,
                    message: `已命中 ${ast.uid} 的历史窗口边界，累计处理 ${collectedPostCount} 条帖子`,
                }, obs, ast.id, 'completed');
            }

            if (consecutiveNoProgressPages >= maxConsecutiveNoProgressPages) {
                const warning = `连续 ${consecutiveNoProgressPages} 页没有新增帖子，已结束抓取并继续分析`;
                warnings.push(warning);
                return this.buildCollectionResult({
                    page,
                    collectedPostCount,
                    newPostCount,
                    duplicatePostCount,
                    failedPageCount,
                    latestPostAt: latestPostAt?.toISOString() ?? null,
                    oldestPostAt: oldestPostAt?.toISOString() ?? null,
                    partial: true,
                    warnings,
                    message: warning,
                }, obs, ast.id, 'completed');
            }

            page += 1;
        }
    }

    private async fetchPageWithRetry(
        ast: WeiboAjaxStatusesMymblogAst,
        page: number,
        maxRetries: number,
        baseProgress: TimelineCollectionResult,
        obs: { next: (event: NodeEvent) => void },
    ): Promise<WeiboAjaxStatusesMymblogAstResponse> {
        let attempt = 0;

        while (true) {
            this.emitProgress(obs, ast.id, {
                ...baseProgress,
                message: attempt === 0
                    ? `正在抓取第 ${page} 页`
                    : `第 ${page} 页抓取失败，正在重试 ${attempt}/${maxRetries}`,
            }, 'executing');

            try {
                return await this.fetchApi<WeiboAjaxStatusesMymblogAstResponse>({
                    url: `https://weibo.com/ajax/statuses/mymblog?uid=${ast.uid}&page=${page}&feature=0`,
                    refererOptions: { uid: ast.uid },
                });
            } catch (error) {
                if (!ErrorClassifier.isRetryable(error)) {
                    throw error;
                }

                if (attempt >= maxRetries) {
                    throw new PageRetryExhaustedError(page, maxRetries + 1, error);
                }

                attempt += 1;
                await this.delayService.randomDelay(1, 2);
            }
        }
    }

    private async ingestPage(
        body: WeiboAjaxStatusesMymblogAstResponse,
        historyCutoff: Date | null,
    ): Promise<TimelinePageIngestResult> {
        let reachedHistoryBoundary = false;
        const timelineItems = (Array.isArray(body?.data?.list) ? body.data.list : []).filter((item: any) => {
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

        const latestPostAt = this.pickBoundaryDate(timelineItems, 'latest');
        const oldestPostAt = this.pickBoundaryDate(timelineItems, 'oldest');

        if (timelineItems.length === 0) {
            return {
                collectedCount: 0,
                newCount: 0,
                duplicateCount: 0,
                reachedHistoryBoundary,
                latestPostAt,
                oldestPostAt,
                sanitizedUserRefCount: 0,
            };
        }

        return useEntityManager(async (m: any) => {
            const uniqueUsers = Array.from(
                new Map(
                    timelineItems
                        .filter((item: any) => item?.user?.id)
                        .map((item: any) => [this.normalizeIdentity(item.user.id), item.user])
                ).values()
            );
            const users = uniqueUsers.map(user => m.create(WeiboUserEntity, user as any));

            if (users.length > 0) {
                await m.upsert(WeiboUserEntity, users as any, ['id']);
            }

            const persistedUserIds = await this.findExistingIds(m, WeiboUserEntity, uniqueUsers.map((user: any) => user.id));
            let sanitizedUserRefCount = 0;
            const posts = timelineItems.map((item: any) => {
                const { user, ...rest } = item;
                const normalizedUserId = this.normalizeIdentity(user?.id);
                const userId = normalizedUserId && persistedUserIds.has(normalizedUserId) ? user?.id ?? null : null;
                if (normalizedUserId && userId === null) {
                    sanitizedUserRefCount += 1;
                }

                return m.create(WeiboPostEntity, {
                    ...rest,
                    user_id: userId,
                });
            });

            const existingPostIds = await this.findExistingIds(m, WeiboPostEntity, posts.map((post: any) => post.id));
            const newCount = posts.filter((post: any) => {
                const normalizedPostId = this.normalizeIdentity(post.id);
                return normalizedPostId === null || !existingPostIds.has(normalizedPostId);
            }).length;
            const duplicateCount = posts.length - newCount;

            if (posts.length > 0) {
                await m.upsert(WeiboPostEntity, posts as any, ['id']);
                await PostSnapshotHelper.createSnapshots(m, posts);
            }

            return {
                collectedCount: posts.length,
                newCount,
                duplicateCount,
                reachedHistoryBoundary,
                latestPostAt,
                oldestPostAt,
                sanitizedUserRefCount,
            };
        });
    }

    private async findExistingIds(
        manager: { find: (entity: unknown, options: Record<string, unknown>) => Promise<Array<{ id?: unknown }>> },
        entity: unknown,
        ids: unknown[],
    ): Promise<Set<string>> {
        const normalizedIds = Array.from(
            new Set(
                ids
                    .map((id) => this.normalizeIdentity(id))
                    .filter((id): id is string => id !== null),
            ),
        );

        if (normalizedIds.length === 0) {
            return new Set();
        }

        const existingRows = await manager.find(entity, {
            select: ['id'],
            where: normalizedIds.map((id) => ({ id })),
        } as any);

        return new Set(
            existingRows
                .map((row) => this.normalizeIdentity(row?.id))
                .filter((id): id is string => id !== null),
        );
    }

    private buildCollectionResult(
        progress: TimelineCollectionResult,
        obs: { next: (event: NodeEvent) => void },
        astId: string,
        status: 'executing' | 'completed',
    ): TimelineCollectionResult {
        this.emitProgress(obs, astId, progress, status);
        return progress;
    }

    private emitProgress(
        obs: { next: (event: NodeEvent) => void },
        astId: string,
        progress: TimelineCollectionResult,
        status: 'executing' | 'completed',
    ): void {
        obs.next({
            type: 'node_progress',
            id: astId,
            data: {
                status,
                stage: 'history_collection',
                ...progress,
            },
        });
    }

    private pickBoundaryDate(items: unknown[], direction: 'latest' | 'oldest'): Date | null {
        const timestamps = items
            .map((item: any) => this.parseStatusCreatedAt(item?.created_at))
            .filter((value): value is Date => value !== null);

        if (timestamps.length === 0) {
            return null;
        }

        return timestamps.reduce((selected, current) => {
            if (direction === 'latest') {
                return current > selected ? current : selected;
            }
            return current < selected ? current : selected;
        });
    }

    private pickLaterDate(base: Date | null, candidate: Date | null): Date | null {
        if (!base) return candidate;
        if (!candidate) return base;
        return candidate > base ? candidate : base;
    }

    private pickEarlierDate(base: Date | null, candidate: Date | null): Date | null {
        if (!base) return candidate;
        if (!candidate) return base;
        return candidate < base ? candidate : base;
    }

    private normalizeIdentity(value: unknown): string | null {
        if (value === null || value === undefined) {
            return null;
        }

        const text = String(value).trim();
        return text.length > 0 ? text : null;
    }

    private resolvePositiveInteger(value: string | undefined, fallback: number): number {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
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
