/**
 * TaskManager - 任务管理器
 *
 * 存在即合理:
 * - 管理多个并行任务的生命周期
 * - 支持任务切换和状态查询
 * - 控制并发执行数量
 */

import { EventEmitter } from 'node:events';
import type { ClaudeCommand, TaskState, TaskStatus } from './types/claude-types.js';

export interface TaskManagerOptions {
  /** 最大并发任务数 */
  maxConcurrent?: number;
}

export class TaskManager extends EventEmitter {
  private tasks = new Map<string, TaskState>();
  private maxConcurrent: number;
  private currentTaskId?: string;

  constructor(options: TaskManagerOptions = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent ?? 3;
  }

  /**
   * 添加新任务
   */
  addTask(command: ClaudeCommand, name?: string): TaskState {
    const task: TaskState = {
      id: command.taskId,
      name: name ?? command.command.slice(0, 50),
      status: 'pending',
      progress: 0,
      messages: [],
      createdAt: Date.now(),
      command,
    };

    this.tasks.set(task.id, task);
    this.emit('task-added', task);

    // 如果没有当前任务，自动切换到新任务
    if (!this.currentTaskId) {
      this.currentTaskId = task.id;
    }

    return task;
  }

  /**
   * 更新任务状态
   */
  updateTask(taskId: string, updates: Partial<TaskState>): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    Object.assign(task, updates);

    if (updates.status === 'complete' || updates.status === 'error' || updates.status === 'aborted') {
      task.completedAt = Date.now();
      task.progress = 100;
    }

    this.emit('task-updated', task);
  }

  /**
   * 添加任务消息
   */
  addMessage(taskId: string, message: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.messages.push(message);
    this.emit('task-message', { taskId, message });
  }

  /**
   * 更新任务进度
   */
  updateProgress(taskId: string, progress: number): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.progress = Math.min(100, Math.max(0, progress));
    this.emit('task-progress', { taskId, progress: task.progress });
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): TaskState | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getTasks(): TaskState[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 获取运行中的任务数量
   */
  getRunningCount(): number {
    return Array.from(this.tasks.values()).filter(t => t.status === 'running').length;
  }

  /**
   * 检查是否可以启动新任务
   */
  canStartTask(): boolean {
    return this.getRunningCount() < this.maxConcurrent;
  }

  /**
   * 切换当前任务
   */
  switchTask(taskId: string): boolean {
    if (!this.tasks.has(taskId)) return false;

    this.currentTaskId = taskId;
    this.emit('task-switched', taskId);
    return true;
  }

  /**
   * 获取当前任务
   */
  getCurrentTask(): TaskState | undefined {
    return this.currentTaskId ? this.tasks.get(this.currentTaskId) : undefined;
  }

  /**
   * 删除任务
   */
  removeTask(taskId: string): boolean {
    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      if (this.currentTaskId === taskId) {
        // 切换到下一个任务
        const tasks = this.getTasks();
        this.currentTaskId = tasks[0]?.id;
      }
      this.emit('task-removed', taskId);
    }
    return deleted;
  }

  /**
   * 清空所有已完成的任务
   */
  clearCompleted(): number {
    let count = 0;
    for (const [id, task] of this.tasks) {
      if (task.status === 'complete' || task.status === 'error' || task.status === 'aborted') {
        this.tasks.delete(id);
        count++;
      }
    }
    if (count > 0) {
      this.emit('tasks-cleared', count);
    }
    return count;
  }

  /**
   * 获取任务统计
   */
  getStats() {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      complete: tasks.filter(t => t.status === 'complete').length,
      error: tasks.filter(t => t.status === 'error').length,
      aborted: tasks.filter(t => t.status === 'aborted').length,
    };
  }
}
