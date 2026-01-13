import type { ProxyRequest, ProxyResponse, ProxyError, Env } from '../types';
import { HeaderBuilder } from '../utils/header-builder';
import { Logger } from '../utils/logger';

/**
 * 通用代理处理器
 */
export class ProxyHandler {
  private static logger = new Logger(undefined, 'proxy-handler');

  static async handle(request: Request, env?: Env): Promise<Response> {
    // 初始化日志（如果配置了 Stream）
    if (env?.LOGS_STREAM) {
      this.logger = new Logger(env.LOGS_STREAM, 'proxy-handler');
    }

    const startTime = Date.now();

    try {
      const proxyRequest: ProxyRequest = await request.json();

      if (!proxyRequest.url) {
        this.logger.warn('Missing URL in proxy request');
        return this.errorResponse(400, 'URL is required');
      }

      this.logger.logProxyRequest(proxyRequest.url, proxyRequest.method || 'GET');

      const headers = HeaderBuilder.buildProxyHeaders(proxyRequest);

      const fetchOptions: RequestInit = {
        method: proxyRequest.method || 'GET',
        headers,
      };

      if (proxyRequest.body && ['POST', 'PUT', 'PATCH'].includes(proxyRequest.method || 'GET')) {
        if (typeof proxyRequest.body === 'string') {
          fetchOptions.body = proxyRequest.body;
        } else {
          fetchOptions.body = JSON.stringify(proxyRequest.body);
          headers['content-type'] = 'application/json';
        }
      }

      const response = await fetch(proxyRequest.url, fetchOptions);
      const responseBody = await response.text();

      this.logger.info('proxy.success', {
        url: proxyRequest.url,
        status: response.status,
        duration_ms: Date.now() - startTime,
      });

      const proxyResponse: ProxyResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
      };

      return new Response(JSON.stringify(proxyResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      this.logger.logError(error, {
        duration_ms: Date.now() - startTime,
      });
      return this.errorResponse(500, 'Internal proxy error', error);
    }
  }

  private static errorResponse(status: number, message: string, details?: unknown): Response {
    const error: ProxyError = {
      error: `ProxyError:${status}`,
      message,
      details,
    };

    return new Response(JSON.stringify(error), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
