/**
 * Claude Controller SDK
 */

import { Controller, Get, Post, Body, Query } from '@sker/core';

/**
 * Claude Code 任务
 */
export interface ClaudeTask {
  id: string;
  task: string;
  priority?: 'low' | 'normal' | 'high';
  createdAt: string;
}

/**
 * 获取下一个任务的响应
 */
export interface NextTaskResponse {
  hasTask: boolean;
  task?: string;
  taskId?: string;
}

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

  /**
   * 获取下一个待执行任务（供 Stop Hook 调用）
   * GET /api/claude/tasks/next
   */
  getNextTask(sessionId?: string): Promise<NextTaskResponse>;

  /**
   * 添加待执行任务
   * POST /api/claude/tasks
   */
  addTask(task: Omit<ClaudeTask, 'id' | 'createdAt'>): Promise<ClaudeTask>;

  /**
   * 获取所有待执行任务
   * GET /api/claude/tasks
   */
  getTasks(): Promise<ClaudeTask[]>;

  /**
   * 标记任务完成
   * POST /api/claude/tasks/:id/complete
   */
  completeTask(taskId: string): Promise<{ success: boolean }>;
}

/**
 * Claude Controller SDK 实现
 * 装饰器将在运行时由 @sker/sdk 的 client.ts 读取并生成实际的 HTTP 调用
 */
@Controller('/claude')
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

  /**
   * 获取下一个待执行任务（供 Stop Hook 调用）
   */
  @Get('/tasks/next')
  getNextTask(@Query('sessionId') sessionId?: string): Promise<NextTaskResponse> {
    throw new Error('This method should be implemented by SDK client proxy');
  }

  /**
   * 添加待执行任务
   */
  @Post('/tasks')
  addTask(@Body() task: Omit<ClaudeTask, 'id' | 'createdAt'>): Promise<ClaudeTask> {
    throw new Error('This method should be implemented by SDK client proxy');
  }

  /**
   * 获取所有待执行任务
   */
  @Get('/tasks')
  getTasks(): Promise<ClaudeTask[]> {
    throw new Error('This method should be implemented by SDK client proxy');
  }

  /**
   * 标记任务完成
   */
  @Post('/tasks/:id/complete')
  completeTask(@Query('id') taskId: string): Promise<{ success: boolean }> {
    throw new Error('This method should be implemented by SDK client proxy');
  }
}
