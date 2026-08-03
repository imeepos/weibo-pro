import { Injector, Logger } from '@sker/core';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { BetterAuthWrapper } from './utils/auth-wrapper';

/**
 * 创建 Hono 应用（CORS、静态文件、Better Auth 路由、404/错误处理）
 */
export function createHonoApp(opts: {
  logger: Logger;
  authWrapper: BetterAuthWrapper;
}): Hono<{ Bindings: { injector: Injector } }> {
  const { logger, authWrapper } = opts;

  const app = new Hono<{ Bindings: { injector: Injector } }>();

  // CORS 配置
  app.use('*', cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'Accept',
      'Origin',
      'Cache-Control'
    ],
    credentials: true,
    maxAge: 86400,
  }));

  // 静态文件服务 - /uploads 路径
  app.use('/uploads/*', serveStatic({ root: './' }));

  // Better Auth 路由（支持所有请求格式）
  app.on(['GET', 'POST', "PUT", "DELETE", "PATCH"], '/api/auth/*', async (c) => {
    // 注入 injector 到请求对象
    Reflect.set(c.req.raw, 'injector', c.env.injector);

    // 使用包装器处理请求
    return authWrapper.handle(c.req.raw);
  });

  // 404 处理
  app.notFound((c) => {
    logger.warn('API route not found', {
      timestamp: new Date().toISOString(),
      path: c.req.path,
      method: c.req.method,
      query: c.req.query(),
      headers: {
        'user-agent': c.req.header('user-agent'),
        'x-forwarded-for': c.req.header('x-forwarded-for'),
        'x-real-ip': c.req.header('x-real-ip'),
      }
    });

    return c.json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${c.req.method} ${c.req.path} not found`,
        timestamp: new Date().toISOString(),
        details: {
          path: c.req.path,
          method: c.req.method,
          query: c.req.query(),
        }
      }
    }, 404);
  });

  // 错误处理
  app.onError((err, c) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: c.req.path,
      method: c.req.method
    });

    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message,
        timestamp: new Date().toISOString()
      }
    }, 500);
  });

  return app;
}
