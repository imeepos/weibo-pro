import type { ProxyRequest, ProxyResponse, ProxyError } from '../types';
import { HeaderBuilder } from '../utils/header-builder';

/**
 * 通用代理处理器
 */
export class ProxyHandler {
  static async handle(request: Request): Promise<Response> {
    try {
      const proxyRequest: ProxyRequest = await request.json();

      if (!proxyRequest.url) {
        return this.errorResponse(400, 'URL is required');
      }

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
      console.error('Proxy error:', error);
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
