import { Inject, Injectable, NoRetryError } from "@sker/core";
import { Handler } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";
import { WeiboHtmlParser } from "./ParsedSearchResult";
import { PlaywrightService } from "./PlaywrightService";
import { WeiboAccountService } from "./weibo-account.service";
import { delay } from "./utils";
import { Observable, from } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class WeiboKeywordSearchAstVisitor {
    constructor(
        @Inject(WeiboHtmlParser) private parser: WeiboHtmlParser,
        @Inject(PlaywrightService) private playwright: PlaywrightService,
        @Inject(WeiboAccountService) private account: WeiboAccountService
    ) { }

    @Handler(WeiboKeywordSearchAst)
    handler(ast: WeiboKeywordSearchAst, ctx: any): Observable<WeiboKeywordSearchAst> {
        return new Observable(observer => {
            // 异步执行采集逻辑
            from(this.executeSearch(ast, ctx, observer)).subscribe({
                next: updatedAst => {
                    observer.next(updatedAst);
                },
                error: error => {
                    console.error(`[WeiboKeywordSearchAstVisitor] 搜索失败: ${ast.keyword}`, error);
                    ast.state = 'fail';
                    if (error instanceof Error) {
                        ast.setError(error, process.env.NODE_ENV === 'development');
                    } else {
                        ast.setError(new Error(String(error)));
                    }
                    observer.next(ast);
                    observer.complete();
                },
                complete: () => {
                    observer.complete();
                }
            });
        });
    }

    /**
     * 核心搜索逻辑（内部递归方法）
     */
    private async executeSearch(
        ast: WeiboKeywordSearchAst,
        ctx: any,
        observer: any
    ): Promise<WeiboKeywordSearchAst> {
        const selection = await this.account.selectBestAccount();
        if (!selection) {
            ast.state = 'fail';
            console.error(`[WeiboKeywordSearchAstVisitor] 没有可用账号`);
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
            // 1️⃣ 发射初始状态
            ast.state = 'running';
            ast.currentPage = 1;  // 当前页码
            observer.next({ ...ast });

            // 第一步：获取首页结果
            let html = await this.playwright.getHtml(url, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`);
            let result = this.parser.parseSearchResultHtml(html);


            observer.next({ ...ast });  // 发射进度

            // 第二步：分页采集
            let currentPageNum = 1;
            while (result.hasNextPage && result.nextPageLink) {
                try {
                    currentPageNum++;

                    html = await this.playwright.getHtml(result.nextPageLink, selection.cookieHeader, `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`);
                    result = this.parser.parseSearchResultHtml(html);

                    // 2️⃣ 发射分页进度
                    ast.currentPage = currentPageNum;
                    observer.next({ ...ast });

                    if (result.totalCount) {
                        break;
                    }
                    await delay();
                } catch (error) {
                    console.warn(`[WeiboKeywordSearchAstVisitor] 分页搜索失败，跳过当前页: ${result.nextPageLink}`, error);
                    // 分页失败时跳过当前页，继续处理
                    break;
                }
            }

            // 第三步：判断是否达到50页上限，需要调整时间范围
            if (result.totalCount && result.currentPage === result.totalPage && result.totalPage === 50) {
                if (result.lastPostTime) {
                    ast.endDate = result.lastPostTime;
                    console.log(`[WeiboKeywordSearchAst] 达到50页上限，调整时间范围后继续采集...`);
                    return await this.executeSearch(ast, ctx, observer);  // 递归调用，继续采集
                }
            }

            // 第四步：完成采集
            ast.state = 'success';
            observer.next(ast);  // 发射最终状态

            return ast;
        } catch (error) {
            // 处理登录失效错误
            if (error instanceof Error && error.message === 'LOGIN_EXPIRED') {
                console.warn(`[WeiboKeywordSearchAstVisitor] 检测到账号 ${selection.id} 登录失效，标记为过期状态`);
                await this.handleLoginExpired(selection.id);
                // 重试使用其他账号
                return await this.executeSearch(ast, ctx, observer);
            }

            throw error;
        }
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