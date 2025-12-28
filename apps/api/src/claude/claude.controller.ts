/**
 * Claude Controller - RESTful API 端点
 */

import { Controller, Inject } from '@sker/core';
import * as sdk from '@sker/sdk';
import { ClaudeGateway } from './claude.gateway';

@Controller(sdk.ClaudeController)
export class ClaudeController implements sdk.ClaudeController {
  constructor(@Inject(ClaudeGateway) private claudeGateway: ClaudeGateway) {}

  /**
   * 获取所有在线的 CLI 客户端
   * GET /api/claude/clients
   */
  async getOnlineClients() {
    // CLI Worker 连接到 /worker 命名空间
    const workers = this.claudeGateway.getOnlineWorkers();

    // 转换为客户端格式（Worker 没有 clientId 和 activeTaskCount）
    return {
      success: true,
      data: workers.map(worker => ({
        clientId: worker.socketId, // 使用 socketId 作为 clientId
        socketId: worker.socketId,
        connectedAt: worker.connectedAt,
        activeTaskCount: 0, // Worker 不跟踪任务数
        name: worker.name || '',
        description: worker.description || '',
      })),
    };
  }

  /**
   * 获取统计信息
   * GET /api/claude/stats
   */
  async getStats() {
    return {
      success: true,
      data: this.claudeGateway.getStats(),
    };
  }
}
