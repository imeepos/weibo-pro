/**
 * Claude SDK Approval Manager - 批准请求管理
 *
 * 职责：
 * - 管理待处理的批准请求（pendingApprovals）
 * - 处理前端批准/拒绝响应
 * - 生成 canUseTool 权限处理器
 */

import type { PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import type {
  ClaudeCommand,
  ClaudeResponse,
  ApprovalRequestData,
} from '../types/index.js';

export type ApprovalSender = (response: ClaudeResponse) => void;

/**
 * 批准请求管理器
 */
export class ApprovalManager {
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
   * 创建 canUseTool 权限处理器
   */
  createPermissionHandler(sendResponse: ApprovalSender, command: ClaudeCommand) {
    return async (toolName: string, input: Record<string, unknown>, opts: { decisionReason?: string }): Promise<PermissionResult> => {
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
  }
}
