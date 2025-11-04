/**
 * @sker/mq - RabbitMQ 消息队列库
 *
 * 优雅即简约:
 * - 唯一入口：useQueue
 * - 最小导出：只导出必要的类型和工具
 * - 清晰职责：核心功能聚焦于队列管理
 */

// 核心 Hook - useQueue 是唯一推荐的使用方式
export { useQueue } from './hooks.js';

// RxJS 类型定义 - 支持 TypeScript 类型推导
export type {
  QueueManager,
  QueueProducer,
  MessageEnvelope,
  RxConsumerOptions,
} from './rx-types.js';

// 核心类型定义 - 发布和消费选项
export type {
  PublishOptions,
  ConsumerOptions,
  MessageMetadata,
  BatchPublishResult,
  ConnectionState,
} from './types.js';

// 配置工具 - 可选的队列配置注册
export type { MqQueueConfig } from './tokens.js';
export { registerMqQueueConfig, getMqQueueConfigs, NoRetryError } from './tokens.js';

// 内部组件 - 仅在特殊场景使用
export { ConnectionPool } from './connection-pool.js';
