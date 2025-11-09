/**
 * 队列类型定义
 *
 * 存在即合理：
 * - 统一的队列配置类型
 * - 完整的队列状态监控
 * - 类型安全的队列操作
 */

/**
 * 队列配置
 */
export interface QueueConfig {
  name: string;                  // 队列名称
  prefetch: number;              // 预取数量
  durable: boolean;              // 是否持久化
  maxRetries: number;            // 最大重试次数
  retryDelay: number;            // 重试延迟(ms)
}

/**
 * 队列状态
 */
export interface QueueStatus {
  name: string;                  // 队列名称
  messageCount: number;          // 消息数量
  consumerCount: number;         // 消费者数量
  state: 'running' | 'stopped' | 'error'; // 队列状态
}

/**
 * 队列管理器配置
 */
export interface QueueManagerConfig {
  queues: Record<string, QueueConfig>; // 队列配置映射
  defaultPrefetch: number;       // 默认预取数量
  defaultRetries: number;        // 默认重试次数
}