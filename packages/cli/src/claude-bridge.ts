/**
 * Claude Bridge - Socket.IO 客户端桥接器
 *
 * 存在即合理:
 * - 连接 API 服务器的 Socket.IO
 * - 接收命令并调用 Claude SDK
 * - 将响应发送回 API 服务器
 *
 * 优雅即简约:
 * - 单一职责：消息路由
 * - 解耦：SDK 逻辑在 ClaudeSdkService 中
 * - 直连：替代 RabbitMQ 减少延迟
 */

import { Injectable, Inject } from '@sker/core';
import { io, Socket } from 'socket.io-client';
import { CLI_CONFIG, type CliConfig } from './tokens.js';
import { ClaudeSdkService } from './services/claude-sdk.service.js';
import type { ClaudeCommand, ClaudeResponse } from './types/index.js';

@Injectable({ providedIn: 'auto' })
export class ClaudeBridge {
  private socket: Socket | null = null;
  private isRunning = false;

  constructor(
    @Inject(CLI_CONFIG) private config: CliConfig,
    private claudeSdkService: ClaudeSdkService
  ) {}

  /**
   * 启动桥接器
   */
  start(): void {
    if (this.isRunning) {
      console.log('[ClaudeBridge] 已在运行中');
      return;
    }

    this.connect();
    this.isRunning = true;
    console.log('[ClaudeBridge] 启动完成');
  }

  /**
   * 连接到 API 服务器
   */
  private connect(): void {
    const serverUrl = this.config.apiServer || 'http://localhost:3000';

    console.log(`[ClaudeBridge] 连接到 API 服务器: ${serverUrl}/worker`);

    this.socket = io(`${serverUrl}/worker`, {
      path: '/ws',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[ClaudeBridge] 已连接到 API 服务器');
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[ClaudeBridge] 断开连接: ${reason}`);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[ClaudeBridge] 连接错误:', error.message);
    });

    this.socket.on('worker:connected', (data) => {
      console.log('[ClaudeBridge] Worker 连接确认:', data);
    });

    // 监听命令
    this.socket.on('worker:command', (command: ClaudeCommand) => {
      this.handleCommand(command);
    });

    // 监听批准响应
    this.socket.on('worker:approval', (data: { clientId: string; requestId: string; approved: boolean }) => {
      this.handleApproval(data);
    });
  }

  /**
   * 处理命令
   */
  private async handleCommand(command: ClaudeCommand): Promise<void> {
    console.log(`[ClaudeBridge] 收到命令: taskId=${command.taskId}, clientId=${command.clientId}`);

    try {
      await this.claudeSdkService.executeQuery(command, (response) => {
        this.sendResponse(response);
      });

      console.log(`[ClaudeBridge] 命令处理完成: taskId=${command.taskId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ClaudeBridge] 命令处理失败: taskId=${command.taskId}, error=${errorMessage}`);

      this.sendResponse({
        taskId: command.taskId,
        clientId: command.clientId,
        sessionId: command.sessionId || '',
        type: 'error',
        data: {
          message: errorMessage,
          code: 'COMMAND_HANDLER_ERROR',
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 处理批准响应
   */
  private handleApproval(data: { clientId: string; requestId: string; approved: boolean }): void {
    const { requestId, approved } = data;
    console.log(`[ClaudeBridge] 收到批准响应: requestId=${requestId}, approved=${approved}`);

    try {
      this.claudeSdkService.handleApprovalResponse(requestId, approved);
      console.log('[ClaudeBridge] 批准响应处理成功');
    } catch (error) {
      console.error('[ClaudeBridge] 批准响应处理失败:', error);
    }
  }

  /**
   * 发送响应到 API 服务器
   */
  private sendResponse(response: ClaudeResponse): void {
    if (!this.socket?.connected) {
      console.error('[ClaudeBridge] 未连接，无法发送响应');
      return;
    }

    console.log(`[ClaudeBridge] 发送响应: taskId=${response.taskId}, type=${response.type}`);
    this.socket.emit('worker:response', response);
  }

  /**
   * 关闭桥接器
   */
  async shutdown(): Promise<void> {
    console.log('[ClaudeBridge] 正在关闭...');

    // 中断所有活动会话
    const activeSessions = this.claudeSdkService.getActiveSessions();
    for (const sessionId of activeSessions) {
      await this.claudeSdkService.abortSession(sessionId);
    }

    // 断开 Socket 连接
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isRunning = false;
    console.log('[ClaudeBridge] 关闭完成');
  }
}
