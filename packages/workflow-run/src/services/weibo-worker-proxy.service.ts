import { Injectable, Inject } from '@sker/core';
import { ConfigService } from '@sker/core';

/**
 * 微博 Worker 代理服务
 * 通过 Cloudflare Workers 发送请求，防止 IP 封禁
 */
@Injectable()
export class WeiboWorkerProxyService {
    private readonly enabled: boolean;
    private readonly workerUrl: string;

    constructor(@Inject(ConfigService) private readonly config: ConfigService) {
        this.enabled = this.config.get('WEIBO_WORKER_PROXY_ENABLED', 'true') === 'true';
        this.workerUrl = this.config.get('WEIBO_WORKER_PROXY_URL', 'https://api.sker.us/weibo-proxy');
    }

    /**
     * 通过 Worker 代理发送请求
     */
    async fetch(url: string, headers: Record<string, string>): Promise<Response> {
        if (!this.enabled) {
            // 直接请求
            return fetch(url, { headers });
        }

        // 通过 Worker 代理
        const cookies = this.extractCookiesFromHeaders(headers);

        const proxyResponse = await fetch(this.workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

        // 构造模拟 Response
        return new Response(proxyData.body, {
            status: proxyData.status,
            statusText: proxyData.statusText,
            headers: proxyData.headers,
        }) as Response;
    }

    /**
     * 从请求头中提取 Cookie
     */
    private extractCookiesFromHeaders(headers: Record<string, string>): Array<{ name: string; value: string }> {
        const cookieHeader = headers.cookie || headers.Cookie;
        if (!cookieHeader) {
            return [];
        }

        return cookieHeader.split(';').map(cookie => {
            const [name, value] = cookie.split('=').map(s => s.trim());
            return { name, value };
        }).filter(cookie => cookie.name && cookie.value);
    }
}
