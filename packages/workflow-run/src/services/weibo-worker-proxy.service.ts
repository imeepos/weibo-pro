import { Injectable } from '@sker/core';

/**
 * 微博 Worker 代理服务
 * 通过 Cloudflare Workers 发送请求，防止 IP 封禁
 */
@Injectable()
export class WeiboWorkerProxyService {
    private readonly enabled: boolean;
    private readonly workerUrl: string;

    constructor() {
        this.enabled = process.env.WEIBO_WORKER_PROXY_ENABLED !== 'false';
        this.workerUrl = process.env.WEIBO_WORKER_PROXY_URL || 'https://api.sker.us/weibo-proxy';
    }

    /**
     * 通过 Worker 代理发送请求
     */
    async fetch(url: string, headers: Record<string, string>): Promise<Response> {
        if (!this.enabled) {
            return fetch(url, { headers });
        }

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
