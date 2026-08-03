# @sker/mq

基于 RabbitMQ + RxJS 的消息队列客户端，提供连接池、自动重连、批量发布与响应式消费能力。

## 核心职责

- 连接池管理：单例 `ConnectionPool` 复用连接与 Channel，支持自动重连与状态机（`ConnectionState`）
- RxJS 双向队列：`useQueue(queueName)` 返回"生产者 Observer + 消费者 Observable"双接口
- 批量发布：`nextBatch` 支持批量投递、部分失败统计与 `BatchPublishResult` 返回
- 响应式消费：`MessageEnvelope` 携带 `ack/nack` 手动确认能力，支持预取（prefetch）控制
- 队列/死信队列（DLQ）配置：通过 `@sker/core` 注入令牌注册 `MqQueueConfig`，未注册时自动生成默认配置
- 与 DI 集成：基于 `@sker/core` 的 `root` 容器读取队列配置，`NoRetryError` 标记不可重试消息

## 目录结构

```
packages/mq/
├── src/
│   ├── index.ts                       # 导出入口（推荐 useQueue，其余为内部组件）
│   ├── hooks.ts                       # useQueue Hook：全局连接池 + 队列管理器缓存
│   ├── connection-pool.ts             # ConnectionPool：连接/Channel 复用、自动重连、状态管理
│   ├── rx-producer.ts                 # RxQueueProducer：实现 Observer 接口，支持批量发布
│   ├── rx-consumer.ts                 # createRxConsumer：将消费封装为 RxJS Observable
│   ├── rx-types.ts                    # QueueManager / MessageEnvelope / QueueProducer 等 RxJS 类型
│   ├── types.ts                       # RabbitMQConfig / PublishOptions / ConsumerOptions 等核心类型
│   └── tokens.ts                      # MQ_QUEUE_CONFIG 注入令牌 + registerMqQueueConfig + NoRetryError
├── package.json
├── tsconfig.json
└── tsup.config.ts                     # 构建配置
```

## 边界

- **✅ 负责**：RabbitMQ 连接的建立/复用/重连；消息发布（含批量）、消费、手动 ack/nack；队列与死信队列配置管理
- **❌ 不负责**：业务消息的序列化格式（消息体原样传输，由调用方约定）；Broker 集群的运维与部署；RPC 路由/重试策略以外的补偿逻辑
- **对外依赖**：`@sker/core`（DI 容器、`NoRetryError`）；外部：`amqplib`、`rxjs`、`reflect-metadata`、`dotenv`（读 `RABBITMQ_URL` 环境变量）
- **被谁依赖**：`apps/api`、`apps/cli`、`packages/crawler-core`、`packages/entities`、`packages/ip-proxy`、`packages/workflow-run`
