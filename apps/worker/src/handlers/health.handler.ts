import type { Env } from '../types';

/**
 * 健康检查处理器
 */
export class HealthHandler {
  static handle(_request: Request, _env: Env): Response {
    return new Response(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
