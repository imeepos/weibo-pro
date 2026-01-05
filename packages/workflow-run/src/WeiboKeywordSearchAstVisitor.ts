import { Inject, Injectable, NoRetryError, createLogger } from "@sker/core";
import { Handler, NodeEvent, setAstError } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";
import { WeiboHtmlParser } from "./services/WeiboHtmlParser";
import { PlaywrightService } from "./services/PlaywrightService";
import { WeiboAccountService } from "./services/weibo-account.service";
import { DelayService } from "./services/delay.service";
import { Observable, Subscriber, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { ErrorHandlerOperators } from "./utils/error-handler.util";

const logger = createLogger('WeiboKeywordSearchAstVisitor');

@Injectable()
export class WeiboKeywordSearchAstVisitor {
    constructor(
        @Inject(WeiboHtmlParser) private parser: WeiboHtmlParser,
        @Inject(PlaywrightService) private playwright: PlaywrightService,
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
                ErrorHandlerOperators.createRetryOperator<NodeEvent[]>(ast, { logPrefix: '[WeiboKeywordSearchAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator<NodeEvent[]>(ast, { logPrefix: '[WeiboKeywordSearchAstVisitor]' }),
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
                console.log('[WeiboKeywordSearchAstVisitor] 订阅被取消，触发 AbortSignal');
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

        let html = await this.playwright.getHtml(url, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`);
        let result = this.parser.parseSearchResultHtml(html);

        for (const post of result.posts) {
            if (ctx.abortSignal?.aborted) {
                throw new Error('工作流已取消');
            }
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

                    html = await this.playwright.getHtml(result.nextPageLink, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`);
                    result = this.parser.parseSearchResultHtml(html);

                    ast.currentPage = currentPageNum;
                    for (const post of result.posts) {
                        if (ctx.abortSignal?.aborted) {
                            throw new Error('工作流已取消');
                        }
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
