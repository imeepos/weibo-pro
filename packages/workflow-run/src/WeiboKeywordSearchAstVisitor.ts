import { Inject, Injectable, NoRetryError } from "@sker/core";
import { Handler, INode, setAstError } from "@sker/workflow";
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
    handler(ast: WeiboKeywordSearchAst, ctx: any): Observable<INode> {
        return new Observable<INode>(obs => {
            // 创建专门的 AbortController 用于取消订阅
            const abortController = new AbortController();

            // 包装 ctx，优先使用我们的 AbortController
            const wrappedCtx = {
                ...ctx,
                abortSignal: abortController.signal,
                // 保留原始信号以支持级联取消
                get isAborted() {
                    return abortController.signal.aborted || ctx.abortSignal?.aborted;
                }
            };

            // 执行搜索
            this.executeSearch(ast, wrappedCtx, obs);

            // 返回取消函数 - 真正的清理逻辑
            return () => {
                console.log('[WeiboKeywordSearchAstVisitor] 订阅被取消，触发 AbortSignal');
                // 触发 abort 会让所有监听此 signal 的操作停止
                abortController.abort();
                obs.complete();
            };
        });
    }

    /**
     * 核心搜索逻辑（内部递归方法）
     */
    private async executeSearch(
        ast: WeiboKeywordSearchAst,
        ctx: any,
        obs: Subscriber<INode>
    ): Promise<void> {
        try {
            // 检查取消信号
            if (ctx.abortSignal?.aborted) {
                ast.state = 'fail';
                setAstError(ast, new Error('工作流已取消'));
                obs.next({ ...ast });
                return;
            }

            const selection = await this.account.selectBestAccount();
            if (!selection) {
                ast.state = 'fail';
                setAstError(ast, new Error('没有可用账号'));
                obs.next({ ...ast });
                return;
            }

            const { keyword, startDate, endDate = new Date(), page = 1 } = ast;
            if (!keyword || !startDate || !endDate) {
                ast.state = 'fail';
                setAstError(ast, new NoRetryError(`WeiboSearchUrlBuilderAst 缺少必要参数: keyword:${keyword}, start:${startDate}, end:${endDate}`));
                obs.next({ ...ast });
                return;
            }

            const base = 'https://s.weibo.com/weibo';
            const params = new URLSearchParams({ q: keyword, typeall: `1`, suball: `1`, page: String(page), Refer: `g` });
            params.set('timescope', `custom:${formatDate(startDate)}:${formatDate(endDate)}`);
            const url = `${base}?${params.toString()}`;

            // 1️⃣ 发射初始状态
            ast.state = 'running';
            ast.currentPage = 1;
            obs.next({ ...ast });

            // 检查取消信号
            if (ctx.abortSignal?.aborted) {
                ast.state = 'fail';
                setAstError(ast, new Error('工作流已取消'));
                obs.next({ ...ast });
                return;
            }

            // 第一步：获取首页结果
            let html = await this.playwright.getHtml(url, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`);
            let result = this.parser.parseSearchResultHtml(html);

            // 2️⃣ 发射首页进度（串行发射，确保延迟生效）
            for (const post of result.posts) {
                // 检查取消信号
                if (ctx.abortSignal?.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ ...ast });
                    return;
                }

                ast.state = 'emitting';
                ast.mblogid = post.mid;
                ast.uid = post.uid;
                obs.next({ ...ast });
                await this.delayService.randomDelay(ast.emitDelayMin || 1, ast.emitDelayMax || 3);
            }

            // 第二步：分页采集
            let currentPageNum = 1;
            const maxPageRetries = 2; // 每页最大重试次数

            while (result.hasNextPage && result.nextPageLink) {
                // 检查取消信号
                if (ctx.abortSignal?.aborted) {
                    ast.state = 'fail';
                    setAstError(ast, new Error('工作流已取消'));
                    obs.next({ ...ast });
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

                        // 3️⃣ 发射分页进度（串行发射，确保延迟生效）
                        ast.currentPage = currentPageNum;
                        for (const post of result.posts) {
                            // 检查取消信号
                            if (ctx.abortSignal?.aborted) {
                                ast.state = 'fail';
                                setAstError(ast, new Error('工作流已取消'));
                                obs.next({ ...ast });
                                return;
                            }

                            ast.state = 'emitting';
                            ast.mblogid = post.mid;
                            ast.uid = post.uid;
                            obs.next({ ...ast });
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

                        // 重试前等待一段时间
                        await this.delayService.randomDelay(ast.pageDelayMin || 3, ast.pageDelayMax || 5);
                    }
                }

                // 如果当前页重试失败，跳出分页循环
                if (!pageSuccess) {
                    break;
                }
            }

            // 第三步：判断是否达到50页上限，需要调整时间范围
            if (result.totalCount && result.currentPage === result.totalPage && result.totalPage === 50) {
                if (result.lastPostTime) {
                    ast.endDate = result.lastPostTime;
                    console.log(`[WeiboKeywordSearchAst] 达到50页上限，调整时间范围后继续采集...`);
                    return await this.executeSearch(ast, ctx, obs);
                }
            }

            // 第四步：完成采集
            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete()
        } catch (error) {
            console.error(`[WeiboKeywordSearchAstVisitor] 搜索失败: ${ast.keyword}`, error);
            ast.state = 'fail';
            if (error instanceof Error) {
                setAstError(ast, error, process.env.NODE_ENV === 'development');
            } else {
                setAstError(ast, new Error(String(error)));
            }
            obs.next({ ...ast });
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