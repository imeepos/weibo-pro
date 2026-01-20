import { Injectable, createLogger, LoggerLevel } from '@sker/core';

enum CircuitState {
    CLOSED = 'closed',
    OPEN = 'open',
    HALF_OPEN = 'half_open'
}

/**
 * 微博 Worker 代理服务
 * 通过 Cloudflare Workers 发送请求，防止 IP 封禁
 *
 * 实现熔断器模式：当远程 Proxy 连续失败时自动降级到本地请求
 */
@Injectable()
export class WeiboWorkerProxyService {
    private readonly enabled: boolean;
    private readonly workerUrl: string;
    private readonly maxRetries: number;
    private readonly initialRetryDelay: number;

    private readonly failureThreshold: number;
    private readonly cooldownMs: number;
    private readonly autoFallback: boolean;

    private state: CircuitState = CircuitState.CLOSED;
    private failureCount = 0;
    private nextAttemptTime = 0;
    private readonly logger = createLogger('WeiboWorkerProxy', LoggerLevel.info);

    constructor() {
        this.enabled = process.env.WEIBO_WORKER_PROXY_ENABLED !== 'false';
        this.workerUrl = process.env.WEIBO_WORKER_PROXY_URL || 'https://api.sker.us/weibo-proxy';
        this.maxRetries = Number(process.env.WEIBO_PROXY_MAX_RETRIES) || 3;
        this.initialRetryDelay = Number(process.env.WEIBO_PROXY_RETRY_DELAY) || 1000;

        this.failureThreshold = Number(process.env.WEIBO_WORKER_PROXY_FAILURE_THRESHOLD) || 5;
        this.cooldownMs = Number(process.env.WEIBO_WORKER_PROXY_COOLDOWN_SECONDS) || 300 * 1000;
        this.autoFallback = process.env.WEIBO_WORKER_PROXY_AUTO_FALLBACK !== 'false';
    }

    /**
     * 通过 Worker 代理发送请求，支持熔断降级和指数退避重试
     */
    async fetch(url: string, headers: Record<string, string>): Promise<Response> {
        if (!this.enabled) {
            return this.fetchDirect(url, headers);
        }

        if (!this.shouldTryProxy()) {
            this.logger.debug('Proxy 熔断中，使用本地请求');
            return this.fetchDirect(url, headers);
        }

        try {
            const response = await this.fetchWithRetry(url, headers);
            this.recordProxySuccess();
            return response;
        } catch (error) {
            this.recordProxyFailure();

            if (this.autoFallback) {
                this.logger.warn(`Proxy 失败，降级到本地请求: ${(error as Error).message}`);
                return this.fetchDirect(url, headers);
            }

            throw error;
        }
    }

    private shouldTryProxy(): boolean {
        const now = Date.now();

        if (this.state === CircuitState.OPEN) {
            if (now >= this.nextAttemptTime) {
                this.logger.info('冷却期结束，进入试探状态');
                this.state = CircuitState.HALF_OPEN;
                return true;
            }
            return false;
        }

        return true;
    }

    private recordProxySuccess(): void {
        if (this.state === CircuitState.HALF_OPEN) {
            this.logger.info('Proxy 恢复正常');
            this.state = CircuitState.CLOSED;
        }
        this.failureCount = 0;
    }

    private recordProxyFailure(): void {
        this.failureCount++;

        if (this.failureCount >= this.failureThreshold) {
            const prevState = this.state;
            this.state = CircuitState.OPEN;
            this.nextAttemptTime = Date.now() + this.cooldownMs;
            this.logger.info(`状态转换: ${prevState} -> open`);
            this.logger.info(`Proxy 熔断（连续失败 ${this.failureCount} 次），${this.cooldownMs / 1000}s 后尝试恢复`);
        }
    }

    private async fetchWithRetry(url: string, headers: Record<string, string>): Promise<Response> {
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
                    throw lastError;
                }

                const delay = this.initialRetryDelay * Math.pow(2, attempt);
                this.logger.warn(`请求失败，${delay}ms 后重试 (${attempt + 1}/${this.maxRetries}): ${lastError.message}`);
                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    private async fetchDirect(url: string, headers: Record<string, string>): Promise<Response> {
        return fetch(url, { headers });
    }

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

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

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
