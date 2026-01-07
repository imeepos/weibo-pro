import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboCommentEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, NodeEvent } from "@sker/workflow";
import { WeiboAjaxStatusesCommentAst } from "@sker/workflow-ast";
import { delay } from "./services/utils";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";

export interface WeiboAjaxStatusesComponentAstResponse {
    readonly ok: number
    readonly data: WeiboCommentEntity[]
    readonly filter_group: Array<Record<string, unknown>>;
    readonly max_id: number
    readonly rootComment: Array<Record<string, unknown>>;
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
    visit(ast: WeiboAjaxStatusesCommentAst, input$: Observable<Record<string, unknown>>, _ctx: Record<string, unknown>): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

            interface WrappedContext extends Record<string, unknown> {
                abortSignal: AbortSignal;
            }

            const wrappedCtx: WrappedContext = {
                ..._ctx,
                abortSignal: abortController.signal
            };

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1;
                    obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })

                    const events: NodeEvent[] = [];
                    try {
                        if (inputData) {
                            Object.keys(inputData).forEach(key => {
                                (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                            });
                        }

                        await this.executeHandler(ast, wrappedCtx);
                    } catch (e) {
                        console.error('[WeiboAjaxStatusesCommentAstVisitor] 处理失败:', e);
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
                console.log('[WeiboAjaxStatusesCommentAstVisitor] 订阅被取消，触发 AbortSignal');
                subscription.unsubscribe();
                abortController.abort();
                obs.complete();
            };
        });
    }

    private async executeHandler(ast: WeiboAjaxStatusesCommentAst, wrappedCtx: { abortSignal?: AbortSignal }): Promise<void> {
        // 检查取消信号
        if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
        }

        // 检查必要参数
        if (!ast.mid || ast.mid === 'null' || !ast.uid || ast.uid === 'null') {
            console.warn(`[WeiboAjaxStatusesCommentAstVisitor] 参数无效，跳过处理: mid=${ast.mid}, uid=${ast.uid}`);
            return;
        }

        while (true) {
            // 检查取消信号（循环开始）
            if (wrappedCtx.abortSignal?.aborted) {
                throw new Error('工作流已取消');
            }

            const body = await this.fetchComments(ast);

            // 检查取消信号（网络请求后）
            if (wrappedCtx.abortSignal?.aborted) {
                throw new Error('工作流已取消');
            }

            const entities = await this.saveComments(body);

            console.log(`[WeiboAjaxStatusesCommentAstVisitor] 共${entities.length}个`);

            if (entities.length > 0) {
                for (let child of entities) {
                    // 检查取消信号（子评论循环中）
                    if (wrappedCtx.abortSignal?.aborted) {
                        throw new Error('工作流已取消');
                    }

                    if (child.comments && child.comments.length > 0) {
                        const childAst = new WeiboAjaxStatusesCommentAst();
                        childAst.mid = `${child.id}`;
                        childAst.is_show_bulletin = 2;
                        childAst.is_mix = 1;
                        childAst.fetch_level = 1;
                        childAst.max_id = 0;
                        childAst.count = 20;
                        childAst.uid = ast.uid;
                        await this.visitChildren(childAst, wrappedCtx);
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
    }

    async visitChildren(ast: WeiboAjaxStatusesCommentAst, _ctx: { abortSignal?: AbortSignal }) {
        try {
            while (true) {
                // 检查取消信号
                if (_ctx.abortSignal?.aborted) {
                    console.log('[WeiboAjaxStatusesCommentAstVisitor] 子评论处理已取消');
                    return;
                }

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
                    userMap.set(item.user.id as number, m.create(WeiboUserEntity, item.user as any));
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
            const entities = body.data.map(item => m.create(WeiboCommentEntity, item as any));
            await m.upsert(WeiboCommentEntity, entities as any, ['id']);
            return entities;
        });
    }
}
