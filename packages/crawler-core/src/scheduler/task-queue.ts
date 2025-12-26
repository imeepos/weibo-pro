import { useQueue, registerMqQueueConfig } from '@sker/mq';
import type { QueueManager } from '@sker/mq';
import type { CrawlerTask } from './types.js';

/**
 * 任务队列管理
 *
 * 存在即合理:
 * - 封装 @sker/mq 的队列操作
 * - 支持任务优先级
 * - 自动注册队列配置
 */
export class TaskQueue<T = any> {
  private queue: QueueManager<CrawlerTask<T>>;

  constructor(queueName: string, maxPriority = 10) {
    registerMqQueueConfig({
      queue: queueName,
      dlq: `${queueName}.dlq`,
      queueOptions: {
        durable: true,
        maxPriority,
        messageTtl: 1800000, // 30分钟
      },
    });

    this.queue = useQueue<CrawlerTask<T>>(queueName, { manualAck: true });
  }

  /**
   * 推送任务
   */
  async push(task: CrawlerTask<T>): Promise<void> {
    this.queue.producer.next(task, {
      priority: task.priority ?? 0,
    });
  }

  /**
   * 批量推送任务
   */
  async pushBatch(tasks: CrawlerTask<T>[]): Promise<void> {
    await this.queue.producer.nextBatch(tasks);
  }

  /**
   * 获取消费者流
   */
  get consumer$() {
    return this.queue.consumer$;
  }

  get name() {
    return this.queue.queueName;
  }
}
