/**
 * WebSocket Gateway - 消息广播中心
 *
 * 存在即合理：
 * - 管理所有 WebSocket 连接
 * - 提供消息广播能力
 * - 对接前端 Socket.IO 客户端
 *
 * 优雅即简约：
 * - 单一职责：只负责连接管理和消息转发
 * - 无业务逻辑：消息来自 MQ，直接转发
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

@WebSocketGateway({
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
  },
})
export class AppWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: any;

  private connectedClients = 0;

  afterInit() {
    logger.info('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients++;
    logger.info('Client connected', {
      clientId: client.id,
      totalClients: this.connectedClients,
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    logger.info('Client disconnected', {
      clientId: client.id,
      totalClients: this.connectedClients,
    });
  }

  /**
   * 广播消息到所有连接的客户端
   *
   * 性能即艺术：
   * - 使用 Socket.IO 的高效广播机制
   * - 消息类型化，确保类型安全
   */
  broadcast(message: any) {
    if (!this.server) {
      logger.warn('WebSocket server not initialized');
      return;
    }

    // 根据消息类型选择对应的事件名
    const eventName = this.getEventName(message);

    this.server.emit(eventName, message);

    logger.debug('Message broadcasted', {
      event: eventName,
      messageType: message.type,
      clientCount: this.connectedClients,
    });
  }

  /**
   * 映射消息类型到前端期望的事件名
   */
  private getEventName(message: any): string {
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

  /**
   * 获取当前连接数
   */
  get clientCount(): number {
    return this.connectedClients;
  }
}
