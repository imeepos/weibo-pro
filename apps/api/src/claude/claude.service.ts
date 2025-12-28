/**
 * Claude Service - Claude 消息服务
 *
 * 存在即合理:
 * - 管理客户端连接映射
 * - 通过 WorkerGateway 与 CLI Worker 通信
 * - 将执行端响应路由回正确的客户端
 *
 * 优雅即简约:
 * - 单一职责：消息路由和连接管理
 * - 使用 Socket.IO 直连替代 RabbitMQ
 */

import { Injectable, Inject, createLogger } from '@sker/core';
import type { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { WorkerGateway } from './worker-gateway';
import type {
  ClaudeCommand,
  ClaudeResponse,
  WsClaudeCommand,
  WsClaudeResponse,
  ClientConnection,
} from './types';

@Injectable({ providedIn: 'auto' })
export class ClaudeService {
  private logger = createLogger('ClaudeService');

  /** 客户端 ID → Socket 映射 */
  private clientSockets = new Map<string, Socket>();

  /** Socket ID → 客户端 ID 映射 */
  private socketToClient = new Map<string, string>();

  /** 客户端连接信息 */
  private clientConnections = new Map<string, ClientConnection & { clientType: string }>();

  /** 任务 ID 到 Worker socketId 的映射（用于批准响应路由） */
  private taskToWorker = new Map<string, string>();

  /** 批准请求 ID 到任务 ID 的映射（用于批准响应路由） */
  private requestToTask = new Map<string, string>();

  /** Socket.IO 服务器实例 */
  private io: SocketIOServer | null = null;

  /** 是否已初始化 */
  private initialized = false;

  constructor(@Inject(WorkerGateway) private workerGateway: WorkerGateway) {}

  /**
   * 初始化服务
   */
  initialize(io: SocketIOServer): void {
    if (this.initialized) {
      this.logger.warn('服务已初始化');
      return;
    }

    this.io = io;
    this.workerGateway.initialize(io);
    this.initialized = true;
    this.logger.info('Claude 服务初始化完成');
  }

  /**
   * 关闭服务
   */
  shutdown(): void {
    this.workerGateway.shutdown();
    this.clientSockets.clear();
    this.socketToClient.clear();
    this.clientConnections.clear();
    this.taskToWorker.clear();
    this.requestToTask.clear();
    this.initialized = false;
    this.logger.info('Claude 服务已关闭');
  }

  /**
   * 注册客户端连接
   */
  registerClient(socket: Socket, clientType: string = 'unknown'): string {
    const clientId = uuidv4();

    this.clientSockets.set(clientId, socket);
    this.socketToClient.set(socket.id, clientId);
    this.clientConnections.set(clientId, {
      socketId: socket.id,
      connectedAt: Date.now(),
      activeTasks: new Set(),
      clientType,
    });

    this.logger.info(`客户端已连接: clientId=${clientId}, socketId=${socket.id}, type=${clientType}`);
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

    if (!this.workerGateway.isWorkerConnected()) {
      throw new Error('Worker 未连接');
    }

    const taskId = uuidv4();

    const command: ClaudeCommand = {
      taskId,
      clientId,
      sessionId: wsCommand.sessionId,
      command: wsCommand.command,
      cwd: wsCommand.cwd,
      model: wsCommand.model,
      permissionMode: wsCommand.permissionMode,
      timestamp: Date.now(),
    };

    const connection = this.clientConnections.get(clientId);
    if (connection) {
      connection.activeTasks.add(taskId);
    }

    // 通过 WorkerGateway 发送命令，传递目标 Worker 的 socketId
    const sent = this.workerGateway.sendCommand(command, (response) => {
      this.handleResponse(response);
    }, wsCommand.workerSocketId);

    if (!sent) {
      throw new Error('发送命令失败');
    }

    // 记录任务到 Worker 的映射（用于批准响应路由）
    if (wsCommand.workerSocketId) {
      this.taskToWorker.set(taskId, wsCommand.workerSocketId);
    }

    this.logger.info(`命令已发送: taskId=${taskId}, clientId=${clientId}, workerSocketId=${wsCommand.workerSocketId || 'default'}`);
    return taskId;
  }

  /**
   * 发送批准响应到执行端
   */
  async sendApprovalResponse(clientId: string, data: { requestId: string; approved: boolean }): Promise<void> {
    this.logger.info(`发送批准响应: clientId=${clientId}, requestId=${data.requestId}, approved=${data.approved}`);

    // 通过 requestId 找到 taskId，再找到 workerSocketId
    const taskId = this.requestToTask.get(data.requestId);
    const workerSocketId = taskId ? this.taskToWorker.get(taskId) : undefined;

    if (workerSocketId) {
      this.logger.debug(`找到目标 Worker: requestId=${data.requestId} → taskId=${taskId} → workerSocketId=${workerSocketId}`);
    } else {
      this.logger.warn(`未找到目标 Worker，将发送到默认 Worker: requestId=${data.requestId}`);
    }

    const sent = this.workerGateway.sendApproval(clientId, data, workerSocketId);
    if (!sent) {
      this.logger.error('发送批准响应失败: Worker 未连接');
    }

    // 清理映射
    if (taskId) {
      this.requestToTask.delete(data.requestId);
    }
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
   * 获取所有在线的 CLI 客户端列表
   * 注意：CLI Worker 连接到 /worker 命名空间，使用 getOnlineWorkers() 获取
   */
  getOnlineClients(): Array<{
    clientId: string;
    socketId: string;
    connectedAt: number;
    activeTaskCount: number;
  }> {
    const clients: Array<{
      clientId: string;
      socketId: string;
      connectedAt: number;
      activeTaskCount: number;
    }> = [];

    this.clientConnections.forEach((connection, clientId) => {
      // 只返回 CLI 客户端（虽然实际上 CLI 在 /worker 命名空间）
      if (connection.clientType === 'cli') {
        clients.push({
          clientId,
          socketId: connection.socketId,
          connectedAt: connection.connectedAt,
          activeTaskCount: connection.activeTasks.size,
        });
      }
    });

    return clients.sort((a, b) => b.connectedAt - a.connectedAt);
  }

  /**
   * 获取在线 CLI Worker 列表
   */
  getOnlineWorkers(): Array<{
    socketId: string;
    connectedAt: number;
    name?: string;
    description?: string;
  }> {
    return this.workerGateway.getOnlineWorkers();
  }

  /**
   * 处理响应消息
   */
  private handleResponse(response: ClaudeResponse): void {
    const { taskId, clientId, sessionId, type, data } = response;

    this.logger.debug(`收到响应: taskId=${taskId}, clientId=${clientId}, type=${type}`);

    // 如果是批准请求，记录 requestId 到 taskId 的映射
    if (type === 'approval-request' && data && typeof data === 'object' && 'requestId' in data) {
      const requestId = (data as { requestId: string }).requestId;
      this.requestToTask.set(requestId, taskId);
      this.logger.debug(`记录批准请求映射: requestId=${requestId} → taskId=${taskId}`);
    }

    const socket = this.clientSockets.get(clientId);
    if (!socket) {
      this.logger.warn(`客户端不存在，丢弃响应: clientId=${clientId}, taskId=${taskId}`);
      return;
    }

    const wsResponse: WsClaudeResponse = {
      taskId,
      sessionId,
      type,
      data,
    };

    socket.emit('claude:response', wsResponse);

    if (type === 'complete' || type === 'error') {
      const connection = this.clientConnections.get(clientId);
      if (connection) {
        connection.activeTasks.delete(taskId);
      }
      // 清理映射
      this.taskToWorker.delete(taskId);
    }

    this.logger.debug(`响应已转发: taskId=${taskId}, type=${type}`);
  }
}
