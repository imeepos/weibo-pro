import "reflect-metadata";
// 强制使用UTC时区
process.env.TZ = 'UTC';
import "dotenv/config";
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";
import { Logger, root } from '@sker/core';
import { entitiesProviders, seedNuwa, seedSentimentAnalyzer, seedContentAuditor, seedDataValidator, seedProgrammingAssistant, useTranslation } from "@sker/entities";
import { killPortProcess } from 'kill-port-process';
import { join } from 'path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { betterAuth } from 'better-auth';
import { createSkerAuthPlugin } from '@sker/auth';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';

async function bootstrap() {
  const PORT = parseInt(process.env.PORT || `3000`);
  const logger = root.get(Logger);

  // 初始化 DI 容器
  root.set([...entitiesProviders]);
  await root.init();

  // 种子数据初始化
  await useTranslation(async m => {
    await seedNuwa(m);
    await seedSentimentAnalyzer(m);
    await seedContentAuditor(m);
    await seedDataValidator(m);
    await seedProgrammingAssistant(m);
    logger.info('✓ All seed roles initialized');
  });

  // 开发环境端口清理
  if (process.env.DEV) {
    try {
      await killPortProcess(PORT);
      logger.info(`端口 ${PORT} 清理完成`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`端口 ${PORT} 清理失败: ${errorMessage}`);
    }
  }

  // 创建 Hono 应用
  const app = new Hono();

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
      'Origin'
    ],
    credentials: true,
    maxAge: 86400,
  }));

  // 静态文件服务 - /uploads 路径
  app.use('/uploads/*', serveStatic({ root: './' }));

  // Better Auth 初始化
  const auth = betterAuth({
    database: {
      provider: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/weibo'
    },
    plugins: [
      createSkerAuthPlugin([])
    ]
  });

  // 注册 Better Auth 路由
  app.on(['GET', 'POST'], '/api/auth/*', (c) => {
    return auth.handler(c.req.raw);
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

  // 创建 HTTP 服务器
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: ['GET', 'HEAD'].includes(req.method || '') ? null : await getRequestBody(req)
    });

    const response = await app.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  });

  // Socket.IO 服务器
  const io = new SocketIOServer(server, {
    path: '/ws',
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:5173',
      ],
      credentials: true,
    }
  });

  let connectedClients = 0;

  io.on('connection', (socket) => {
    connectedClients++;
    logger.info('Client connected', {
      clientId: socket.id,
      totalClients: connectedClients
    });

    socket.on('disconnect', () => {
      connectedClients--;
      logger.info('Client disconnected', {
        clientId: socket.id,
        totalClients: connectedClients
      });
    });
  });

  // 将 WebSocket 广播功能暴露给全局
  global.websocketBroadcast = (message: any) => {
    const eventName = getEventName(message);
    io.emit(eventName, message);

    logger.debug('Message broadcasted', {
      event: eventName,
      messageType: message.type,
      clientCount: connectedClients
    });
  };

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server started at http://localhost:${PORT}`);
    logger.info('✓ HTTP API ready');
    logger.info('✓ WebSocket ready at /ws');
  });
}

/**
 * 读取请求体
 */
function getRequestBody(req: IncomingMessage): Promise<BodyInit | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(null));
  });
}

/**
 * 映射消息类型到前端期望的事件名
 */
function getEventName(message: any): string {
  switch (message.type) {
    case 'update':
      return 'data:update';
    case 'alert':
      return 'data:alert';
    case 'heartbeat':
      return 'data:heartbeat';
    case 'connection':
      return 'data:connection';
    default:
      return 'data:update';
  }
}

// 进程信号处理
process.on('SIGTERM', () => {
  const logger = root.get(Logger);
  logger.info('Received SIGTERM signal, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  const logger = root.get(Logger);
  logger.info('Received SIGINT signal, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  const logger = root.get(Logger);
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise
  });
});

process.on('uncaughtException', (error) => {
  const logger = root.get(Logger);
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
});

// 全局类型声明
declare global {
  var websocketBroadcast: (message: any) => void;
}

bootstrap();
