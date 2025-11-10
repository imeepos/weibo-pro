import { Inject, Injectable, NoRetryError } from "@sker/core";
import { Handler, WorkflowGraphAst } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";
import { WeiboHtmlParser } from "./ParsedSearchResult";
import { PlaywrightService } from "./PlaywrightService";
import { WeiboAccountService } from "./weibo-account.service";
import { useQueue } from "@sker/mq";
import { delay } from "./utils";
import { createWeiboDetailGraphAst } from "./createWeiboDetailGraphAst";

@Injectable()
export class WeiboKeywordSearchAstVisitor {
    private queue = useQueue<WorkflowGraphAst>('workflow');

    constructor(
        @Inject(WeiboHtmlParser) private parser: WeiboHtmlParser,
        @Inject(PlaywrightService) private playwright: PlaywrightService,
        @Inject(WeiboAccountService) private account: WeiboAccountService
    ) { }

    @Handler(WeiboKeywordSearchAst)
    async handler(ast: WeiboKeywordSearchAst, ctx: any): Promise<WeiboKeywordSearchAst> {
        const selection = await this.account.selectBestAccount();
        if (!selection) {
            ast.state = 'fail';
            console.error(`[WeiboKeywordSearchAstVisitor] 没有可用账号`)
            return ast;
        }
        const { keyword, startDate, endDate, page = 1 } = ast;
        if (!keyword || !startDate || !endDate) {
            ast.state = 'fail';
            throw new NoRetryError('WeiboSearchUrlBuilderAst 缺少必要参数: keyword, start, end');
        }
        const base = 'https://s.weibo.com/weibo';
        const params = new URLSearchParams({ q: keyword, typeall: `1`, suball: `1`, page: String(page), Refer: `g` });
        params.set('timescope', `custom:${formatDate(startDate)}:${formatDate(endDate)}`);
        const url = `${base}?${params.toString()}`;

        try {
            let html = await this.playwright.getHtml(url, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`)
            let result = this.parser.parseSearchResultHtml(html)
            // 判断是否继续
            await Promise.all(result.posts.map(async post => {
                await this.pushMq(post)
            }))
            while (result.hasNextPage && result.nextPageLink) {
                try {
                    html = await this.playwright.getHtml(result.nextPageLink, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`)
                    result = this.parser.parseSearchResultHtml(html)
                    // 判断是否继续
                    await Promise.all(result.posts.map(async post => {
                        await this.pushMq(post)
                    }))
                    if (result.totalCount) {
                        break;
                    }
                    await delay()
                } catch (error) {
                    console.warn(`[WeiboKeywordSearchAstVisitor] 分页搜索失败，跳过当前页: ${result.nextPageLink}`, error);
                    // 分页失败时跳过当前页，继续处理
                    break;
                }
            }
            if (result.totalCount && result.currentPage === result.totalPage && result.totalPage === 50) {
                if (result.lastPostTime) {
                    ast.endDate = result.lastPostTime;
                    return await this.handler(ast, ctx)
                }
            }
            ast.state = 'success';
            return ast;
        } catch (error) {
            // 处理登录失效错误
            if (error instanceof Error && error.message === 'LOGIN_EXPIRED') {
                console.warn(`[WeiboKeywordSearchAstVisitor] 检测到账号 ${selection.id} 登录失效，标记为过期状态`);
                await this.handleLoginExpired(selection.id);
                // 重试使用其他账号
                return await this.handler(ast, ctx);
            }

            // 设置错误状态，确保错误信息不会丢失
            ast.state = 'fail';
            ast.error = error instanceof Error ? error : new Error(String(error));
            console.error(`[WeiboKeywordSearchAstVisitor] 搜索失败: ${ast.keyword}`, error);
            return ast;
        }
    }

    private async pushMq(post: { mid: string, uid: string }) {
        this.queue.producer.next(createWeiboDetailGraphAst(post.mid, post.uid));
        console.log(`[WeiboKeywordSearch] 推送帖子到 NLP 队列: mid=${post.mid}`);
    }

    private async handleLoginExpired(accountId: number): Promise<void> {
        try {
            // 从 Redis 健康评分中移除失效账号
            await this.account.decreaseHealthScore(accountId, 100);

            // 更新数据库中的账号状态为 EXPIRED
            const { useEntityManager, WeiboAccountEntity, WeiboAccountStatus } = await import('@sker/entities');
            await useEntityManager(async m => {
                const account = await m.findOne(WeiboAccountEntity, {
                    where: { id: accountId }
                });
                if (account) {
                    account.status = WeiboAccountStatus.EXPIRED;
                    account.lastCheckAt = new Date();
                    await m.save(account);
                    console.log(`[WeiboKeywordSearchAstVisitor] 账号 ${accountId} 已标记为过期状态`);
                }
            });
        } catch (error) {
            console.error(`[WeiboKeywordSearchAstVisitor] 更新账号 ${accountId} 状态失败:`, error);
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