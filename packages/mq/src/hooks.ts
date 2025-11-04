import { getMqQueueConfig } from "./tokens.js";
import { ConnectionPool } from "./connection-pool.js";
import { RxQueueProducer } from "./rx-producer.js";
import { createRxConsumer } from "./rx-consumer.js";
import type { QueueManager, RxConsumerOptions } from "./rx-types.js";

/**
 * 全局单例 ConnectionPool
 *
 * 优雅即简约:
 * - 整个应用共享一个连接池
 * - 减少连接数，提升性能
 * - 自动初始化
 */
let globalConnectionPool: ConnectionPool | null = null;

function getOrCreateConnectionPool(): ConnectionPool {
    if (!globalConnectionPool) {
        const rabbitUrl = process.env.RABBITMQ_URL;
        if (!rabbitUrl) {
            throw new Error('环境变量 RABBITMQ_URL 未配置');
        }

        globalConnectionPool = new ConnectionPool({ url: rabbitUrl });

        // 初始化连接
        globalConnectionPool.connect().catch(err => {
            console.error('[MQ] 连接池初始化失败:', err);
        });
    }

    return globalConnectionPool;
}

/**
 * 使用队列的钩子函数 - RxJS 双 Observable 架构
 *
 * 优雅即简约:
 * - 生产者和消费者完全分离
 * - 支持所有 RxJS 操作符
 * - 类型安全的消息传递
 * - 自动配置管理
 *
 * 存在即合理:
 * - 移除了对 RabbitMQService 的依赖
 * - 直接使用 ConnectionPool
 * - 减少抽象层次
 *
 * @example
 * const queue = useQueue<WeiboTask>('weibo_crawl_queue');
 *
 * // 生产者：推送消息
 * queue.producer.next({ keyword: 'AI', page: 1 });
 *
 * // 批量推送
 * await queue.producer.nextBatch([
 *   { keyword: 'AI', page: 1 },
 *   { keyword: 'ML', page: 1 },
 * ]);
 *
 * // 消费者：RxJS 管道处理消息
 * queue.consumer$.pipe(
 *   filter(env => env.message.page === 1),
 *   map(env => env.message.keyword),
 *   mergeMap(keyword => processKeyword(keyword), 5),
 *   retry(3),
 *   bufferTime(5000),
 *   tap(batch => console.log(`处理批次: ${batch.length} 条`))
 * ).subscribe({
 *   next: result => console.log('成功:', result),
 *   error: err => console.error('失败:', err)
 * });
 *
 * // 手动 ACK 模式
 * queue.consumer$.pipe(
 *   tap(envelope => {
 *     try {
 *       processMessage(envelope.message);
 *       envelope.ack();
 *     } catch (error) {
 *       envelope.nack(false); // 不重新入队
 *     }
 *   })
 * ).subscribe();
 */
export function useQueue<T = any>(
    name: string,
    options?: RxConsumerOptions
): QueueManager<T> {
    const config = getMqQueueConfig(name);
    const connectionPool = getOrCreateConnectionPool();

    // 创建生产者
    const producer = new RxQueueProducer<T>(connectionPool, config.queue);

    // 创建消费者 Observable
    const consumer$ = createRxConsumer<T>(
        connectionPool,
        config.queue,
        options,
        config.queueOptions
    );

    return {
        producer,
        consumer$,

        get queueName(): string {
            return config.queue;
        },

        get dlqName(): string {
            return config.dlq;
        }
    };
}
