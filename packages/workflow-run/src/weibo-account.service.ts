import { Inject, Injectable } from '@sker/core';
import { RedisClient } from '@sker/redis';
import {
    useEntityManager,
    WeiboAccountEntity,
    WeiboAccountStatus,
} from '@sker/entities';

export interface RequestWithHeaders {
    url?: string;
    query?: Record<string, string | number | undefined>;
    headers?: Record<string, string>;
}

export interface WeiboAccountSelection {
    id: number;
    weiboUid?: string;
    nickname?: string;
    healthScore: number;
    cookieHeader: string;
}

export interface WeiboAccountSelectionWithToken extends WeiboAccountSelection {
    xsrfToken: string;
}

export interface WeiboLoginSuccessMessage {
    id: number;
    cookies: Array<{
        name: string;
        value: string;
        domain?: string;
        path?: string;
        secure?: boolean;
        httpOnly?: boolean;
        sameSite?: string;
        expirationDate?: number;
    }>;
    userInfo: {
        id: number;
        screen_name: string;
        profile_image_url: string;
        [key: string]: any;
    };
    timestamp: number;
    isValid: boolean;
}

@Injectable()
export class WeiboAccountService {
    private readonly healthKey = 'weibo:account:health';
    private readonly maxAttempts = 5;

    constructor(
        @Inject(RedisClient) private readonly redis: RedisClient,
    ) { }

    async injectCookies<T extends RequestWithHeaders>(
        request: T
    ): Promise<WeiboAccountSelection | null> {
        try {
            const selection = await this.selectBestAccount();

            if (!selection) {
                return null;
            }

            if (!request.headers) {
                request.headers = {};
            }
            request.headers.Cookie = selection.cookieHeader;
            request.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
            return selection;
        } catch (error) {
            return null;
        }
    }

    async decreaseHealthScore(accountId: number, amount = 1): Promise<void> {
        if (!Number.isFinite(accountId)) {
            return;
        }

        const member = accountId.toString(10);
        const decrement = Math.abs(amount) * -1;
        const updated = await this.redis.zincrby(this.healthKey, decrement, member);
        const clamped = Math.max(updated, 0);

        if (clamped !== updated) {
            await this.redis.zadd(this.healthKey, clamped, member);
        }
    }

    async selectBestAccount(): Promise<WeiboAccountSelection | null> {
        // 首先尝试从Redis选择健康评分最高的账号
        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            const picked = await this.redis.zpopmax(this.healthKey);
            if (!picked) {
                break; // Redis中没有账号，进入回退逻辑
            }

            const accountId = Number.parseInt(picked.member, 10);

            if (!Number.isFinite(accountId)) {
                await this.redis.zrem(this.healthKey, picked.member);
                continue;
            }

            const account = await useEntityManager(async m => {
                return m.findOne(WeiboAccountEntity, {
                    where: { id: accountId }
                })
            })

            if (!account) {
                await this.redis.zrem(this.healthKey, picked.member);
                continue;
            }

            if (account.status !== WeiboAccountStatus.ACTIVE) {
                await this.redis.zrem(this.healthKey, picked.member);
                continue;
            }

            const cookieHeader = this.composeCookieHeader(account.cookies);

            if (!cookieHeader) {
                await this.redis.zrem(this.healthKey, picked.member);
                continue;
            }

            const newScore = Math.max(0, picked.score - 1);
            await this.redis.zadd(this.healthKey, newScore, picked.member);

            return {
                id: account.id,
                weiboUid: account.weiboUid,
                nickname: account.weiboNickname,
                healthScore: newScore,
                cookieHeader,
            };
        }

        // Redis中没有可用账号，从数据库查询活跃账号
        const activeAccounts = await useEntityManager(async m => {
            return m.find(WeiboAccountEntity, {
                where: { status: WeiboAccountStatus.ACTIVE }
            })
        });

        for (const account of activeAccounts) {
            const cookieHeader = this.composeCookieHeader(account.cookies);
            if (!cookieHeader) {
                continue;
            }

            // 为从数据库查询到的账号初始化健康评分
            await this.redis.zadd(this.healthKey, 100, account.id.toString());

            return {
                id: account.id,
                weiboUid: account.weiboUid,
                nickname: account.weiboNickname,
                healthScore: 100,
                cookieHeader,
            };
        }

        return null;
    }

    async selectBestAccountWithToken(): Promise<WeiboAccountSelectionWithToken | null> {
        const selection = await this.selectBestAccount();
        if (!selection) {
            return null;
        }

        const xsrfToken = this.extractXsrfToken(selection.cookieHeader);
        if (!xsrfToken) {
            return null;
        }

        return { ...selection, xsrfToken };
    }

    private extractXsrfToken(cookieHeader: string): string | null {
        const cookies = cookieHeader.split(';').map(it => it.trim());
        for (const cookie of cookies) {
            const [name, value] = cookie.split('=').map(it => it.trim());
            if (name === 'XSRF-TOKEN' && value) {
                return value;
            }
        }
        return null;
    }

    private composeCookieHeader(raw: string | null | undefined): string | null {
        if (!raw || !raw.trim()) {
            return null;
        }

        const trimmed = raw.trim();

        try {
            const parsed = JSON.parse(trimmed);

            if (Array.isArray(parsed)) {
                const fragments = parsed
                    .map((entry) => {
                        if (!entry) {
                            return '';
                        }
                        const name = typeof entry.name === 'string' ? entry.name.trim() : '';
                        const value = typeof entry.value === 'string' ? entry.value.trim() : '';
                        if (!name || !value) {
                            return '';
                        }
                        return `${name}=${value}`;
                    })
                    .filter((fragment) => fragment.length > 0);

                return fragments.length > 0 ? fragments.join('; ') : null;
            }
        } catch {
            // fall through - treat as plain cookie string
        }

        return trimmed.includes('=') ? trimmed : null;
    }

    async saveOrUpdateAccount(message: WeiboLoginSuccessMessage): Promise<WeiboAccountEntity | null> {
        if (!message.isValid || !message.cookies?.length) {
            return null;
        }

        const weiboUid = message.id.toString();
        const cookiesJson = JSON.stringify(message.cookies);

        const account = await useEntityManager(async m => {
            let existing = await m.findOne(WeiboAccountEntity, {
                where: { weiboUid }
            });

            if (existing) {
                existing.cookies = cookiesJson;
                existing.weiboNickname = message.userInfo.screen_name;
                existing.weiboAvatar = message.userInfo.profile_image_url;
                existing.status = WeiboAccountStatus.ACTIVE;
                existing.lastCheckAt = new Date();
                return await m.save(existing);
            }

            const newAccount = m.create(WeiboAccountEntity, {
                weiboUid,
                weiboNickname: message.userInfo.screen_name,
                weiboAvatar: message.userInfo.profile_image_url,
                cookies: cookiesJson,
                status: WeiboAccountStatus.ACTIVE,
                lastCheckAt: new Date(),
            });

            return await m.save(newAccount);
        });

        if (account) {
            const currentScore = await this.redis.zscore(this.healthKey, account.id.toString());
            if (currentScore === null) {
                await this.redis.zadd(this.healthKey, 100, account.id.toString());
            }
        }

        return account;
    }
}
