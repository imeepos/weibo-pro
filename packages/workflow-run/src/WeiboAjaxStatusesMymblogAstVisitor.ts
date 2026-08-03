import { Inject, Injectable } from "@sker/core";
import { WeiboAccountService } from "./services/weibo-account.service";
import { WeiboAjaxStatusesMymblogAst } from "@sker/workflow-ast";
import { Handler, NodeEvent, setAstError } from "@sker/workflow";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";
import { WeiboWorkerProxyService } from "./services/weibo-worker-proxy.service";
import { PageRetryExhaustedError, TimelineCollectionResult, WeiboAjaxStatusesMymblogAstResponse } from "./weibo-ajax-statuses-mymblog.types";
import { fetchPageWithRetry } from "./weibo-ajax-statuses-mymblog.pagination";
import { ingestTimelinePage } from "./weibo-ajax-statuses-mymblog.ingest";
import {
    pickEarlierDate,
    pickLaterDate,
    resolveHistoryCutoff,
    resolvePositiveInteger,
} from "./weibo-ajax-statuses-mymblog.util";

export type { WeiboAjaxStatusesMymblogAstResponse, WeiboTimelineCollectionProgress } from "./weibo-ajax-statuses-mymblog.types";

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
            const historyCutoff = resolveHistoryCutoff(wrappedCtx.windowDays);

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
        const maxPageRetries = resolvePositiveInteger(process.env.USER_HISTORY_PAGE_MAX_RETRIES, 2);
        const maxConsecutiveNoProgressPages = resolvePositiveInteger(
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
                body = await fetchPageWithRetry({
                    ast,
                    page,
                    maxRetries: maxPageRetries,
                    baseProgress: {
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
                    emitProgress: (progress, status) => this.emitProgress(obs, ast.id, progress, status),
                    fetchApi: (options) => this.fetchApi<WeiboAjaxStatusesMymblogAstResponse>(options),
                    randomDelay: (min, max) => this.delayService.randomDelay(min, max),
                });
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

            const pageResult = await ingestTimelinePage(body, historyCutoff);
            collectedPostCount += pageResult.collectedCount;
            newPostCount += pageResult.newCount;
            duplicatePostCount += pageResult.duplicateCount;
            latestPostAt = pickLaterDate(latestPostAt, pageResult.latestPostAt);
            oldestPostAt = pickEarlierDate(oldestPostAt, pageResult.oldestPostAt);

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
}
