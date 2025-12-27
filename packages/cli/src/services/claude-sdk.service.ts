/**
 * Claude SDK Service - Claude 代码助手 SDK 服务
 *
 * 存在即合理:
 * - 封装 @anthropic-ai/claude-code SDK 的复杂性
 * - 提供会话管理和中断能力
 * - 将 SDK 消息转换为 RabbitMQ 消息格式
 *
 * 优雅即简约:
 * - 单一职责：只负责 SDK 交互
 * - 清晰的输入输出：ClaudeCommand → ClaudeResponse
 * - 可测试的设计
 */

import { Injectable } from '@sker/core';
// @ts-expect-error - @anthropic-ai/claude-code types may not be available
import { query } from '@anthropic-ai/claude-code';
import type {
  ClaudeCommand,
  ClaudeResponse,
  ClaudeResponseType,
  ClaudeSdkOptions,
  ActiveSession,
  ModelUsage,
} from '../types/index.js';

/**
 * 响应发送回调类型
 */
export type ResponseSender = (response: ClaudeResponse) => void;

@Injectable({ providedIn: 'auto' })
export class ClaudeSdkService {
  /** 活动会话映射 */
  private activeSessions = new Map<string, ActiveSession>();

  /**
   * 执行 Claude 查询
   *
   * @param command - Claude 命令
   * @param sendResponse - 响应发送回调
   */
  async executeQuery(
    command: ClaudeCommand,
    sendResponse: ResponseSender
  ): Promise<void> {
    const { taskId, clientId, sessionId } = command;
    let capturedSessionId = sessionId;

    try {
      // 映射 CLI 选项到 SDK 格式
      const sdkOptions = this.mapCommandToSdkOptions(command);

      console.log(`[ClaudeSdkService] 开始执行查询: taskId=${taskId}, model=${sdkOptions.model}`);

      // 创建 SDK 查询实例
      const queryInstance = query({
        prompt: command.command,
        options: sdkOptions,
      });

      // 如果有会话 ID，追踪会话
      if (capturedSessionId) {
        this.addSession(capturedSessionId, queryInstance, taskId, clientId);
      }

      // 处理流式消息
      for await (const message of queryInstance) {
        const sdkMessage = message as Record<string, unknown>;

        // 捕获会话 ID
        if (sdkMessage.session_id && !capturedSessionId) {
          capturedSessionId = sdkMessage.session_id as string;
          this.addSession(capturedSessionId, queryInstance, taskId, clientId);

          // 发送会话创建事件
          if (!sessionId) {
            sendResponse({
              taskId,
              clientId,
              sessionId: capturedSessionId,
              type: 'session-created',
              data: { sessionId: capturedSessionId },
              timestamp: Date.now(),
            });
          }
        }

        // 发送消息
        sendResponse({
          taskId,
          clientId,
          sessionId: capturedSessionId || '',
          type: 'message',
          data: sdkMessage,
          timestamp: Date.now(),
        });

        // 提取并发送 Token 预算
        if (sdkMessage.type === 'result') {
          const tokenBudget = this.extractTokenBudget(sdkMessage);
          if (tokenBudget) {
            sendResponse({
              taskId,
              clientId,
              sessionId: capturedSessionId || '',
              type: 'token-budget',
              data: tokenBudget,
              timestamp: Date.now(),
            });
          }
        }
      }

      // 清理会话
      if (capturedSessionId) {
        this.removeSession(capturedSessionId);
      }

      // 发送完成事件
      sendResponse({
        taskId,
        clientId,
        sessionId: capturedSessionId || '',
        type: 'complete',
        data: {
          exitCode: 0,
          isNewSession: !sessionId && !!command.command,
        },
        timestamp: Date.now(),
      });

      console.log(`[ClaudeSdkService] 查询完成: taskId=${taskId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 清理会话
      if (capturedSessionId) {
        this.removeSession(capturedSessionId);
      }

      console.error(`[ClaudeSdkService] 查询失败: taskId=${taskId}, error=${errorMessage}`);

      // 发送错误事件
      sendResponse({
        taskId,
        clientId,
        sessionId: capturedSessionId || '',
        type: 'error',
        data: {
          message: errorMessage,
          code: 'QUERY_ERROR',
          stack: error instanceof Error ? error.stack : undefined,
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 中断会话
   *
   * @param sessionId - 会话 ID
   * @returns 是否成功中断
   */
  async abortSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      console.log(`[ClaudeSdkService] 会话不存在: ${sessionId}`);
      return false;
    }

    try {
      console.log(`[ClaudeSdkService] 中断会话: ${sessionId}`);

      // 调用 SDK 的 interrupt 方法
      const queryInstance = session.instance as { interrupt?: () => Promise<void> };
      if (queryInstance.interrupt) {
        await queryInstance.interrupt();
      }

      // 更新会话状态
      session.status = 'aborted';
      this.removeSession(sessionId);

      return true;
    } catch (error) {
      console.error(`[ClaudeSdkService] 中断会话失败: ${sessionId}`, error);
      return false;
    }
  }

  /**
   * 检查会话是否活动
   *
   * @param sessionId - 会话 ID
   */
  isSessionActive(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    return session !== undefined && session.status === 'active';
  }

  /**
   * 获取所有活动会话 ID
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * 映射命令到 SDK 选项
   */
  private mapCommandToSdkOptions(command: ClaudeCommand): ClaudeSdkOptions {
    const options: ClaudeSdkOptions = {};

    // 工作目录
    if (command.cwd) {
      options.cwd = command.cwd;
    }

    // 权限模式
    if (command.permissionMode && command.permissionMode !== 'default') {
      options.permissionMode = command.permissionMode;
    }

    // 模型
    options.model = command.model || 'sonnet';
    console.log(`[ClaudeSdkService] 使用模型: ${options.model}`);

    // 系统提示配置
    options.systemPrompt = {
      type: 'preset',
      preset: 'claude_code',
    };

    // 设置来源
    options.settingSources = ['project', 'user', 'local'];

    // 恢复会话
    if (command.sessionId) {
      options.resume = command.sessionId;
    }

    return options;
  }

  /**
   * 提取 Token 预算信息
   */
  private extractTokenBudget(resultMessage: Record<string, unknown>): { used: number; total: number } | null {
    if (resultMessage.type !== 'result' || !resultMessage.modelUsage) {
      return null;
    }

    const modelUsage = resultMessage.modelUsage as Record<string, ModelUsage>;
    const modelKeys = Object.keys(modelUsage);
    if (modelKeys.length === 0) {
      return null;
    }
    const modelKey = modelKeys[0]!;
    const modelData = modelUsage[modelKey];

    if (!modelData) {
      return null;
    }

    // 使用累计 Token 数
    const inputTokens = modelData.cumulativeInputTokens || modelData.inputTokens || 0;
    const outputTokens = modelData.cumulativeOutputTokens || modelData.outputTokens || 0;
    const cacheReadTokens = modelData.cumulativeCacheReadInputTokens || modelData.cacheReadInputTokens || 0;
    const cacheCreationTokens = modelData.cumulativeCacheCreationInputTokens || modelData.cacheCreationInputTokens || 0;

    const totalUsed = inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens;
    const contextWindow = parseInt(process.env.CONTEXT_WINDOW || '160000', 10);

    console.log(`[ClaudeSdkService] Token 使用: input=${inputTokens}, output=${outputTokens}, cache=${cacheReadTokens + cacheCreationTokens}, total=${totalUsed}/${contextWindow}`);

    return {
      used: totalUsed,
      total: contextWindow,
    };
  }

  /**
   * 添加会话
   */
  private addSession(
    sessionId: string,
    instance: AsyncIterable<unknown>,
    taskId: string,
    clientId: string
  ): void {
    this.activeSessions.set(sessionId, {
      instance,
      startTime: Date.now(),
      status: 'active',
      taskId,
      clientId,
    });
  }

  /**
   * 移除会话
   */
  private removeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }
}
