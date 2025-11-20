import { Inject, Injectable, NoRetryError } from "@sker/core";
import { Handler, INode } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";
import { WeiboHtmlParser } from "./services/WeiboHtmlParser";
import { PlaywrightService } from "./services/PlaywrightService";
import { WeiboAccountService } from "./services/weibo-account.service";
import { delay } from "./services/utils";
import { Observable, Subscriber } from "rxjs";

@Injectable()
export class WeiboKeywordSearchAstVisitor {
    constructor(
        @Inject(WeiboHtmlParser) private parser: WeiboHtmlParser,
        @Inject(PlaywrightService) private playwright: PlaywrightService,
        @Inject(WeiboAccountService) private account: WeiboAccountService
    ) { }

    @Handler(WeiboKeywordSearchAst)
    handler(ast: WeiboKeywordSearchAst, ctx: any): Observable<INode> {
        return new Observable<INode>(obs => {
            this.executeSearch(ast, ctx, obs);
            return () => obs.complete();
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
            const selection = await this.account.selectBestAccount();
            if (!selection) {
                ast.state = 'fail';
                ast.setError(new Error('没有可用账号'));
                obs.next({ ...ast });
                return;
            }

            const { keyword, startDate, endDate, page = 1 } = ast;
            if (!keyword || !startDate || !endDate) {
                ast.state = 'fail';
                ast.setError(new NoRetryError('WeiboSearchUrlBuilderAst 缺少必要参数: keyword, start, end'));
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

            // 第一步：获取首页结果
            let html = await this.playwright.getHtml(url, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`);
            let result = this.parser.parseSearchResultHtml(html);

            // 2️⃣ 发射首页进度
            result.posts.map(post => {
                ast.state = 'emitting';
                ast.mblogid = post.mid;
                ast.uid = post.uid;
                obs.next({ ...ast });
            })

            // 第二步：分页采集
            let currentPageNum = 1;
            while (result.hasNextPage && result.nextPageLink) {
                try {
                    currentPageNum++;

                    html = await this.playwright.getHtml(result.nextPageLink, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`);
                    result = this.parser.parseSearchResultHtml(html);

                    // 3️⃣ 发射分页进度
                    ast.currentPage = currentPageNum;
                    result.posts.map(post => {
                        ast.state = 'emitting';
                        ast.mblogid = post.mid;
                        ast.uid = post.uid;
                        obs.next({ ...ast });
                    })

                    if (result.totalCount) {
                        break;
                    }
                    await delay();
                } catch (error) {
                    console.warn(`[WeiboKeywordSearchAstVisitor] 分页搜索失败，跳过当前页: ${result.nextPageLink}`, error);
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
        } catch (error) {
            // 处理登录失效错误
            if (error instanceof Error && error.message === 'LOGIN_EXPIRED') {
                const selection = await this.account.selectBestAccount();
                if (selection) {
                    console.warn(`[WeiboKeywordSearchAstVisitor] 检测到账号 ${selection.id} 登录失效，标记为过期状态`);
                    await this.handleLoginExpired(selection.id);
                }
                await this.executeSearch(ast, ctx, obs);
                return;
            }

            console.error(`[WeiboKeywordSearchAstVisitor] 搜索失败: ${ast.keyword}`, error);
            ast.state = 'fail';
            if (error instanceof Error) {
                ast.setError(error, process.env.NODE_ENV === 'development');
            } else {
                ast.setError(new Error(String(error)));
            }
            obs.next({ ...ast });
        }
    }

    private async handleLoginExpired(accountId: number): Promise<void> {
        try {
            await this.account.decreaseHealthScore(accountId, 100);

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