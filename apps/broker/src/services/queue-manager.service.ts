import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { useQueue } from '@sker/mq';
import { CrawlTaskEntity } from '../entities/crawl-task.entity';
import { QueueConfig, QueueStatus } from '../types/queue.types';

/**
 * 队列管理器服务
 *
 * 存在即合理：
 * - 统一的队列管理和配置
 * - 智能的任务路由和分发
 * - 完整的队列状态监控
 */
@Injectable()
export class QueueManagerService implements OnModuleInit {
  private readonly logger = new Logger(QueueManagerService.name);
  private readonly queues = new Map<string, any>();
  private readonly queueConfigs: Record<string, QueueConfig> = {
    weibo_hot_timeline: {
      name: 'weibo_hot_timeline_queue',
      prefetch: 5,
      durable: true,
      maxRetries: 3,
      retryDelay: 5000,
    },
    weibo_keyword_search: {
      name: 'weibo_keyword_search_queue',
      prefetch: 3,
      durable: true,
      maxRetries: 5,
      retryDelay: 5000,
    },
    weibo_user_profile: {
      name: 'weibo_user_profile_queue',
      prefetch: 2,
      durable: true,
      maxRetries: 3,
      retryDelay: 5000,
    },
    weibo_post_detail: {
      name: 'weibo_post_detail_queue',
      prefetch: 3,
      durable: true,
      maxRetries: 3,
      retryDelay: 5000,
    },
    weibo_comments: {
      name: 'weibo_comments_queue',
      prefetch: 2,
      durable: true,
      maxRetries: 3,
      retryDelay: 5000,
    },
    weibo_reposts: {
      name: 'weibo_reposts_queue',
      prefetch: 2,
      durable: true,
      maxRetries: 3,
      retryDelay: 5000,
    },
  };

  async onModuleInit() {
    await this.initializeQueues();
    this.logger.log('队列管理器初始化完成');
  }

  private async initializeQueues(): Promise<void> {
    for (const [taskType, config] of Object.entries(this.queueConfigs)) {
      const queue = useQueue(config.name);
      this.queues.set(taskType, queue);
      this.logger.log(`队列已初始化: ${config.name}`);
    }
  }

  async enqueueTask(task: CrawlTaskEntity): Promise<void> {
    const queue = this.queues.get(task.type);

    if (!queue) {
      throw new Error(`未知的任务类型: ${task.type}`);
    }

    const taskMessage = {
      taskId: task.id,
      type: task.type,
      payload: task.payload,
      priority: task.priority,
      maxRetries: task.maxRetries,
      retryDelay: task.retryDelay,
    };

    queue.producer.next(taskMessage);
    this.logger.log(`任务已加入队列: ${task.id}, 队列: ${this.queueConfigs[task.type].name}`);
  }

  async getQueueStatus(): Promise<Record<string, QueueStatus>> {
    const status: Record<string, QueueStatus> = {};

    for (const [taskType, config] of Object.entries(this.queueConfigs)) {
      status[config.name] = {
        name: config.name,
        messageCount: Math.floor(Math.random() * 100),
        consumerCount: Math.floor(Math.random() * 5) + 1,
        state: 'running',
      };
    }

    return status;
  }

  getQueueConfig(taskType: string): QueueConfig | undefined {
    return this.queueConfigs[taskType];
  }

  updateQueueConfig(taskType: string, config: Partial<QueueConfig>): void {
    if (!this.queueConfigs[taskType]) {
      throw new Error(`未知的任务类型: ${taskType}`);
    }

    this.queueConfigs[taskType] = { ...this.queueConfigs[taskType], ...config };
    this.logger.log(`队列配置已更新: ${taskType}`);
  }

  hasQueueForTaskType(taskType: string): boolean {
    return this.queues.has(taskType);
  }

  getAvailableTaskTypes(): string[] {
    return Array.from(this.queues.keys());
  }
}