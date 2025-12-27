/**
 * Claude Bridge - RabbitMQ 消息桥接器
 *
 * 存在即合理:
 * - 连接 RabbitMQ 和 Claude SDK
 * - 消费 claude.commands 队列
 * - 将响应发送到 claude.responses 队列
 *
 * 优雅即简约:
 * - 单一职责：消息路由
 * - 解耦：SDK 逻辑在 ClaudeSdkService 中
 * - 可靠：支持消息确认和错误处理
 */

import { Injectable, Inject } from '@sker/core';
import { useQueue, type MessageEnvelope } from '@sker/mq';
import { Subscription } from 'rxjs';
import { CLI_CONFIG, type CliConfig } from './tokens.js';
import { ClaudeSdkService } from './services/claude-sdk.service.js';
import type { ClaudeCommand, ClaudeResponse } from './types/index.js';

/** 命令队列名称 */
const COMMANDS_QUEUE = 'claude.commands';
/** 响应队列名称 */
const RESPONSES_QUEUE = 'claude.responses';

@Injectable({ providedIn: 'auto' })
export class ClaudeBridge {
  private subscriptions: Subscription[] = [];
  private responseQueue = useQueue<ClaudeResponse>(RESPONSES_QUEUE);
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

    this.listenToCommandQueue();
    this.isRunning = true;
    console.log('[ClaudeBridge] 启动完成，监听队列:', COMMANDS_QUEUE);
  }

  /**
   * 关闭桥接器
   */
  async shutdown(): Promise<void> {
    console.log('[ClaudeBridge] 正在关闭...');

    // 取消所有订阅
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // 中断所有活动会话
    const activeSessions = this.claudeSdkService.getActiveSessions();
    for (const sessionId of activeSessions) {
      await this.claudeSdkService.abortSession(sessionId);
    }

    this.isRunning = false;
    console.log('[ClaudeBridge] 关闭完成');
  }

  /**
   * 监听命令队列
   */
  private listenToCommandQueue(): void {
    const { consumer$ } = useQueue<ClaudeCommand>(COMMANDS_QUEUE);

    const sub = consumer$.subscribe({
      next: (envelope) => this.handleCommand(envelope),
      error: (err) => {
        console.error('[ClaudeBridge] 命令队列错误:', err.message);
        // 尝试重新连接
        setTimeout(() => this.listenToCommandQueue(), 5000);
      },
    });

    this.subscriptions.push(sub);
  }

  /**
   * 处理命令
   */
  private async handleCommand(envelope: MessageEnvelope<ClaudeCommand>): Promise<void> {
    const command = envelope.message;
    console.log(`[ClaudeBridge] 收到命令: taskId=${command.taskId}, clientId=${command.clientId}`);

    try {
      // 执行 Claude 查询
      await this.claudeSdkService.executeQuery(command, (response) => {
        this.sendResponse(response);
      });

      // 确认消息处理成功
      envelope.ack();
      console.log(`[ClaudeBridge] 命令处理完成: taskId=${command.taskId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ClaudeBridge] 命令处理失败: taskId=${command.taskId}, error=${errorMessage}`);

      // 发送错误响应
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

      // 不重新入队（避免无限循环）
      envelope.nack(false);
    }
  }

  /**
   * 发送响应到响应队列
   */
  private sendResponse(response: ClaudeResponse): void {
    try {
      this.responseQueue.producer.next(response);
    } catch (error) {
      console.error('[ClaudeBridge] 发送响应失败:', error);
    }
  }
}
