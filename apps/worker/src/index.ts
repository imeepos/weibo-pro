import type { Env } from './types';
import { ProxyHandler } from './handlers/proxy.handler';
import { WeiboProxyHandler } from './handlers/weibo-proxy.handler';
import { HealthHandler } from './handlers/health.handler';
import { CorsHandler } from './utils/cors';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return CorsHandler.handleOptions();
    }

    try {
      if (path === '/health' && request.method === 'GET') {
        return HealthHandler.handle(request, env);
      }

      if (path === '/proxy' && request.method === 'POST') {
        const response = await ProxyHandler.handle(request);
        return CorsHandler.addCorsHeaders(response, request);
      }

      if (path === '/weibo-proxy' && request.method === 'POST') {
        const response = await WeiboProxyHandler.handle(request);
        return CorsHandler.addCorsHeaders(response, request);
      }

      return new Response(JSON.stringify({
        error: 'Not Found',
        message: 'Endpoint not found',
        availableEndpoints: [
          'GET /health - Health check',
          'POST /proxy - Generic proxy',
          'POST /weibo-proxy - Weibo专用代理',
        ],
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : String(error),
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
