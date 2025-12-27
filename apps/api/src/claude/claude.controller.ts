/**
 * Claude Controller - RESTful API 端点
 */

import { Controller, Get, Inject } from '@sker/core';
import { ClaudeGateway } from './claude.gateway';

@Controller('/api/claude')
export class ClaudeController {
  constructor(@Inject(ClaudeGateway) private claudeGateway: ClaudeGateway) {}

  /**
   * 获取所有在线的 CLI 客户端
   * GET /api/claude/clients
   */
  @Get('/clients')
  getOnlineClients() {
    return {
      success: true,
      data: this.claudeGateway.getOnlineClients(),
    };
  }

  /**
   * 获取统计信息
   * GET /api/claude/stats
   */
  @Get('/stats')
  getStats() {
    return {
      success: true,
      data: this.claudeGateway.getStats(),
    };
  }
}
