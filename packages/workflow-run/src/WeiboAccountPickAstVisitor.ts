import { Inject, Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { WeiboAccountPickAst } from '@sker/workflow-ast';
import {
    useEntityManager,
    WeiboAccountEntity,
    WeiboAccountStatus,
} from '@sker/entities';
import { RedisClient } from '@sker/redis';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { ErrorHandlerOperators } from './utils/error-handler.util';

@Injectable()
export class WeiboAccountPickAstVisitor {
    private readonly healthKey = 'weibo:account:health';

    constructor(
        @Inject(RedisClient) private readonly redis: RedisClient,
    ) { }

    @Handler(WeiboAccountPickAst)
    visit(ast: WeiboAccountPickAst, input$: Observable<Record<string, unknown>>, _ctx: Record<string, unknown>): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

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

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消');
                    }

                    const accounts = await useEntityManager(async m => {
                        return m.find(WeiboAccountEntity, {
                            where: { status: WeiboAccountStatus.ACTIVE },
                            order: { createdAt: 'DESC' }
                        });
                    });

                    if (accounts.length === 0) {
                        throw new Error('没有可用的微博账号，请先登录');
                    }

                    const accountsWithScore = await Promise.all(
                        accounts.map(async (account) => {
                            const score = await this.redis.zscore(this.healthKey, account.id.toString());
                            return {
                                id: account.id,
                                nickname: account.weiboNickname,
                                avatar: account.weiboAvatar,
                                healthScore: score !== null ? score : 10000,
                                status: account.status
                            };
                        })
                    );

                    accountsWithScore.sort((a, b) => b.healthScore - a.healthScore);

                    const selected = accountsWithScore[0];
                    if (!selected) {
                        throw new Error('账号列表为空');
                    }

                    const selectedAccount = accounts.find(acc => acc.id === selected.id);

                    if (!selectedAccount) {
                        throw new Error('选中账号数据异常');
                    }

                    ast.list = accountsWithScore;
                    ast.selectedId = selected.id;
                    ast.cookies = selectedAccount.cookies;

                    await this.redis.zincrby(this.healthKey, -1, selected.id.toString());

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { list: accountsWithScore, selectedId: selected.id, cookies: selectedAccount.cookies } }
                    ];
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[WeiboAccountPickAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[WeiboAccountPickAstVisitor]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
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
