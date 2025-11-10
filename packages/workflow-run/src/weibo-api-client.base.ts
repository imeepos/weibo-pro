import { Inject } from '@sker/core';
import { WeiboAccountService } from './weibo-account.service';
import { WeiboRequestHeaderBuilder } from './weibo-request-header.builder';
import { WeiboRefererBuilder } from './weibo-referer.builder';
import { WeiboErrorHandler, WeiboError, WeiboErrorType } from './weibo-error.handler';
import { delay } from './utils';

export interface FetchApiOptions {
    url: string;
    refererOptions: { uid?: string; mid?: string };
}

export interface FetchPaginationOptions<T> {
    buildUrl: (page: number) => string;
    refererOptions: { uid?: string; mid?: string };
    shouldContinue: (data: T) => boolean;
}

/**
 * 微博 API 客户端基类
 *
 * 存在即合理：
 * - 消除 8 个 Visitor 中 550 行重复代码
 * - 统一账号选择、Token 提取、请求头构造、错误处理
 *
 * 优雅即简约：
 * - fetchApi(): 单次请求模式，适合详情类 API
 * - fetchWithPagination(): 分页生成器模式，适合列表类 API
 * - 子类只需关注业务逻辑，不关心基础设施
 */
export abstract class WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) protected readonly accountService: WeiboAccountService,
    ) {}

    /**
     * 单次 API 请求
     *
     * @param options 请求配置
     * @returns API 响应数据
     * @throws WeiboError 当请求失败时
     */
    protected async fetchApi<T>(options: FetchApiOptions): Promise<T> {
        const selection = await this.accountService.selectBestAccountWithToken();
        if (!selection) {
            throw new WeiboError(
                WeiboErrorType.UNKNOWN_ERROR,
                '没有可用账号'
            );
        }

        const referer = WeiboRefererBuilder.auto(options.refererOptions);

        const headers = WeiboRequestHeaderBuilder.buildStandardHeaders({
            cookieHeader: selection.cookieHeader,
            xsrfToken: selection.xsrfToken,
            referer,
        });

        const response = await fetch(options.url, { headers });

        if (!response.ok) {
            const error = await WeiboErrorHandler.checkResponse(response);
            if (error) {
                await this.handleWeiboError(error, selection.id);
                throw WeiboErrorHandler.toNoRetryErrorIfNeeded(error);
            }
        }

        const data = await response.json();
        const error = await WeiboErrorHandler.checkResponse(response, data);
        if (error) {
            await this.handleWeiboError(error, selection.id);
            throw WeiboErrorHandler.toNoRetryErrorIfNeeded(error);
        }

        return data;
    }

    /**
     * 处理微博 API 错误
     *
     * @param error 错误对象
     * @param accountId 账号 ID
     */
    private async handleWeiboError(error: WeiboError, accountId: number): Promise<void> {
        // 只处理登录失效错误
        if (error.type === WeiboErrorType.LOGIN_EXPIRED) {
            console.warn(`[WeiboApiClient] 检测到账号 ${accountId} 登录失效，标记为过期状态`);
            await this.markAccountAsExpired(accountId);
        }
    }

    /**
     * 标记账号为过期状态
     *
     * @param accountId 账号 ID
     */
    private async markAccountAsExpired(accountId: number): Promise<void> {
        try {
            // 从 Redis 健康评分中移除失效账号
            await this.accountService.decreaseHealthScore(accountId, 100);

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
                    console.log(`[WeiboApiClient] 账号 ${accountId} 已标记为过期状态`);
                }
            });
        } catch (error) {
            console.error(`[WeiboApiClient] 更新账号 ${accountId} 状态失败:`, error);
        }
    }

    /**
     * 分页请求生成器
     *
     * @param options 分页配置
     * @yields 每页的响应数据
     */
    protected async *fetchWithPagination<T>(
        options: FetchPaginationOptions<T>
    ): AsyncGenerator<T, void, unknown> {
        let page = 1;

        while (true) {
            const url = options.buildUrl(page);
            const data = await this.fetchApi<T>({ url, refererOptions: options.refererOptions });

            yield data;

            if (!options.shouldContinue(data)) {
                break;
            }

            page++;
            await delay();
        }
    }
}
