import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./services/weibo-account.service";
import { Handler, NodeEvent, setAstError } from "@sker/workflow";
import { WeiboAjaxProfileInfoAst } from "@sker/workflow-ast";
import { WeiboApiClient } from "./services/weibo-api-client.base";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { DelayService } from "./services/delay.service";
import { RateLimiterService } from "./services/rate-limiter.service";

export interface WeiboAjaxProfileInfoAstResponse {
    ok: number;
    data: {
        user: WeiboUserEntity;
    }
}

export interface WeiboAjaxProfileDetailResponse {
    ok: number;
    data: Record<string, unknown>;
}

@Injectable()
export class WeiboAjaxProfileInfoAstVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(WeiboAjaxProfileInfoAst)
    visit(ast: WeiboAjaxProfileInfoAst, input$: Observable<Record<string, unknown>>, _ctx: Record<string, unknown>): Observable<NodeEvent> {
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

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                        });
                    }

                    // 检查取消信号
                    if (wrappedCtx.abortSignal?.aborted) {
                        throw new Error('工作流已取消');
                    }

                    const url = `https://weibo.com/ajax/profile/info?uid=${ast.uid}`;
                    const body = await this.fetchApi<WeiboAjaxProfileInfoAstResponse>({
                        url,
                        refererOptions: { uid: ast.uid }
                    });

                    // 检查取消信号（网络请求后）
                    if (wrappedCtx.abortSignal?.aborted) {
                        throw new Error('工作流已取消');
                    }

                    await useEntityManager(async m => {
                        const user = m.create(WeiboUserEntity, body.data.user);
                        ast.uid = `${user.id}`;
                        await m.upsert(WeiboUserEntity, user, ['id']);
                    });

                    await this.fetchDetail(ast, wrappedCtx);
                    ast.isEnd = true;

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { isEnd: ast.isEnd } }
                    ];
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    console.error(`[WeiboAjaxProfileInfoAstVisitor] uid: ${ast.uid}`, error);
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
                console.log('[WeiboAjaxProfileInfoAstVisitor] 订阅被取消，触发 AbortSignal');
                subscription.unsubscribe();
                abortController.abort();
                obs.complete();
            };
        });
    }

    private async fetchDetail(ast: WeiboAjaxProfileInfoAst, _ctx: { abortSignal?: AbortSignal }) {
        // 检查取消信号
        if (_ctx.abortSignal?.aborted) {
            console.log('[WeiboAjaxProfileInfoAstVisitor] fetchDetail 已取消');
            return;
        }

        const url = `https://weibo.com/ajax/profile/detail?uid=${ast.uid}`;
        const body = await this.fetchApi<WeiboAjaxProfileDetailResponse>({
            url,
            refererOptions: { uid: ast.uid }
        });

        await useEntityManager(async m => {
            const user = m.create(WeiboUserEntity, { detail: body.data, id: Number(ast.uid) });
            await m.upsert(WeiboUserEntity, user, ['id']);
        });
    }
}
