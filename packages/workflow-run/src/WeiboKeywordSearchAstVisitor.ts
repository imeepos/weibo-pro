import { Inject, Injectable, NoRetryError, createLogger } from "@sker/core";
import { Handler, NodeEvent, setAstError } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";
import { WeiboHtmlParser } from "./services/WeiboHtmlParser";
import { PlaywrightService } from "./services/PlaywrightService";
import { WorkerBrowserService } from "./services/WorkerBrowserService";
import { WeiboAccountService } from "./services/weibo-account.service";
import { DelayService } from "./services/delay.service";
import { Observable, Subscriber, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { ErrorHandlerOperators } from "./utils/error-handler.util";
import {
    EntityManager,
  useEntityManager,
  WeiboPostEntity,
  WeiboPostSnapshotEntity,
} from "@sker/entities";

const logger = createLogger('WeiboKeywordSearchAstVisitor');

@Injectable()
export class WeiboKeywordSearchAstVisitor {
    constructor(
        @Inject(WeiboHtmlParser) private parser: WeiboHtmlParser,
        @Inject(PlaywrightService) private playwright: PlaywrightService,
        @Inject(WorkerBrowserService) private workerBrowser: WorkerBrowserService,
        @Inject(WeiboAccountService) private account: WeiboAccountService,
        @Inject(DelayService) private delayService: DelayService
    ) { }

    @Handler(WeiboKeywordSearchAst)
    handler(ast: WeiboKeywordSearchAst, input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

            const wrappedCtx = {
                ...ctx,
                abortSignal: abortController.signal,
                get isAborted() {
                    return abortController.signal.aborted || (ctx as any).abortSignal?.aborted;
                }
            };

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

                    await this.executeSearch(ast, wrappedCtx, obs);
                    return [];
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[WeiboKeywordSearchAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[WeiboKeywordSearchAstVisitor]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    obs.next({ type: 'node_fail', id: ast.id, error: error?.message });
                    // 发射 null 数据让下游节点可以继续处理
                    obs.next({
                        type: 'node_emit',
                        id: ast.id,
                        data: { mblogid: null, uid: null, isEnd: true }
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
                subscription.unsubscribe();
                abortController.abort();
                obs.complete();
            };
        });
    }

    private async executeSearch(
        ast: WeiboKeywordSearchAst,
        ctx: { abortSignal?: AbortSignal },
        obs: Subscriber<NodeEvent>
    ): Promise<void> {
        if (ctx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
        }

        const selection = await this.account.selectBestAccount();
        if (!selection) {
            throw new Error('没有可用账号');
        }

        const { keyword, startDate, endDate = new Date(), page = 1 } = ast;
        if (!keyword || !startDate || !endDate) {
            throw new NoRetryError(`WeiboSearchUrlBuilderAst 缺少必要参数: keyword:${keyword}, start:${startDate}, end:${endDate}`);
        }

        const base = 'https://s.weibo.com/weibo';
        const params = new URLSearchParams({ q: keyword, typeall: `1`, suball: `1`, page: String(page), Refer: `g` });
        params.set('timescope', `custom:${formatDate(startDate)}:${formatDate(endDate)}`);
        const url = `${base}?${params.toString()}`;

        ast.state = 'running';
        ast.currentPage = 1;
        obs.next({ type: 'node_runing', id: ast.id });

        if (ctx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
        }

        let html = await this.getHtmlWithFallback(url, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`);
        let result = this.parser.parseSearchResultHtml(html);

        for (const post of result.posts) {
            if (ctx.abortSignal?.aborted) {
                throw new Error('工作流已取消');
            }

            // 检查帖子是否在12小时内已有快照
            const shouldSkip = await useEntityManager(async (m: EntityManager) => {
                // 根据帖子ID查找帖子记录
                const isLongId = /^\d{16,}$/.test(post.mid);
                const postEntity = await m.findOne(WeiboPostEntity, {
                    where: isLongId ? { id: post.mid } : { mblogid: post.mid }
                });

                if (!postEntity) {
                    // 帖子不存在，正常发射
                    return false;
                }

                // 查询最新快照时间
                const latestSnapshot = await m.findOne(WeiboPostSnapshotEntity, {
                    where: { post_id: postEntity.id },
                    order: { snapshot_at: 'DESC' }
                });

                if (!latestSnapshot) {
                    // 无快照，正常发射
                    return false;
                }

                // 检查是否小于12小时
                const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
                return latestSnapshot.snapshot_at > twelveHoursAgo;
            });

            // 如果需要跳过，则跳过
            if (shouldSkip) {
                continue;
            }

            // 正常发射帖子事件
            ast.mblogid = post.mid;
            ast.uid = post.uid;
            obs.next({
                type: 'node_emit',
                id: ast.id,
                data: { mblogid: ast.mblogid, uid: ast.uid }
            });
            await this.delayService.randomDelay(ast.emitDelayMin || 1, ast.emitDelayMax || 3);
        }

        let currentPageNum = 1;
        const maxPageRetries = 2;

        while (result.hasNextPage && result.nextPageLink) {
            if (ctx.abortSignal?.aborted) {
                throw new Error('工作流已取消');
            }

            let pageRetryCount = 0;
            let pageSuccess = false;

            while (pageRetryCount < maxPageRetries && !pageSuccess) {
                try {
                    if (!result.nextPageLink) return;
                    currentPageNum++;

                    if (!result.nextPageLink) {
                        throw new Error('下一页链接为空');
                    }

                    html = await this.getHtmlWithFallback(result.nextPageLink, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`);
                    result = this.parser.parseSearchResultHtml(html);

                    ast.currentPage = currentPageNum;
                    for (const post of result.posts) {
                        if (ctx.abortSignal?.aborted) {
                            throw new Error('工作流已取消');
                        }

                        // 检查帖子是否在12小时内已有快照
                        const shouldSkip = await useEntityManager(async (m: import('@sker/entities').EntityManager) => {
                            // 根据帖子ID查找帖子记录
                            const isLongId = /^\d{16,}$/.test(post.mid);
                            const postEntity = await m.findOne(WeiboPostEntity, {
                                where: isLongId ? { id: post.mid } : { mblogid: post.mid }
                            });

                            if (!postEntity) {
                                // 帖子不存在，正常发射
                                return false;
                            }

                            // 查询最新快照时间
                            const latestSnapshot = await m.findOne(WeiboPostSnapshotEntity, {
                                where: { post_id: postEntity.id },
                                order: { snapshot_at: 'DESC' }
                            });

                            if (!latestSnapshot) {
                                // 无快照，正常发射
                                return false;
                            }

                            // 检查是否小于12小时
                            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
                            return latestSnapshot.snapshot_at > twelveHoursAgo;
                        });

                        // 如果需要跳过，则跳过
                        if (shouldSkip) {
                            continue;
                        }

                        // 正常发射帖子事件
                        ast.mblogid = post.mid;
                        ast.uid = post.uid;
                        obs.next({
                            type: 'node_emit',
                            id: ast.id,
                            data: { mblogid: ast.mblogid, uid: ast.uid }
                        });
                        await this.delayService.randomDelay(ast.emitDelayMin || 1, ast.emitDelayMax || 3);
                    }

                    pageSuccess = true;

                    if (result.totalCount) {
                        break;
                    }
                    await this.delayService.randomDelay(ast.pageDelayMin || 3, ast.pageDelayMax || 5);
                } catch (error) {
                    pageRetryCount++;
                    console.warn(`[WeiboKeywordSearchAstVisitor] 分页搜索失败，第${pageRetryCount}次重试: ${result.nextPageLink}`, error);

                    if (pageRetryCount >= maxPageRetries) {
                        console.warn(`[WeiboKeywordSearchAstVisitor] 分页搜索失败，跳过当前页: ${result.nextPageLink}`);
                        break;
                    }

                    await this.delayService.randomDelay(ast.pageDelayMin || 3, ast.pageDelayMax || 5);
                }
            }

            if (!pageSuccess) {
                break;
            }
        }

        if (result.totalCount && result.currentPage === result.totalPage && result.totalPage === 50) {
            if (result.lastPostTime) {
                ast.endDate = result.lastPostTime;
                console.log(`[WeiboKeywordSearchAst] 达到50页上限，调整时间范围后继续采集...`);
                return await this.executeSearch(ast, ctx, obs);
            }
        }
    }

    private async getHtmlWithFallback(url: string, cookies: string, ua: string): Promise<string> {
        const workerEnabled = process.env.WORKER_BROWSER_ENABLED === 'true';

        if (workerEnabled) {
            try {
                return await this.workerBrowser.getHtml(url, cookies, ua);
            } catch (error) {
                logger.warn('[WorkerBrowser] 失败，降级到本地 Playwright', {
                    url,
                    error: (error as Error).message
                });
            }
        }

        // 降级到本地 Playwright
        return await this.playwright.getHtml(url, cookies, ua);
    }
}

const formatDate = (date: Date | string | number | object | undefined | null) => {
    // 处理空对象、null、undefined 的情况 - 静默使用当前时间
    if (date == null || (typeof date === 'object' && Object.keys(date as object).length === 0)) {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
            String(now.getHours()).padStart(2, '0'),
        ].join('-');
    }

    // 确保转换为有效的 Date 对象
    const time = new Date(date as string | number | Date);

    // 检查日期是否有效
    if (isNaN(time.getTime())) {
        logger.error(`[formatDate] 无效的日期值: ${typeof date === 'object' ? JSON.stringify(date) : date}`);
        // 返回当前日期作为后备
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
            String(now.getHours()).padStart(2, '0'),
        ].join('-');
    }

    return [
        time.getFullYear(),
        String(time.getMonth() + 1).padStart(2, '0'),
        String(time.getDate()).padStart(2, '0'),
        String(time.getHours()).padStart(2, '0'),
    ].join('-');
};
