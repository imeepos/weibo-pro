/**
 * Worker Gateway - CLI Worker Socket.IO 连接管理
 *
 * 存在即合理:
 * - 管理 CLI Worker 的 Socket.IO 连接
 * - 将命令路由到 Worker，将响应路由回客户端
 * - 替代 RabbitMQ 实现直连通信
 */

import { Injectable, createLogger } from '@sker/core';
import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { ClaudeCommand, ClaudeResponse } from './types';

/** Worker 连接信息 */
interface WorkerConnection {
  socket: Socket;
  connectedAt: number;
  cliConfig?: {
    id: string;
    name: string;
    description: string;
  };
}

@Injectable({ providedIn: 'auto' })
export class WorkerGateway {
  private logger = createLogger('WorkerGateway');
  private io: SocketIOServer | null = null;

  /** Worker Socket 连接映射: socketId → WorkerConnection */
  private workerConnections = new Map<string, WorkerConnection>();

  /** 响应回调映射: taskId → callback */
  private responseCallbacks = new Map<string, (response: ClaudeResponse) => void>();

  /** 批准响应回调映射: clientId → callback */
  private approvalCallbacks = new Map<string, (data: { requestId: string; approved: boolean }) => void>();

  /**
   * 初始化 Worker Gateway
   */
  initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupWorkerNamespace();
    this.logger.info('Worker Gateway 初始化完成');
  }

  /**
   * 设置 Worker 命名空间
   */
  private setupWorkerNamespace(): void {
    if (!this.io) return;

    const workerNs = this.io.of('/worker');

    workerNs.on('connection', (socket: Socket) => {
      const cliConfig = socket.handshake.auth?.cliConfig;
      this.logger.info(`Worker 已连接: socketId=${socket.id}, name=${cliConfig?.name || 'unknown'}`);

      this.workerConnections.set(socket.id, {
        socket,
        connectedAt: Date.now(),
        cliConfig,
      });

      // 监听 Worker 响应
      socket.on('worker:response', (response: ClaudeResponse) => {
        this.handleWorkerResponse(response);
      });

      // 监听断开连接
      socket.on('disconnect', () => {
        this.logger.info(`Worker 已断开: socketId=${socket.id}`);
        this.workerConnections.delete(socket.id);
      });

      // 发送连接确认
      socket.emit('worker:connected', { timestamp: Date.now() });
    });
  }

  /**
   * 发送命令到 Worker（发送到第一个可用的 Worker）
   */
  sendCommand(command: ClaudeCommand, onResponse: (response: ClaudeResponse) => void): boolean {
    const worker = Array.from(this.workerConnections.values())[0];
    if (!worker) {
      this.logger.error('没有可用的 Worker 连接');
      return false;
    }

    // 注册响应回调
    this.responseCallbacks.set(command.taskId, onResponse);

    // 发送命令
    worker.socket.emit('worker:command', command);
    this.logger.info(`命令已发送到 Worker: taskId=${command.taskId}`);

    return true;
  }

  /**
   * 发送批准响应到 Worker（发送到第一个可用的 Worker）
   */
  sendApproval(clientId: string, data: { requestId: string; approved: boolean }): boolean {
    const worker = Array.from(this.workerConnections.values())[0];
    if (!worker) {
      this.logger.error('没有可用的 Worker 连接');
      return false;
    }

    worker.socket.emit('worker:approval', { clientId, ...data });
    this.logger.info(`批准响应已发送: requestId=${data.requestId}, approved=${data.approved}`);

    return true;
  }

  /**
   * 处理 Worker 响应
   */
  private handleWorkerResponse(response: ClaudeResponse): void {
    const { taskId, type } = response;
    this.logger.debug(`收到 Worker 响应: taskId=${taskId}, type=${type}`);

    const callback = this.responseCallbacks.get(taskId);
    if (callback) {
      callback(response);

      // 完成或错误时清理回调
      if (type === 'complete' || type === 'error') {
        this.responseCallbacks.delete(taskId);
      }
    } else {
      this.logger.warn(`未找到响应回调: taskId=${taskId}`);
    }
  }

  /**
   * 检查 Worker 是否已连接
   */
  isWorkerConnected(): boolean {
    return this.workerConnections.size > 0;
  }

  /**
   * 获取在线 Worker 列表
   */
  getOnlineWorkers(): Array<{
    socketId: string;
    connectedAt: number;
    name?: string;
    description?: string;
  }> {
    return Array.from(this.workerConnections.entries()).map(([socketId, connection]) => ({
      socketId,
      connectedAt: connection.connectedAt,
      name: connection.cliConfig?.name,
      description: connection.cliConfig?.description,
    }));
  }

  /**
   * 关闭网关
   */
  shutdown(): void {
    this.responseCallbacks.clear();
    this.approvalCallbacks.clear();
    this.workerConnections.forEach(connection => {
      connection.socket.disconnect();
    });
    this.workerConnections.clear();
    this.logger.info('Worker Gateway 已关闭');
  }
}
