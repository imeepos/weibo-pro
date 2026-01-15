import { Injectable } from '@sker/core';

/**
 * 微博 Worker 代理服务
 * 通过 Cloudflare Workers 发送请求，防止 IP 封禁
 */
@Injectable()
export class WeiboWorkerProxyService {
    private readonly enabled: boolean;
    private readonly workerUrl: string;
    private readonly maxRetries: number;
    private readonly initialRetryDelay: number;

    constructor() {
        this.enabled = process.env.WEIBO_WORKER_PROXY_ENABLED !== 'false';
        this.workerUrl = process.env.WEIBO_WORKER_PROXY_URL || 'https://api.sker.us/weibo-proxy';
        this.maxRetries = Number(process.env.WEIBO_PROXY_MAX_RETRIES) || 3;
        this.initialRetryDelay = Number(process.env.WEIBO_PROXY_RETRY_DELAY) || 1000;
    }

    /**
     * 通过 Worker 代理发送请求，支持指数退避重试
     */
    async fetch(url: string, headers: Record<string, string>): Promise<Response> {
        if (!this.enabled) {
            return fetch(url, { headers });
        }

        const cookies = this.extractCookiesFromHeaders(headers);
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const proxyResponse = await fetch(this.workerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(30000),
                    body: JSON.stringify({
                        url,
                        cookies,
                        referer: headers.referer,
                        userAgent: headers['user-agent'],
                    }),
                });

                if (!proxyResponse.ok) {
                    throw new Error(`Worker proxy error: ${proxyResponse.status}`);
                }

                const proxyData = await proxyResponse.json();

                return new Response(proxyData.body, {
                    status: proxyData.status,
                    statusText: proxyData.statusText,
                    headers: proxyData.headers,
                }) as Response;
            } catch (error) {
                lastError = error as Error;
                const isRetryable = this.isRetryableError(lastError);

                if (!isRetryable || attempt === this.maxRetries) {
                    console.error(`[WeiboWorkerProxy] 请求失败，不再重试: ${lastError.message}`);
                    throw lastError;
                }

                const delay = this.initialRetryDelay * Math.pow(2, attempt);
                console.warn(`[WeiboWorkerProxy] 请求失败，${delay}ms 后重试 (${attempt + 1}/${this.maxRetries}): ${lastError.message}`);
                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    /**
     * 判断错误是否可重试
     */
    private isRetryableError(error: Error): boolean {
        const message = error.message.toLowerCase();
        const retryablePatterns = [
            'etimedout',
            'econnrefused',
            'econnreset',
            'enotfound',
            'eai_again',
            'fetch failed',
            'network',
            'timeout',
        ];

        return retryablePatterns.some(pattern => message.includes(pattern));
    }

    /**
     * 延迟函数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 从请求头中提取 Cookie
     */
    private extractCookiesFromHeaders(headers: Record<string, string>): Array<{ name: string; value: string }> {
        const cookieHeader = headers.cookie || headers.Cookie;
        if (!cookieHeader) {
            return [];
        }

        return cookieHeader.split(';')
            .map(cookie => {
                const parts = cookie.split('=');
                if (parts.length < 2) return null;
                const name = parts[0]?.trim();
                const value = parts.slice(1).join('=').trim();
                if (!name || !value) return null;
                return { name, value };
            })
            .filter((cookie): cookie is { name: string; value: string } => cookie !== null);
    }
}
