import { mergeMap, tap, catchError, of } from 'rxjs';
import type { TaskQueue } from './task-queue.js';
import type { CrawlerTask, TaskHandler } from './types.js';
import { TaskStatus } from './types.js';

/**
 * 任务消费者
 *
 * 存在即合理:
 * - 从队列消费任务
 * - 执行任务处理器
 * - 自动 ACK/NACK
 * - 任务状态追踪
 */
export class TaskConsumer<T = any> {
  private handlers = new Map<string, TaskHandler<T>>();

  constructor(
    private queue: TaskQueue<T>,
    private concurrency = 5
  ) {}

  /**
   * 注册任务处理器
   */
  register(taskType: string, handler: TaskHandler<T>): void {
    this.handlers.set(taskType, handler);
  }

  /**
   * 启动消费
   */
  start(): void {
    this.queue.consumer$
      .pipe(
        mergeMap(
          async (envelope) => {
            const task = envelope.message;
            const handler = this.handlers.get(task.type);

            if (!handler) {
              console.warn(`[TaskConsumer] 未找到处理器: ${task.type}`);
              envelope.nack(false);
              return;
            }

            try {
              this.updateStatus(task, TaskStatus.RUNNING);
              await handler(task);
              this.updateStatus(task, TaskStatus.COMPLETED);
              envelope.ack();
            } catch (error) {
              this.updateStatus(task, TaskStatus.FAILED, error);
              envelope.nack(true);
            }
          },
          this.concurrency
        ),
        catchError((error) => {
          console.error('[TaskConsumer] 消费错误:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  private updateStatus(
    task: CrawlerTask<T>,
    status: TaskStatus,
    error?: any
  ): void {
    task.status = status;
    const now = Date.now();

    if (status === TaskStatus.RUNNING) {
      task.startedAt = now;
    } else if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      task.completedAt = now;
      if (error) {
        task.error = error.message || String(error);
      }
    }
  }
}
