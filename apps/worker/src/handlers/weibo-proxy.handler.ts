import type { WeiboProxyRequest, ProxyError } from '../types';
import { HeaderBuilder } from '../utils/header-builder';

/**
 * 微博专用代理处理器
 */
export class WeiboProxyHandler {
  static async handle(request: Request): Promise<Response> {
    try {
      const proxyRequest: WeiboProxyRequest = await request.json();

      if (!proxyRequest.url) {
        return this.errorResponse(400, 'URL is required');
      }

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
      console.error('Weibo proxy error:', error);
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
