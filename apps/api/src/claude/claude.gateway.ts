/**
 * Claude Gateway - Socket.IO 网关
 *
 * 存在即合理:
 * - 处理 Socket.IO 连接和事件
 * - 将移动端命令路由到 ClaudeService
 * - 管理客户端生命周期
 *
 * 优雅即简约:
 * - 事件驱动的设计
 * - 清晰的事件命名约定
 */

import { Inject, Injectable, createLogger } from '@sker/core';
import type { Server as SocketIOServer, Socket } from 'socket.io';
import { ClaudeService } from './claude.service';
import type { WsClaudeCommand } from './types';

@Injectable({ providedIn: 'auto' })
export class ClaudeGateway {
  private logger = createLogger('ClaudeGateway');
  private io: SocketIOServer | null = null;

  constructor(@Inject(ClaudeService) private claudeService: ClaudeService) {}

  /**
   * 初始化网关
   */
  initialize(io: SocketIOServer): void {
    this.io = io;
    this.claudeService.initialize(io);
    this.setupEventHandlers();
    this.logger.info('Claude Gateway 初始化完成');
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * 处理新连接
   */
  private handleConnection(socket: Socket): void {
    // 注册客户端
    const clientId = this.claudeService.registerClient(socket);

    // 发送客户端 ID
    socket.emit('claude:connected', { clientId });

    this.logger.info(`新连接: clientId=${clientId}, socketId=${socket.id}`);

    // 监听命令事件
    socket.on('claude:command', async (data: WsClaudeCommand) => {
      await this.handleCommand(socket, clientId, data);
    });

    // 监听中断事件
    socket.on('claude:abort', async (data: { taskId: string }) => {
      await this.handleAbort(socket, clientId, data.taskId);
    });

    // 监听批准响应
    socket.on('claude:approval', async (data: { requestId: string; approved: boolean }) => {
      await this.handleApproval(socket, clientId, data);
    });

    // 监听断开连接
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });

    // 监听错误
    socket.on('error', (error: Error) => {
      this.logger.error(`Socket 错误: ${error.message}`);
    });
  }

  /**
   * 处理命令
   */
  private async handleCommand(
    socket: Socket,
    clientId: string,
    data: WsClaudeCommand
  ): Promise<void> {
    try {
      this.logger.info(`收到命令: clientId=${clientId}, command=${data.command.substring(0, 50)}...`);

      // 发送命令到执行端
      const taskId = await this.claudeService.sendCommand(clientId, data);

      // 通知客户端任务已创建
      socket.emit('claude:task-created', { taskId });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`命令处理失败: ${errorMessage}`);

      socket.emit('claude:error', {
        type: 'error',
        data: {
          message: errorMessage,
          code: 'COMMAND_ERROR',
        },
      });
    }
  }

  /**
   * 处理中断请求
   */
  private async handleAbort(
    socket: Socket,
    clientId: string,
    taskId: string
  ): Promise<void> {
    this.logger.info(`中断请求: clientId=${clientId}, taskId=${taskId}`);

    // TODO: 实现中断逻辑（需要通过 RabbitMQ 发送中断命令）
    socket.emit('claude:abort-ack', { taskId, success: true });
  }

  /**
   * 处理批准响应
   */
  private async handleApproval(
    socket: Socket,
    clientId: string,
    data: { requestId: string; approved: boolean }
  ): Promise<void> {
    this.logger.info(`批准响应: clientId=${clientId}, requestId=${data.requestId}, approved=${data.approved}`);

    // 转发批准响应到 ClaudeService
    await this.claudeService.sendApprovalResponse(clientId, data);
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(socket: Socket): void {
    this.claudeService.unregisterClient(socket);
    this.logger.info(`连接断开: socketId=${socket.id}`);
  }

  /**
   * 获取统计信息
   */
  getStats(): { activeClients: number } {
    return {
      activeClients: this.claudeService.getActiveClientCount(),
    };
  }

  /**
   * 获取在线客户端列表
   */
  getOnlineClients(): Array<{
    clientId: string;
    socketId: string;
    connectedAt: number;
    activeTaskCount: number;
  }> {
    return this.claudeService.getOnlineClients();
  }
}
