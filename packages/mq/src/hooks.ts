import { getMqQueueConfig } from "./tokens.js";
import { ConnectionPool } from "./connection-pool.js";
import { RxQueueProducer } from "./rx-producer.js";
import { createRxConsumer } from "./rx-consumer.js";
import type { QueueManager, RxConsumerOptions } from "./rx-types.js";
import { share } from 'rxjs/operators';

/**
 * 全局单例 ConnectionPool
 *
 * 优雅即简约:
 * - 整个应用共享一个连接池
 * - 减少连接数，提升性能
 * - 自动初始化
 */
let globalConnectionPool: ConnectionPool | null = null;

/**
 * 全局队列管理器缓存
 *
 * 存在即合理:
 * - 同一队列只创建一个 consumer$（避免消息竞争）
 * - 减少 RabbitMQ 连接数
 * - 提升性能
 *
 * 优雅即简约:
 * - 使用 Map 存储队列名 → QueueManager 映射
 * - 自动共享同一队列的消费者
 */
const queueManagerCache = new Map<string, QueueManager<any>>();

function getOrCreateConnectionPool(): ConnectionPool {
    if (!globalConnectionPool) {
        const rabbitUrl = process.env.RABBITMQ_URL;
        if (!rabbitUrl) {
            throw new Error('环境变量 RABBITMQ_URL 未配置');
        }

        globalConnectionPool = new ConnectionPool({ url: rabbitUrl });

        // 主动发起连接，但不阻塞（生产者会在发送时等待）
        globalConnectionPool.connect().catch(err => {
            console.error('[MQ] 连接池初始化失败:', err);
        });
    }

    return globalConnectionPool;
}

/**
 * 规范化队列名称
 *
 * 存在即合理:
 * - 统一的队列名过滤逻辑
 * - 确保队列名符合 RabbitMQ 规范
 * - 防止因换行符、空格等导致的错误
 *
 * 优雅即简约:
 * - 单一职责：只负责清理队列名
 * - 防御性编程：在入口处就做好校验
 */
function sanitizeQueueName(name: string | undefined | null): string {
    if (!name) {
        throw new Error('队列名称不能为空');
    }

    // 过滤所有不可见字符和多余空格
    const sanitized = name
        .trim()                          // 去除首尾空白
        .replace(/[\n\r\t\s]+/g, ' ')    // 将所有空白字符（包括换行、制表符）替换为单个空格
        .replace(/\s+/g, '-')            // 将空格替换为连字符（更符合队列名规范）
        .replace(/[^\w.-]/g, '')         // 只保留字母、数字、点、连字符、下划线
        .toLowerCase();                  // 统一转为小写

    if (!sanitized) {
        throw new Error(`无效的队列名称: "${name}"`);
    }

    return sanitized;
}

/**
 * 使用队列的钩子函数 - RxJS 双 Observable 架构
 *
 * 优雅即简约:
 * - 生产者和消费者完全分离
 * - 支持所有 RxJS 操作符
 * - 类型安全的消息传递
 * - 自动配置管理
 * - 入口处统一过滤队列名
 *
 * 存在即合理:
 * - 移除了对 RabbitMQService 的依赖
 * - 直接使用 ConnectionPool
 * - 减少抽象层次
 * - 防御性编程：确保队列名合法
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
    options: RxConsumerOptions = { manualAck: true }
): QueueManager<T> {
    // 关键：在入口处统一规范化队列名
    const sanitizedName = sanitizeQueueName(name);

    // 生成缓存 key（包含队列名和选项，确保相同配置共享实例）
    const cacheKey = `${sanitizedName}:${JSON.stringify(options)}`;

    // 检查缓存
    if (queueManagerCache.has(cacheKey)) {
        return queueManagerCache.get(cacheKey)!;
    }

    const config = getMqQueueConfig(sanitizedName);
    const connectionPool = getOrCreateConnectionPool();

    // 创建生产者（每次都创建新的，因为生产者是无状态的）
    const producer = new RxQueueProducer<T>(connectionPool, config.queue);

    // 创建消费者 Observable，使用 share() 转为热流
    // 优雅设计：
    // - share() 确保多次订阅共享同一个 RabbitMQ consumer（避免消息竞争）
    // - 当所有订阅者取消订阅时，自动停止消费（节省资源）
    // - 下次订阅时会重新创建 consumer（保证消息不丢失）
    const consumer$ = createRxConsumer<T>(
        connectionPool,
        config.queue,
        options,
        config.queueOptions
    ).pipe(
        share() // 转为热流，多次订阅共享同一个 RabbitMQ consumer
    );

    const queueManager: QueueManager<T> = {
        producer,
        consumer$,

        get queueName(): string {
            return config.queue;
        },

        get dlqName(): string {
            return config.dlq;
        }
    };

    // 缓存队列管理器
    queueManagerCache.set(cacheKey, queueManager);

    console.log(`[useQueue] 创建队列管理器: ${sanitizedName} (cacheKey: ${cacheKey})`);

    return queueManager;
}
