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
    async handler(ast: WeiboKeywordSearchAst, ctx: any) {
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
        let html = await this.playwright.getHtml(url, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`)
        let result = this.parser.parseSearchResultHtml(html)
        // 判断是否继续
        await Promise.all(result.posts.map(async post => {
            await this.pushMq(post)
        }))
        while (result.hasNextPage && result.nextPageLink) {
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
        }
        if (result.totalCount && result.currentPage === result.totalPage && result.totalPage === 50) {
            if (result.lastPostTime) {
                ast.endDate = result.lastPostTime;
                await this.handler(ast, ctx)
            }
        }
    }

    private async pushMq(post: { mid: string, uid: string }) {
        this.queue.producer.next(createWeiboDetailGraphAst(post.mid, post.uid));
        console.log(`[WeiboKeywordSearch] 推送帖子到 NLP 队列: mid=${post.mid}`);
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