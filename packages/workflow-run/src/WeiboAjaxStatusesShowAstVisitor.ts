import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboPostEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";
import { Handler, NodeEvent, setAstError } from "@sker/workflow";
import { WeiboAjaxStatusesShowAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { ErrorHandlerOperators } from "./utils/error-handler.util";

export interface WeiboAjaxStatusesShowAstReponse extends WeiboPostEntity {
    ok: number;
}

@Injectable()
export class WeiboAjaxStatusesShowAstVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(WeiboAjaxStatusesShowAst)
    visit(ast: WeiboAjaxStatusesShowAst, input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

            interface WrappedContext extends Record<string, unknown> {
                abortSignal: AbortSignal;
            }

            const wrappedCtx: WrappedContext = {
                ...ctx,
                abortSignal: abortController.signal
            };

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1;
                    obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                        });
                    }

                    // 检查取消信号
                    if (wrappedCtx.abortSignal?.aborted) {
                        throw new Error('工作流已取消');
                    }

                    const url = `https://weibo.com/ajax/statuses/show?id=${ast.mblogid}&locale=zh-CN&isGetLongText=true`;
                    const body = await this.fetchApi<WeiboAjaxStatusesShowAstReponse>({
                        url,
                        refererOptions: { uid: ast.uid, mid: ast.mblogid }
                    });

                    // 检查取消信号（网络请求后）
                    if (wrappedCtx.abortSignal?.aborted) {
                        throw new Error('工作流已取消');
                    }

                    await useEntityManager(async m => {
                        const userData = (body as any).user;
                        const user = m.create(WeiboUserEntity, userData as any);
                        ast.uid = `${user.id}`;
                        await m.upsert(WeiboUserEntity, user as any, ['id']);

                        const { user: _, ...postData } = body as any;
                        const post = m.create(WeiboPostEntity, {
                            ...postData,
                            user_id: userData?.id || null,
                        });
                        // 从 AST 输入中获取事件 ID 并设置到帖子
                        if (ast.eventId) {
                            post.event_id = ast.eventId;
                        }
                        ast.postId = post.id;
                        ast.mid = post.mid;

                        // 使用安全的 upsert 方式，处理可能的重复插入
                        try {
                            await m.upsert(WeiboPostEntity, post as any, ['id']);
                        } catch (error) {
                            const existingPost = await m.findOne(WeiboPostEntity, {
                                where: { id: post.id }
                            });

                            if (existingPost) {
                                await m.update(WeiboPostEntity, { id: post.id }, post as any);
                            } else {
                                throw error;
                            }
                        }
                    });

                    console.log(`[WeiboAjaxStatusesShowAstVisitor] 成功保存一条帖子 id=${ast.postId}, mblogid=${ast.mblogid}`)

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { uid: ast.uid, postId: ast.postId, mid: ast.mid } }
                    ];
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[WeiboAjaxStatusesShowAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[WeiboAjaxStatusesShowAstVisitor]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    obs.next({ type: 'node_fail', id: ast.id, error: error?.message });
                    // 发射 null 数据让下游节点可以继续处理
                    obs.next({
                        type: 'node_emit',
                        id: ast.id,
                        data: { uid: null, postId: null, mid: null }
                    });
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
                    obs.complete();
                }
            });

            return () => {
                console.log('[WeiboAjaxStatusesShowAstVisitor] 订阅被取消，触发 AbortSignal');
                subscription.unsubscribe();
                abortController.abort();
                obs.complete();
            };
        });
    }
}