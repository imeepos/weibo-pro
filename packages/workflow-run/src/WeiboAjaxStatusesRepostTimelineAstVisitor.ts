import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboRepostEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, NodeEvent } from "@sker/workflow";
import { WeiboAjaxStatusesRepostTimelineAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";

export interface WeiboAjaxStatusesRepostTimelineResponse {
    readonly ok: number
    readonly data: WeiboRepostEntity[]
    readonly max_page: number
    readonly next_cursor: number
    readonly total_number: number;
}

@Injectable()
export class WeiboAjaxStatusesRepostTimelineAstVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(WeiboAjaxStatusesRepostTimelineAst)
    visit(ast: WeiboAjaxStatusesRepostTimelineAst, input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>): Observable<NodeEvent> {
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
                            console.warn(`[WeiboAjaxStatusesRepostTimelineAstVisitor] 参数无效，跳过处理: mid=${ast.mid}, uid=${ast.uid}`);
                        } else {
                            let page = 1;
                            for await (const body of this.fetchWithPagination<WeiboAjaxStatusesRepostTimelineResponse>({
                                buildUrl: (p) => {
                                    page = p;
                                    return `https://weibo.com/ajax/statuses/repostTimeline?id=${ast.mid}&page=${p}&moduleID=feed&count=10`;
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
                                    const users = uniqueUsers.map(user => m.create(WeiboUserEntity, user as any));
                                    await m.upsert(WeiboUserEntity, users as any, ['id']);

                                    const entities = body.data.map(item => m.create(WeiboRepostEntity, item as any));
                                    console.log(`[WeiboAjaxStatusesRepostTimelineAstVisitor] ${page} 页 共${entities.length}条数据`);
                                    await m.upsert(WeiboRepostEntity, entities as any, ['id']);
                                });
                            }
                        }
                    } catch (e) {
                        console.error('[WeiboAjaxStatusesRepostTimelineAstVisitor] 处理失败:', e);
                        events.push({ type: 'node_fail' as const, id: ast.id, error: (e as Error)?.message });
                    } finally {
                        ast.is_end = true;
                        events.push({ type: 'node_emit' as const, id: ast.id, data: { is_end: true } });
                    }

                    return events;
                }),
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
                console.log('[WeiboAjaxStatusesRepostTimelineAstVisitor] 订阅被取消，触发 AbortSignal');
                subscription.unsubscribe();
                abortController.abort();
                obs.complete();
            };
        });
    }
}