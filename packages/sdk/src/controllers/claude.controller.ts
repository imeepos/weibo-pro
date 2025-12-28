/**
 * Claude Controller SDK
 */

import { Controller, Get } from '@sker/core';

/**
 * Claude Controller 接口定义
 */
export interface IClaudeController {
  /**
   * 获取所有在线的 CLI 客户端
   * GET /api/claude/clients
   */
  getOnlineClients(): Promise<{
    success: boolean;
    data: Array<{
      clientId: string;
      socketId: string;
      connectedAt: number;
      activeTaskCount: number;
    }>;
  }>;

  /**
   * 获取统计信息
   * GET /api/claude/stats
   */
  getStats(): Promise<{
    success: boolean;
    data: {
      activeClients: number;
    };
  }>;
}

/**
 * Claude Controller SDK 实现
 * 装饰器将在运行时由 @sker/sdk 的 client.ts 读取并生成实际的 HTTP 调用
 */
@Controller('/api/claude')
export class ClaudeController implements IClaudeController {
  /**
   * 获取所有在线的 CLI 客户端
   * GET /api/claude/clients
   */
  @Get('/clients')
  getOnlineClients(): Promise<{
    success: boolean;
    data: Array<{
      clientId: string;
      socketId: string;
      connectedAt: number;
      activeTaskCount: number;
    }>;
  }> {
    throw new Error('This method should be implemented by SDK client proxy');
  }

  /**
   * 获取统计信息
   * GET /api/claude/stats
   */
  @Get('/stats')
  getStats(): Promise<{
    success: boolean;
    data: {
      activeClients: number;
    };
  }> {
    throw new Error('This method should be implemented by SDK client proxy');
  }
}
