import type { WeiboProxyRequest, ProxyError, Env } from '../types';
import { HeaderBuilder } from '../utils/header-builder';
import { Logger } from '../utils/logger';

/**
 * 微博专用代理处理器
 */
export class WeiboProxyHandler {
  private static logger = new Logger(undefined, 'weibo-proxy-handler');

  static async handle(request: Request, env?: Env): Promise<Response> {
    // 初始化日志（如果配置了 Stream）
    if (env?.LOGS_STREAM) {
      this.logger = new Logger(env.LOGS_STREAM, 'weibo-proxy-handler');
    }

    const startTime = Date.now();

    try {
      const proxyRequest: WeiboProxyRequest = await request.json();

      if (!proxyRequest.url) {
        this.logger.warn('Missing URL in weibo proxy request');
        return this.errorResponse(400, 'URL is required');
      }

      this.logger.logProxyRequest(proxyRequest.url, proxyRequest.method || 'GET');

      const headers = HeaderBuilder.buildWeiboHeaders(proxyRequest);

      const fetchOptions: RequestInit = {
        method: proxyRequest.method || 'GET',
        headers,
      };

      if (proxyRequest.body && ['POST', 'PUT', 'PATCH'].includes(proxyRequest.method || 'GET')) {
        if (typeof proxyRequest.body === 'string') {
          fetchOptions.body = proxyRequest.body;
        } else {
          fetchOptions.body = JSON.stringify(proxyRequest.body);
        }
      }

      const response = await fetch(proxyRequest.url, fetchOptions);
      const responseBody = await response.text();

      this.logger.info('weibo-proxy.success', {
        url: proxyRequest.url,
        status: response.status,
        duration_ms: Date.now() - startTime,
      });

      return new Response(JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      this.logger.logError(error, {
        duration_ms: Date.now() - startTime,
      });
      return this.errorResponse(500, 'Weibo proxy error', error);
    }
  }

  private static errorResponse(status: number, message: string, details?: unknown): Response {
    const error: ProxyError = {
      error: `WeiboProxyError:${status}`,
      message,
      details,
    };

    return new Response(JSON.stringify(error), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
