/**
 * RabbitMQ 核心类型定义
 *
 * 存在即合理：只保留 useQueue 实际使用的类型
 */

/**
 * RabbitMQ 配置
 */
export interface RabbitMQConfig {
  /** 连接 URL */
  url: string;

  /** 心跳间隔(秒) - 默认 30 */
  heartbeat?: number;
}

/**
 * 发布选项
 */
export interface PublishOptions {
  /** 消息优先级 (0-10) */
  priority?: number;

  /** 消息过期时间(毫秒) */
  expiration?: number;

  /** 是否持久化 - 默认 true */
  persistent?: boolean;

  /** 消息 ID */
  messageId?: string;

  /** 相关ID - 用于请求-响应模式 */
  correlationId?: string;
}

/**
 * 消费者选项
 */
export interface ConsumerOptions {
  /** 预取数量 - 控制并发，默认 1 */
  prefetchCount?: number;

  /** 消费者标签 */
  consumerTag?: string;
}

/**
 * 消息元数据
 */
export interface MessageMetadata {
  /** 消息 ID */
  messageId?: string;

  /** 相关 ID */
  correlationId?: string;

  /** 时间戳 */
  timestamp?: number;

  /** 重试次数 */
  retryCount: number;

  /** 消息属性 */
  properties: Record<string, any>;
}

/**
 * 批量发布结果
 */
export interface BatchPublishResult {
  /** 成功数量 */
  successCount: number;

  /** 失败数量 */
  failureCount: number;

  /** 失败的消息索引 */
  failedIndices: number[];

  /** 总耗时(毫秒) */
  totalTimeMs: number;
}

/**
 * 连接状态
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error',
}
