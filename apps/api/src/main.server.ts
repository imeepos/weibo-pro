import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createInjector, root, Logger, REQUEST, RESPONSE, Injector } from '@sker/core';
import type { Hono } from 'hono';
import { ClaudeGateway } from './claude';
import { getRequestBody, getEventName } from './main.utils';

/**
 * 创建 HTTP 服务器（含 Socket.IO、Claude Gateway 初始化、WebSocket 广播）
 */
export function createApiServer(
  app: Hono<{ Bindings: { injector: Injector } }>,
  logger: Logger
) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: ['GET', 'HEAD'].includes(req.method || '') ? null : await getRequestBody(req)
    });
    const reqInjector = createInjector([
      { provide: REQUEST, useValue: req },
      { provide: RESPONSE, useValue: res },
    ], root, 'feature');
    const response = await app.fetch(request, { injector: reqInjector });

    // SSE 由 controller.factory 直接写入 res，跳过标准响应处理
    if (res.headersSent) return;

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
        'exp://*',  // Expo 开发服务器
        // 生产环境 origin
        'http://43.240.223.138:8088',
        'http://43.240.223.138',
        'https://wb.sker.us',
        'https://*.sker.us',
      ],
      credentials: true,
    }
  });

  // 初始化 Claude Gateway
  const claudeGateway = root.get(ClaudeGateway);
  claudeGateway.initialize(io);
  logger.info('✓ Claude Gateway initialized');

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

  return server;
}
