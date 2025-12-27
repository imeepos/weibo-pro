/**
 * Claude Service - Claude 消息服务
 *
 * 存在即合理:
 * - 管理客户端连接映射
 * - 将客户端命令发送到 RabbitMQ
 * - 将执行端响应路由回正确的客户端
 *
 * 优雅即简约:
 * - 单一职责：消息路由和连接管理
 * - 使用 RxJS 处理消息流
 */

import { Injectable, createLogger } from '@sker/core';
import { useQueue, type MessageEnvelope } from '@sker/mq';
import { Subscription } from 'rxjs';
import type { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type {
  ClaudeCommand,
  ClaudeResponse,
  WsClaudeCommand,
  WsClaudeResponse,
  ClientConnection,
} from './types';

/** 命令队列名称 */
const COMMANDS_QUEUE = 'claude.commands';
/** 响应队列名称 */
const RESPONSES_QUEUE = 'claude.responses';

@Injectable({ providedIn: 'auto' })
export class ClaudeService {
  private logger = createLogger('ClaudeService');

  /** 客户端 ID → Socket 映射 */
  private clientSockets = new Map<string, Socket>();

  /** Socket ID → 客户端 ID 映射 */
  private socketToClient = new Map<string, string>();

  /** 客户端连接信息 */
  private clientConnections = new Map<string, ClientConnection>();

  /** 命令队列 */
  private commandQueue = useQueue<ClaudeCommand>(COMMANDS_QUEUE);

  /** 响应订阅 */
  private responseSubscription: Subscription | null = null;

  /** Socket.IO 服务器实例 */
  private io: SocketIOServer | null = null;

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 初始化服务
   */
  initialize(io: SocketIOServer): void {
    if (this.initialized) {
      this.logger.warn('服务已初始化');
      return;
    }

    this.io = io;
    this.listenToResponseQueue();
    this.initialized = true;
    this.logger.info('Claude 服务初始化完成');
  }

  /**
   * 关闭服务
   */
  shutdown(): void {
    if (this.responseSubscription) {
      this.responseSubscription.unsubscribe();
      this.responseSubscription = null;
    }

    this.clientSockets.clear();
    this.socketToClient.clear();
    this.clientConnections.clear();
    this.initialized = false;
    this.logger.info('Claude 服务已关闭');
  }

  /**
   * 注册客户端连接
   */
  registerClient(socket: Socket): string {
    // 生成客户端 ID
    const clientId = uuidv4();

    // 保存映射
    this.clientSockets.set(clientId, socket);
    this.socketToClient.set(socket.id, clientId);
    this.clientConnections.set(clientId, {
      socketId: socket.id,
      connectedAt: Date.now(),
      activeTasks: new Set(),
    });

    this.logger.info(`客户端已连接: clientId=${clientId}, socketId=${socket.id}`);
    return clientId;
  }

  /**
   * 注销客户端连接
   */
  unregisterClient(socket: Socket): void {
    const clientId = this.socketToClient.get(socket.id);
    if (clientId) {
      this.clientSockets.delete(clientId);
      this.clientConnections.delete(clientId);
    }
    this.socketToClient.delete(socket.id);

    this.logger.info(`客户端已断开: clientId=${clientId}, socketId=${socket.id}`);
  }

  /**
   * 发送命令到执行端
   */
  async sendCommand(clientId: string, wsCommand: WsClaudeCommand): Promise<string> {
    const socket = this.clientSockets.get(clientId);
    if (!socket) {
      throw new Error(`客户端不存在: ${clientId}`);
    }

    // 生成任务 ID
    const taskId = uuidv4();

    // 构建命令消息
    const command: ClaudeCommand = {
      taskId,
      clientId,
      sessionId: wsCommand.sessionId,
      command: wsCommand.command,
      cwd: wsCommand.cwd,
      model: wsCommand.model,
      timestamp: Date.now(),
    };

    // 记录活动任务
    const connection = this.clientConnections.get(clientId);
    if (connection) {
      connection.activeTasks.add(taskId);
    }

    // 发送到命令队列
    this.commandQueue.producer.next(command);
    this.logger.info(`命令已发送: taskId=${taskId}, clientId=${clientId}`);

    return taskId;
  }

  /**
   * 获取客户端 ID
   */
  getClientId(socketId: string): string | undefined {
    return this.socketToClient.get(socketId);
  }

  /**
   * 获取活动客户端数量
   */
  getActiveClientCount(): number {
    return this.clientSockets.size;
  }

  /**
   * 监听响应队列
   */
  private listenToResponseQueue(): void {
    const { consumer$ } = useQueue<ClaudeResponse>(RESPONSES_QUEUE);

    this.responseSubscription = consumer$.subscribe({
      next: (envelope) => this.handleResponse(envelope),
      error: (err) => {
        this.logger.error(`响应队列错误: ${err.message}`);
        // 尝试重新连接
        setTimeout(() => this.listenToResponseQueue(), 5000);
      },
    });
  }

  /**
   * 处理响应消息
   */
  private handleResponse(envelope: MessageEnvelope<ClaudeResponse>): void {
    const response = envelope.message;
    const { taskId, clientId, sessionId, type, data } = response;

    // 查找客户端 Socket
    const socket = this.clientSockets.get(clientId);
    if (!socket) {
      this.logger.warn(`客户端不存在，丢弃响应: clientId=${clientId}, taskId=${taskId}`);
      envelope.ack();
      return;
    }

    // 构建 WebSocket 响应
    const wsResponse: WsClaudeResponse = {
      taskId,
      sessionId,
      type,
      data,
    };

    // 发送给客户端
    socket.emit('claude:response', wsResponse);

    // 如果是完成或错误，清理活动任务
    if (type === 'complete' || type === 'error') {
      const connection = this.clientConnections.get(clientId);
      if (connection) {
        connection.activeTasks.delete(taskId);
      }
    }

    // 确认消息
    envelope.ack();
    this.logger.debug(`响应已转发: taskId=${taskId}, type=${type}`);
  }
}
