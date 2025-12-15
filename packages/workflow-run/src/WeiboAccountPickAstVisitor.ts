import { Inject, Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { WeiboAccountPickAst } from '@sker/workflow-ast';
import {
    useEntityManager,
    WeiboAccountEntity,
    WeiboAccountStatus,
} from '@sker/entities';
import { RedisClient } from '@sker/redis';
import { Observable } from 'rxjs';

@Injectable()
export class WeiboAccountPickAstVisitor {
    private readonly healthKey = 'weibo:account:health';

    constructor(
        @Inject(RedisClient) private readonly redis: RedisClient,
    ) { }

    @Handler(WeiboAccountPickAst)
    visit(ast: WeiboAccountPickAst, _ctx: any): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const handler = async () => {
                try {
                    ast.state = 'running';
          obs.next({ type: 'node_runing', id: ast.id, data: ast });
                    ast.count += 1;
                    obs.next({ type: 'node_runing', id: ast.id, data: ast });

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
                                healthScore: score !== null ? score : 100,
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

                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id, data: ast });
                    obs.complete();
                } catch (error) {
                    ast.state = 'fail';
                    setAstError(ast, error, process.env.NODE_ENV === 'development');
                    obs.next({ type: 'node_fail', id: ast.id, data: ast });
                    obs.complete();
                }
            };
            handler();
            return () => obs.complete();
        });
    }
}
