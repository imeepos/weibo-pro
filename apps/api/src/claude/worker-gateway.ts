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
}

@Injectable({ providedIn: 'auto' })
export class WorkerGateway {
  private logger = createLogger('WorkerGateway');
  private io: SocketIOServer | null = null;

  /** Worker Socket 连接 */
  private workerSocket: Socket | null = null;

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
      this.logger.info(`Worker 已连接: socketId=${socket.id}`);

      // 只允许一个 Worker 连接
      if (this.workerSocket) {
        this.logger.warn('已有 Worker 连接，断开旧连接');
        this.workerSocket.disconnect();
      }

      this.workerSocket = socket;

      // 监听 Worker 响应
      socket.on('worker:response', (response: ClaudeResponse) => {
        this.handleWorkerResponse(response);
      });

      // 监听断开连接
      socket.on('disconnect', () => {
        this.logger.info(`Worker 已断开: socketId=${socket.id}`);
        if (this.workerSocket?.id === socket.id) {
          this.workerSocket = null;
        }
      });

      // 发送连接确认
      socket.emit('worker:connected', { timestamp: Date.now() });
    });
  }

  /**
   * 发送命令到 Worker
   */
  sendCommand(command: ClaudeCommand, onResponse: (response: ClaudeResponse) => void): boolean {
    if (!this.workerSocket) {
      this.logger.error('没有可用的 Worker 连接');
      return false;
    }

    // 注册响应回调
    this.responseCallbacks.set(command.taskId, onResponse);

    // 发送命令
    this.workerSocket.emit('worker:command', command);
    this.logger.info(`命令已发送到 Worker: taskId=${command.taskId}`);

    return true;
  }

  /**
   * 发送批准响应到 Worker
   */
  sendApproval(clientId: string, data: { requestId: string; approved: boolean }): boolean {
    if (!this.workerSocket) {
      this.logger.error('没有可用的 Worker 连接');
      return false;
    }

    this.workerSocket.emit('worker:approval', { clientId, ...data });
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
    return this.workerSocket !== null && this.workerSocket.connected;
  }

  /**
   * 关闭网关
   */
  shutdown(): void {
    this.responseCallbacks.clear();
    this.approvalCallbacks.clear();
    if (this.workerSocket) {
      this.workerSocket.disconnect();
      this.workerSocket = null;
    }
    this.logger.info('Worker Gateway 已关闭');
  }
}
