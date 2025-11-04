import { InjectionToken, NoRetryError, root } from "@sker/core";

/**
 * 队列配置
 *
 * 存在即合理:
 * - queue: 主队列名
 * - dlq: 死信队列名
 * - queueOptions: RabbitMQ 队列参数
 */
export interface MqQueueConfig {
    queue: string;
    dlq: string;
    queueOptions?: {
        durable?: boolean;
        messageTtl?: number;
        expires?: number;
        maxLength?: number;
        maxPriority?: number;
        deadLetterExchange?: string;
        deadLetterRoutingKey?: string;
        [key: string]: any;
    };
}

export const MQ_QUEUE_CONFIG = new InjectionToken<MqQueueConfig[]>('MQ_QUEUE_CONFIG');

/**
 * 获取所有队列配置
 */
export function getMqQueueConfigs(): MqQueueConfig[] {
    try {
        return root.get(MQ_QUEUE_CONFIG);
    } catch {
        // 容器中未注册，返回空数组
        return [];
    }
}

/**
 * 获取队列配置
 *
 * 优雅即简约:
 * - 不存在则自动生成默认配置
 * - 不强制预注册
 */
export function getMqQueueConfig(queueName: string): MqQueueConfig {
    // 尝试从 IoC 容器获取
    const configs = getMqQueueConfigs();
    const config = configs.find(it => it.queue === queueName);
    if (config) return config;

    // 自动生成默认配置
    return {
        queue: queueName,
        dlq: `${queueName}.dlq`,
    };
}

/**
 * 注册队列配置（可选）
 *
 * 注意：不再硬编码业务队列，由业务层自行注册
 *
 * @example
 * registerMqQueueConfig({
 *   queue: 'weibo_crawl_queue',
 *   dlq: 'weibo_crawl_queue_dlq',
 *   queueOptions: {
 *     durable: true,
 *     messageTtl: 1800000, // 30分钟
 *   }
 * });
 */
export function registerMqQueueConfig(config: MqQueueConfig): void {
    root.set([{
        provide: MQ_QUEUE_CONFIG,
        useValue: config,
        multi: true,
    }]);
}

export { NoRetryError };
