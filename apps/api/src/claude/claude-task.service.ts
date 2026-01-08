/**
 * Claude Task Service - Claude Code 任务队列服务
 *
 * 管理 Claude Code Stop Hook 的待办任务队列
 */

import { Injectable, createLogger } from '@sker/core';
import { generateRandomString } from '@sker/utils';
import type { ClaudeTask, NextTaskResponse } from '@sker/sdk';

@Injectable({ providedIn: 'auto' })
export class ClaudeTaskService {
  private logger = createLogger('ClaudeTaskService');

  /** 任务队列 */
  private tasks: ClaudeTask[] = [];

  /**
   * 获取下一个待执行任务
   */
  getNextTask(_sessionId?: string): NextTaskResponse {
    const task = this.tasks.shift();

    if (task) {
      this.logger.info(`分配任务: ${task.id} - ${task.task}`);
      return {
        hasTask: true,
        task: task.task,
        taskId: task.id,
      };
    }

    return { hasTask: false };
  }

  /**
   * 添加任务
   */
  addTask(data: { task: string; priority?: 'low' | 'normal' | 'high' }): ClaudeTask {
    const task: ClaudeTask = {
      id: generateRandomString(21),
      task: data.task,
      priority: data.priority || 'normal',
      createdAt: new Date().toISOString(),
    };

    // 根据优先级插入
    if (data.priority === 'high') {
      this.tasks.unshift(task);
    } else {
      this.tasks.push(task);
    }

    this.logger.info(`添加任务: ${task.id} - ${task.task}`);
    return task;
  }

  /**
   * 获取所有任务
   */
  getTasks(): ClaudeTask[] {
    return [...this.tasks];
  }

  /**
   * 标记任务完成（从队列中移除）
   */
  completeTask(taskId: string): boolean {
    const index = this.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      this.tasks.splice(index, 1);
      this.logger.info(`任务完成: ${taskId}`);
      return true;
    }
    return false;
  }
}
