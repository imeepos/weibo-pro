/**
 * 微博关键词搜索执行器（从 WeiboKeywordSearchAstVisitor 抽取）。
 * 由 Visitor 构造时手动创建，保持 Visitor 的 5 参构造函数签名不变。
 */
import { NoRetryError, createLogger } from "@sker/core";
import { NodeEvent } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";
import { useEntityManager, EventEntity } from "@sker/entities";
import { Subscriber } from "rxjs";
import { ParsedSearchResult, WeiboHtmlParser } from "./WeiboHtmlParser";
import { PlaywrightService } from "./PlaywrightService";
import { WorkerBrowserService } from "./WorkerBrowserService";
import { WeiboAccountService, WeiboAccountSelection } from "./weibo-account.service";
import { DelayService } from "./delay.service";
import { WeiboPostEmitter } from "./WeiboPostEmitter";
import { formatDate } from "../utils/weibo-date-format.util";

const logger = createLogger('WeiboKeywordSearchAstVisitor');

const USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`;

/** 执行上下文：携带中止信号 */
export interface SearchContext {
    abortSignal?: AbortSignal;
}

export class WeiboKeywordSearchExecutor {
    private postEmitter: WeiboPostEmitter;

    constructor(
        private parser: WeiboHtmlParser,
        private playwright: PlaywrightService,
        private workerBrowser: WorkerBrowserService,
        private account: WeiboAccountService,
        private delayService: DelayService
    ) {
        this.postEmitter = new WeiboPostEmitter(this.delayService);
    }

    /** 执行一次关键词搜索 */
    async executeSearch(
        ast: WeiboKeywordSearchAst,
        ctx: SearchContext,
        obs: Subscriber<NodeEvent>
    ): Promise<void> {
        logger.info('[WeiboKeywordSearch] 开始执行搜索，参数:', {
            keyword: ast.keyword,
            startDate: ast.startDate,
            endDate: ast.endDate,
            page: ast.page
        });

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

        // 确保 startDate <= endDate
        const start = startDate < endDate ? startDate : endDate;
        const end = startDate < endDate ? endDate : startDate;

        const base = 'https://s.weibo.com/weibo';
        const params = new URLSearchParams({ q: keyword, typeall: `1`, suball: `1`, page: String(page), Refer: `g` });
        params.set('timescope', `custom:${formatDate(start)}:${formatDate(end)}`);
        const url = `${base}?${params.toString()}`;

        ast.state = 'running';
        ast.currentPage = 1;
        obs.next({ type: 'node_runing', id: ast.id });

        if (ctx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
        }

        logger.info('[WeiboKeywordSearch] 开始获取 HTML，URL:', url);
        let html = await this.getHtmlWithFallback(url, selection.cookieHeader, USER_AGENT);
        logger.info('[WeiboKeywordSearch] HTML 获取成功，长度:', html.length);

        let result: ParsedSearchResult;
        try {
            result = this.parser.parseSearchResultHtml(html);
        } catch (error) {
            // 检测登录失效错误
            if (error instanceof Error && error.message === 'LOGIN_EXPIRED') {
                logger.warn(`[WeiboKeywordSearch] 检测到账号 ${selection.id} 登录失效，标记为过期状态`);
                await this.account.markAccountAsExpired(selection.id);
            }
            throw error;
        }
        logger.info('[WeiboKeywordSearch] 解析结果:', {
            postsCount: result.posts.length,
            hasNextPage: result.hasNextPage,
            isEmptyResult: result.isEmptyResult,
            currentPage: result.currentPage,
            totalPage: result.totalPage
        });

        // 如果无结果（"抱歉，未找到相关结果"），直接发射空结果并结束
        if (result.isEmptyResult) {
            logger.info(`[WeiboKeywordSearchAst] 关键词 "${keyword}" 在时间区间 ${formatDate(start)} - ${formatDate(end)} 内无帖子`);

            // 设置 crawl_end_reason
            await this.updateEventCrawlEndReason(ast, `无搜索结果。关键词：${ast.keyword}，时间范围：${formatDate(start)}-${formatDate(end)}`);

            obs.next({
                type: 'node_emit',
                id: ast.id,
                data: { mblogid: null, uid: null, isEmptyResult: true }
            });
            await this.delayService.randomDelay(ast.emitDelayMin || 1, ast.emitDelayMax || 3);
            return;
        }

        logger.info('[WeiboKeywordSearch] 开始处理帖子列表，帖子数量:', result.posts.length);
        await this.postEmitter.emitPosts(ast, ctx, obs, result.posts);

        // 分页处理
        const paginated = await this.paginate(result, ast, ctx, obs, selection);
        if (!paginated) {
            return;
        }
        result = paginated;

        if (result.totalCount && result.currentPage === result.totalPage && result.totalPage === 50) {
            if (result.lastPostTime) {
                ast.endDate = result.lastPostTime;
                logger.info(`[WeiboKeywordSearchAst] 达到50页上限，调整时间范围后继续采集... 新 endDate:`, result.lastPostTime);
                await this.delayService.randomDelay(ast.emitDelayMin || 1, ast.emitDelayMax || 3);
                return await this.executeSearch(ast, ctx, obs);
            }
        }

        logger.info('[WeiboKeywordSearch] 搜索完成，准备更新事件爬取结束原因和最后爬取时间');

        // 正常退出时更新事件爬取结束原因和最后爬取时间
        await this.updateEventCompletion(ast, result);
    }

    /** 分页抓取；返回 null 表示提前结束（分页链接为空时已设置 crawl_end_reason） */
    private async paginate(
        initialResult: ParsedSearchResult,
        ast: WeiboKeywordSearchAst,
        ctx: SearchContext,
        obs: Subscriber<NodeEvent>,
        selection: WeiboAccountSelection
    ): Promise<ParsedSearchResult | null> {
        let result = initialResult;
        let currentPageNum = 1;
        const maxPageRetries = 2;

        logger.info('[WeiboKeywordSearch] 开始分页处理，hasNextPage:', result.hasNextPage, 'nextPageLink:', result.nextPageLink);

        while (result.hasNextPage && result.nextPageLink) {
            if (ctx.abortSignal?.aborted) {
                throw new Error('工作流已取消');
            }

            let pageRetryCount = 0;
            let pageSuccess = false;

            while (pageRetryCount < maxPageRetries && !pageSuccess) {
                try {
                    if (!result.nextPageLink) {
                        // 设置 crawl_end_reason
                        await this.updateEventCrawlEndReason(ast, `分页链接为空，搜索结束。关键词：${ast.keyword}，当前页：${currentPageNum}`);
                        await this.delayService.randomDelay(ast.emitDelayMin || 1, ast.emitDelayMax || 3);
                        return null;
                    }
                    currentPageNum++;

                    if (!result.nextPageLink) {
                        throw new Error('下一页链接为空');
                    }

                    logger.info('[WeiboKeywordSearch] 获取第', currentPageNum, '页，URL:', result.nextPageLink);
                    const html = await this.getHtmlWithFallback(result.nextPageLink, selection.cookieHeader, USER_AGENT);

                    try {
                        result = this.parser.parseSearchResultHtml(html);
                    } catch (error) {
                        // 检测登录失效错误
                        if (error instanceof Error && error.message === 'LOGIN_EXPIRED') {
                            logger.warn(`[WeiboKeywordSearch] 检测到账号 ${selection.id} 登录失效，标记为过期状态`);
                            await this.account.markAccountAsExpired(selection.id);
                        }
                        throw error;
                    }
                    logger.info('[WeiboKeywordSearch] 第', currentPageNum, '页解析结果，帖子数量:', result.posts.length);

                    ast.currentPage = currentPageNum;
                    await this.postEmitter.emitPosts(ast, ctx, obs, result.posts);

                    pageSuccess = true;

                    if (result.totalCount) {
                        await this.delayService.randomDelay(ast.emitDelayMin || 1, ast.emitDelayMax || 3);
                        break;
                    }
                    await this.delayService.randomDelay(ast.pageDelayMin || 3, ast.pageDelayMax || 5);
                } catch (error) {
                    pageRetryCount++;
                    logger.warn(`[WeiboKeywordSearchAstVisitor] 分页搜索失败，第${pageRetryCount}次重试: ${result.nextPageLink}`, error);

                    if (pageRetryCount >= maxPageRetries) {
                        logger.warn(`[WeiboKeywordSearchAstVisitor] 分页搜索失败，跳过当前页: ${result.nextPageLink}`);
                        break;
                    }

                    await this.delayService.randomDelay(ast.pageDelayMin || 3, ast.pageDelayMax || 5);
                }
            }

            if (!pageSuccess) {
                await this.delayService.randomDelay(ast.emitDelayMin || 1, ast.emitDelayMax || 3);
                break;
            }
        }

        return result;
    }

    /** 获取 HTML：WorkerBrowser 优先，失败降级到本地 Playwright */
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

    /** 更新事件爬取结束原因 */
    private async updateEventCrawlEndReason(ast: WeiboKeywordSearchAst, reason: string): Promise<void> {
        await useEntityManager(async (manager) => {
            if (ast.event_id) {
                const event = await manager.findOne(EventEntity, { where: { id: ast.event_id } });
                if (event) {
                    event.crawl_end_reason = reason;
                    await manager.save(EventEntity, event);
                }
            }
        });
    }

    /** 搜索完成时更新事件爬取结束原因和最后爬取时间 */
    private async updateEventCompletion(ast: WeiboKeywordSearchAst, result: ParsedSearchResult): Promise<void> {
        await useEntityManager(async (manager) => {
            if (ast.event_id) {
                const event = await manager.findOne(EventEntity, { where: { id: ast.event_id } });
                if (event) {
                    const reasons: string[] = [];

                    if (!result.hasNextPage) {
                        reasons.push(`${ast.startDate}-${ast.endDate}: 无更多数据`);
                    }

                    if (result.totalCount) {
                        reasons.push('微博已返回全部数据');
                    }

                    if (result.totalPage >= 50) {
                        reasons.push('达到50页上限');
                    }

                    if (reasons.length === 0) {
                        reasons.push('搜索完成');
                    }

                    event.crawl_end_reason = `${reasons.join('，')}。关键词：${ast.keyword}，当前页：${result.currentPage}/${result.totalPage}`;
                    event.last_crawl_at = new Date(); // 更新最后爬取时间
                    await manager.save(EventEntity, event);
                    logger.info(`[WeiboKeywordSearch] 已更新事件 last_crawl_at: ${event.last_crawl_at.toISOString()}`);
                }
            }
        });
    }
}
