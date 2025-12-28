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
    return {
      success: true,
      data: this.claudeGateway.getOnlineClients(),
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
