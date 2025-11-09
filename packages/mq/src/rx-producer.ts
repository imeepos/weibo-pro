import type { ConnectionPool } from './connection-pool.js';
import type { PublishOptions, BatchPublishResult } from './types.js';
import type { QueueProducer } from './rx-types.js';

/**
 * RxJS 队列生产者 - 直接使用 ConnectionPool
 *
 * 存在即合理:
 * - 实现 Observer 接口（next, error, complete）
 * - 直接操作 Channel，无中间层
 *
 * 优雅即简约:
 * - 合并了原 RabbitMQPublisher 的逻辑
 * - 减少抽象层次
 * - 自动队列声明
 *
 * 性能即艺术:
 * - 批量发布优化
 * - 连接池复用
 */
export class RxQueueProducer<T> implements QueueProducer<T> {
    private closed = false;

    constructor(
        private readonly connectionPool: ConnectionPool,
        private readonly queueName: string,
    ) {}

    next(message: T, options?: PublishOptions): void {
        if (this.closed) {
            console.warn(`[RxQueueProducer] 生产者已关闭，消息被忽略: ${this.queueName}`);
            return;
        }

        this.publishMessage(message, options).catch(err => {
            console.error(`[RxQueueProducer] 发布消息失败: ${this.queueName}`, err);
        });
    }

    async nextBatch(messages: T[], options?: PublishOptions): Promise<BatchPublishResult> {
        if (this.closed) {
            throw new Error(`生产者已关闭: ${this.queueName}`);
        }

        await this.connectionPool.waitForConnection();

        const startTime = Date.now();
        let successCount = 0;
        let failureCount = 0;
        const failedIndices: number[] = [];

        // 确保队列存在
        await this.ensureQueue();

        const channel = this.connectionPool.getChannel();
        const messageOptions = this.buildMessageOptions(options);

        for (let i = 0; i < messages.length; i++) {
            try {
                const messageBuffer = Buffer.from(JSON.stringify(messages[i]));
                const result = channel.sendToQueue(
                    this.queueName,
                    messageBuffer,
                    messageOptions,
                );

                if (result) {
                    successCount++;
                } else {
                    failureCount++;
                    failedIndices.push(i);
                }
            } catch (error) {
                failureCount++;
                failedIndices.push(i);
            }
        }

        return {
            successCount,
            failureCount,
            failedIndices,
            totalTimeMs: Date.now() - startTime,
        };
    }

    error(err: Error): void {
        console.error(`[RxQueueProducer] 生产者错误: ${this.queueName}`, err);
        this.closed = true;
    }

    complete(): void {
        console.log(`[RxQueueProducer] 生产者完成: ${this.queueName}`);
        this.closed = true;
    }

    private async publishMessage(message: T, options?: PublishOptions): Promise<boolean> {
        await this.connectionPool.waitForConnection();

        const channel = this.connectionPool.getChannel();

        await this.ensureQueue();

        const messageBuffer = Buffer.from(JSON.stringify(message));
        const messageOptions = this.buildMessageOptions(options);

        try {
            return channel.sendToQueue(
                this.queueName,
                messageBuffer,
                messageOptions,
            );
        } catch (error) {
            throw new Error(
                `发布消息失败: ${this.queueName} - ${(error as Error).message}`,
                { cause: error }
            );
        }
    }

    private async ensureQueue(): Promise<void> {
        const channel = this.connectionPool.getChannel();

        // 被动声明：不主动设置参数，避免与 Consumer 冲突
        await channel.assertQueue(this.queueName, {
            durable: true,
            passive: false,
        });
    }

    private buildMessageOptions(options?: PublishOptions): Record<string, any> {
        return {
            persistent: options?.persistent ?? true,
            priority: options?.priority,
            expiration: options?.expiration?.toString(),
            messageId: options?.messageId,
            correlationId: options?.correlationId,
            timestamp: Date.now(),
        };
    }
}
