/**
 * 微博请求头构造器
 *
 * 存在即合理：
 * - 统一管理所有微博 API 请求的 HTTP 头
 * - 消除 8 处重复的请求头构造代码
 *
 * 优雅即简约：
 * - 单一职责：只负责构造请求头
 * - 不可变：所有方法都是静态的，无状态
 * - 版本集中管理：client-version 和 server-version 统一维护
 */

export interface WeiboRequestHeaderOptions {
    cookieHeader: string;
    xsrfToken: string;
    referer: string;
    method?: 'GET' | 'POST';
}

export interface WeiboVersionInfo {
    clientVersion: string;
    serverVersion: string;
    userAgent: string;
}

export class WeiboRequestHeaderBuilder {
    /**
     * 版本信息 - 集中管理，便于统一升级
     */
    private static readonly VERSION_INFO: WeiboVersionInfo = {
        clientVersion: 'v2.47.129',
        serverVersion: 'v2025.10.24.3',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    };

    /**
     * 构造标准微博 API 请求头
     *
     * @param options 请求配置
     * @returns Headers 对象，可直接用于 fetch
     */
    static buildStandardHeaders(options: WeiboRequestHeaderOptions): Record<string, string> {
        const { cookieHeader, xsrfToken, referer, method = 'GET' } = options;

        return {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9',
            'client-version': this.VERSION_INFO.clientVersion,
            'priority': 'u=1, i',
            'referer': referer,
            'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'server-version': this.VERSION_INFO.serverVersion,
            'user-agent': this.VERSION_INFO.userAgent,
            'x-requested-with': 'XMLHttpRequest',
            'x-xsrf-token': xsrfToken,
            'cookie': cookieHeader,
        };
    }

    /**
     * 获取版本信息
     *
     * 用于诊断和日志记录
     */
    static getVersionInfo(): WeiboVersionInfo {
        return { ...this.VERSION_INFO };
    }
}
