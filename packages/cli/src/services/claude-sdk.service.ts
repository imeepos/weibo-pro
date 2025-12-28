/**
 * Claude SDK Service - Claude 代码助手 SDK 服务
 *
 * 存在即合理:
 * - 封装 @anthropic-ai/claude-agent-sdk 的复杂性
 * - 提供会话管理和中断能力
 * - 将 SDK 消息转换为 RabbitMQ 消息格式
 *
 * 优雅即简约:
 * - 单一职责：只负责 SDK 交互
 * - 清晰的输入输出：ClaudeCommand → ClaudeResponse
 * - 可测试的设计
 */

import { Injectable } from '@sker/core';
import { query, type Options as SdkOptions, type PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import type {
  ClaudeCommand,
  ClaudeResponse,
  ClaudeResponseType,
  ActiveSession,
  ModelUsage,
  TokenBudgetData,
  ApprovalRequestData,
} from '../types/index.js';

export type ResponseSender = (response: ClaudeResponse) => void;

@Injectable({ providedIn: 'auto' })
export class ClaudeSdkService {
  /** 活动会话映射 */
  private activeSessions = new Map<string, ActiveSession>();

  /** 待处理的批准请求 */
  private pendingApprovals = new Map<string, {
    resolve: (result: PermissionResult) => void;
    reject: (error: Error) => void;
  }>();

  /**
   * 处理批准响应
   */
  handleApprovalResponse(requestId: string, approved: boolean): void {
    const startTime = Date.now();
    console.log(`[ClaudeSdkService] 📥 收到批准响应: requestId=${requestId}, approved=${approved}, timestamp=${startTime}`);

    const pending = this.pendingApprovals.get(requestId);
    if (!pending) {
      console.warn(`[ClaudeSdkService] ⚠️ 未找到批准请求: ${requestId}`);
      console.warn(`[ClaudeSdkService] 当前待处理请求:`, Array.from(this.pendingApprovals.keys()));
      return;
    }

    this.pendingApprovals.delete(requestId);

    if (approved) {
      console.log(`[ClaudeSdkService] ✅ 用户批准了操作，准备 resolve Promise`);
      const result = { behavior: 'allow' as const, updatedInput: {} };
      pending.resolve(result);
      console.log(`[ClaudeSdkService] ✅ Promise 已 resolve，耗时: ${Date.now() - startTime}ms`);
    } else {
      console.log(`[ClaudeSdkService] ❌ 用户拒绝了操作`);
      pending.resolve({ behavior: 'deny', message: '用户拒绝了此操作' });
    }
  }

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
      console.log(`[ClaudeSdkService] 开始执行: taskId=${taskId}, command=${command.command}`);

      const sdkOptions = this.mapCommandToSdkOptions(command, sendResponse);
      console.log(`[ClaudeSdkService] SDK选项:`, JSON.stringify(sdkOptions, null, 2));

      console.log(`[ClaudeSdkService] 调用 query()...`);
      const queryInstance = query({
        prompt: command.command,
        options: sdkOptions
      });
      console.log(`[ClaudeSdkService] query() 返回成功，开始遍历消息...`);

      let messageCount = 0;
      for await (const message of queryInstance) {
        messageCount++;
        const msgType = (message as any).type;
        console.log(`[ClaudeSdkService] 收到消息 #${messageCount}: type=${msgType}`, JSON.stringify(message).substring(0, 300));

        if (message.session_id && !capturedSessionId) {
          capturedSessionId = message.session_id;
          this.addSession(capturedSessionId, queryInstance, taskId, clientId);

          sendResponse({
            taskId,
            clientId,
            sessionId: capturedSessionId,
            type: 'session-created',
            data: { sessionId: capturedSessionId },
            timestamp: Date.now(),
          });
        }

        if (capturedSessionId && !this.activeSessions.has(capturedSessionId)) {
          this.addSession(capturedSessionId, queryInstance, taskId, clientId);
        }

        // 检查是否是工具执行请求
        if (msgType === 'tool_use') {
          console.log(`[ClaudeSdkService] 🔧 检测到工具执行请求:`, JSON.stringify(message));
          sendResponse({
            taskId,
            clientId,
            sessionId: capturedSessionId || `session-${taskId}`,
            type: 'tool-use',
            data: message as any,
            timestamp: Date.now(),
          });
        } else {
          // 其他消息类型
          sendResponse({
            taskId,
            clientId,
            sessionId: capturedSessionId || `session-${taskId}`,
            type: 'message',
            data: message as any,
            timestamp: Date.now(),
          });
        }

        if (message.type === 'result') {
          const tokenBudget = this.extractTokenBudget(message as Record<string, unknown>);
          if (tokenBudget) {
            sendResponse({
              taskId,
              clientId,
              sessionId: capturedSessionId || `session-${taskId}`,
              type: 'token-budget',
              data: tokenBudget,
              timestamp: Date.now(),
            });
          }
        }
      }

      if (capturedSessionId) {
        this.removeSession(capturedSessionId);
      }

      sendResponse({
        taskId,
        clientId,
        sessionId: capturedSessionId || `session-${taskId}`,
        type: 'complete',
        data: { exitCode: 0, isNewSession: !sessionId },
        timestamp: Date.now(),
      });

      console.log(`[ClaudeSdkService] 完成: taskId=${taskId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ClaudeSdkService] 失败: taskId=${taskId}, error=${errorMessage}`);

      if (capturedSessionId) {
        this.removeSession(capturedSessionId);
      }

      try {
        sendResponse({
          taskId,
          clientId,
          sessionId: capturedSessionId || `session-${taskId}`,
          type: 'error',
          data: {
            message: errorMessage,
            code: 'QUERY_ERROR',
          },
          timestamp: Date.now(),
        });
      } catch (sendError) {
        // 发送响应失败也不应该中断 CLI
        console.error(`[ClaudeSdkService] 发送错误响应失败:`, sendError);
      }

      // 不再抛出错误，避免中断 CLI 执行
      console.error(`[ClaudeSdkService] 错误已记录，继续运行`);
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

      await session.instance.interrupt();
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
  private mapCommandToSdkOptions(command: ClaudeCommand, sendResponse: ResponseSender): SdkOptions {
    const options: SdkOptions = {};

    if (command.cwd) {
      options.cwd = command.cwd;
    }

    // 设置权限模式：default 需要批准，其他模式直接传递
    if (command.permissionMode) {
      options.permissionMode = command.permissionMode;
    } else {
      // 默认使用 bypassPermissions 模式（不需要批准）
      options.permissionMode = 'bypassPermissions';
    }

    console.log(`[ClaudeSdkService] 权限模式: ${options.permissionMode}`);

    options.model = command.model || 'sonnet';
    console.log(`[ClaudeSdkService] 使用模型: ${options.model}`);

    options.systemPrompt = {
      type: 'preset',
      preset: 'claude_code',
    };

    options.settingSources = ['project', 'user', 'local'];

    if (command.sessionId) {
      options.resume = command.sessionId;
    }

    // 添加权限处理回调
    options.canUseTool = async (toolName, input, opts) => {
      const requestId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const requestStartTime = Date.now();

      console.log(`[ClaudeSdkService] ⚠️ 权限请求触发: toolName=${toolName}, requestId=${requestId}, timestamp=${requestStartTime}`);
      console.log(`[ClaudeSdkService] 工具输入:`, JSON.stringify(input).substring(0, 200));
      console.log(`[ClaudeSdkService] 决策原因: ${opts.decisionReason || '无'}`);

      // 发送批准请求到前端
      const approvalData: ApprovalRequestData = {
        requestId,
        description: opts.decisionReason || `需要执行工具: ${toolName}`,
        toolName,
        riskLevel: 'medium',
      };

      console.log(`[ClaudeSdkService] 📤 发送批准请求到前端:`, approvalData);

      sendResponse({
        taskId: command.taskId,
        clientId: command.clientId,
        sessionId: command.sessionId || `session-${command.taskId}`,
        type: 'approval-request',
        data: approvalData,
        timestamp: Date.now(),
      });

      console.log(`[ClaudeSdkService] ⏳ 等待用户批准响应...`);
      console.log(`[ClaudeSdkService] 当前待处理请求数: ${this.pendingApprovals.size + 1}`);

      // 等待用户响应
      return new Promise<PermissionResult>((resolve, reject) => {
        this.pendingApprovals.set(requestId, { resolve, reject });
        console.log(`[ClaudeSdkService] Promise 已创建并存储: ${requestId}`);

        // 30秒超时
        const timeoutId = setTimeout(() => {
          if (this.pendingApprovals.has(requestId)) {
            console.error(`[ClaudeSdkService] ⏰ 批准请求超时: ${requestId}, 等待时间: ${Date.now() - requestStartTime}ms`);
            console.error(`[ClaudeSdkService] 超时时待处理请求:`, Array.from(this.pendingApprovals.keys()));
            this.pendingApprovals.delete(requestId);
            reject(new Error(`批准请求超时: ${requestId}`));
          }
        }, 30000);

        // 包装 resolve 以清理 timeout
        const originalResolve = resolve;
        const wrappedResolve = (result: PermissionResult) => {
          clearTimeout(timeoutId);
          const totalTime = Date.now() - requestStartTime;
          console.log(`[ClaudeSdkService] ✅ Promise resolve 被调用，总耗时: ${totalTime}ms`);
          originalResolve(result);
        };

        // 更新存储的 resolve
        this.pendingApprovals.set(requestId, { resolve: wrappedResolve, reject });
      });
    };

    return options;
  }

  /**
   * 提取 Token 预算信息
   */
  private extractTokenBudget(resultMessage: Record<string, unknown>): TokenBudgetData | null {
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

    const input = modelData.cumulativeInputTokens || modelData.inputTokens || 0;
    const output = modelData.cumulativeOutputTokens || modelData.outputTokens || 0;
    const cacheRead = modelData.cumulativeCacheReadInputTokens || modelData.cacheReadInputTokens || 0;
    const cacheCreation = modelData.cumulativeCacheCreationInputTokens || modelData.cacheCreationInputTokens || 0;

    const used = input + output + cacheRead + cacheCreation;
    const total = parseInt(process.env.CONTEXT_WINDOW || '160000', 10);

    console.log(`[ClaudeSdkService] Token 使用: input=${input}, output=${output}, cache=${cacheRead + cacheCreation}, total=${used}/${total}`);

    return { used, total, input, output, cacheRead, cacheCreation };
  }

  /**
   * 添加会话
   */
  private addSession(
    sessionId: string,
    instance: AsyncIterable<unknown> & { interrupt: () => Promise<void> },
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
