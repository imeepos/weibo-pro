import { Inject, Injectable, NoRetryError } from "@sker/core";
import { Handler, NodeEvent, setAstError } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";
import { WeiboHtmlParser } from "./services/WeiboHtmlParser";
import { PlaywrightService } from "./services/PlaywrightService";
import { WeiboAccountService } from "./services/weibo-account.service";
import { DelayService } from "./services/delay.service";
import { Observable, Subscriber } from "rxjs";

@Injectable()
export class WeiboKeywordSearchAstVisitor {
    constructor(
        @Inject(WeiboHtmlParser) private parser: WeiboHtmlParser,
        @Inject(PlaywrightService) private playwright: PlaywrightService,
        @Inject(WeiboAccountService) private account: WeiboAccountService,
        @Inject(DelayService) private delayService: DelayService
    ) { }

    @Handler(WeiboKeywordSearchAst)
    handler(ast: WeiboKeywordSearchAst, input$: Observable<any>, ctx: any): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

            const wrappedCtx = {
                ...ctx,
                abortSignal: abortController.signal,
                get isAborted() {
                    return abortController.signal.aborted || ctx.abortSignal?.aborted;
                }
            };

            input$.subscribe({
                next: (inputData) => {
                    ast.emitCount += 1;
                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as any)[key] = inputData[key];
                        });
                    }
                },
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    obs.complete();
                },
                complete: () => {
                    this.executeSearch(ast, wrappedCtx, obs);
                }
            });

            return () => {
                console.log('[WeiboKeywordSearchAstVisitor] 订阅被取消，触发 AbortSignal');
                abortController.abort();
                obs.complete();
            };
        });
    }

    private async executeSearch(
        ast: WeiboKeywordSearchAst,
        ctx: any,
        obs: Subscriber<NodeEvent>
    ): Promise<void> {
        try {
            if (ctx.abortSignal?.aborted) {
                ast.state = 'fail';
                setAstError(ast, new Error('工作流已取消'));
                obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                return;
            }

            const selection = await this.account.selectBestAccount();
            if (!selection) {
                ast.state = 'fail';
                setAstError(ast, new Error('没有可用账号'));
                obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                return;
            }

            const { keyword, startDate, endDate = new Date(), page = 1 } = ast;
            if (!keyword || !startDate || !endDate) {
                ast.state = 'fail';
                setAstError(ast, new NoRetryError(`WeiboSearchUrlBuilderAst 缺少必要参数: keyword:${keyword}, start:${startDate}, end:${endDate}`));
                obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                return;
            }

            const base = 'https://s.weibo.com/weibo';
            const params = new URLSearchParams({ q: keyword, typeall: `1`, suball: `1`, page: String(page), Refer: `g` });
            params.set('timescope', `custom:${formatDate(startDate)}:${formatDate(endDate)}`);
            const url = `${base}?${params.toString()}`;

            ast.state = 'running';
            ast.currentPage = 1;
            obs.next({ type: 'node_runing', id: ast.id });

            if (ctx.abortSignal?.aborted) {
                ast.state = 'fail';
                setAstError(ast, new Error('工作流已取消'));
                obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                return;
            }

            let html = await this.playwright.getHtml(url, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`);
            let result = this.parser.parseSearchResultHtml(html);

            for (const post of result.posts) {
                if (ctx.abortSignal?.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    return;
                }
                ast.mblogid = post.mid;
                ast.uid = post.uid;
                obs.next({ type: 'node_emit', id: ast.id, property: 'mblogid', value: ast.mblogid });
                obs.next({ type: 'node_emit', id: ast.id, property: 'uid', value: ast.uid });
                await this.delayService.randomDelay(ast.emitDelayMin || 1, ast.emitDelayMax || 3);
            }

            let currentPageNum = 1;
            const maxPageRetries = 2;

            while (result.hasNextPage && result.nextPageLink) {
                if (ctx.abortSignal?.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                    return;
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
                                ast.state = 'fail';
                                setAstError(ast, new Error('工作流已取消'));
                                obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                                return;
                            }
                            ast.mblogid = post.mid;
                            ast.uid = post.uid;
                            obs.next({ type: 'node_emit', id: ast.id, property: 'mblogid', value: ast.mblogid });
                            obs.next({ type: 'node_emit', id: ast.id, property: 'uid', value: ast.uid });
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

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id });
            obs.complete()
        } catch (error) {
            console.error(`[WeiboKeywordSearchAstVisitor] 搜索失败: ${ast.keyword}`, error);
            ast.state = 'fail';
            if (error instanceof Error) {
                setAstError(ast, error, process.env.NODE_ENV === 'development');
            } else {
                setAstError(ast, new Error(String(error)));
            }
            obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
            obs.complete()
        }
    }
}

const formatDate = (date: Date) => {
    const time = new Date(date)
    return [
        time.getFullYear(),
        String(time.getMonth() + 1).padStart(2, '0'),
        String(time.getDate()).padStart(2, '0'),
        String(time.getHours()).padStart(2, '0'),
    ].join('-')
};
