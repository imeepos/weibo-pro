import { CronJob } from 'cron';
import type { TaskQueue } from './task-queue.js';
import type { ScheduledTask, CrawlerTask } from './types.js';
import { TaskStatus } from './types.js';

/**
 * 定时任务调度器
 *
 * 存在即合理:
 * - 解析 Cron 表达式
 * - 定时推送任务到队列
 * - 支持启用/禁用
 */
export class TaskScheduler<T = any> {
  private jobs = new Map<string, CronJob>();

  constructor(private queue: TaskQueue<T>) {}

  /**
   * 添加定时任务
   */
  add(config: ScheduledTask): void {
    if (this.jobs.has(config.name)) {
      throw new Error(`定时任务已存在: ${config.name}`);
    }

    const job = new CronJob(
      config.cron,
      () => this.executeTask(config),
      null,
      config.enabled ?? true,
      'Asia/Shanghai'
    );

    this.jobs.set(config.name, job);
  }

  /**
   * 移除定时任务
   */
  remove(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
    }
  }

  /**
   * 启用定时任务
   */
  enable(name: string): void {
    this.jobs.get(name)?.start();
  }

  /**
   * 禁用定时任务
   */
  disable(name: string): void {
    this.jobs.get(name)?.stop();
  }

  /**
   * 停止所有定时任务
   */
  stopAll(): void {
    this.jobs.forEach((job) => job.stop());
    this.jobs.clear();
  }

  private async executeTask(config: ScheduledTask): Promise<void> {
    const task: CrawlerTask<T> = {
      id: `${config.name}-${Date.now()}`,
      type: config.taskType,
      payload: config.payload,
      status: TaskStatus.PENDING,
      createdAt: Date.now(),
    };

    await this.queue.push(task);
  }
}
