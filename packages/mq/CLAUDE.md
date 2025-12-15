# @sker/mq - RabbitMQ 消息队列库

基于 RabbitMQ + RxJS 的消息队列包，提供优雅的生产者-消费者模型。

## 核心哲学

**优雅即简约** - 唯一入口 `useQueue`，双 Observable 架构，清晰分离生产和消费。

**存在即合理** - 每个类、每个方法都有不可替代的目的：
- 连接池管理自动重连
- 消息信封封装确认控制
- RxJS 流式处理实现背压控制

**性能即艺术** - 连接复用、批量推送、预取优化。

## 目录结构

```
packages/mq/
├── src/
│   ├── index.ts              # 公共导出入口
│   ├── hooks.ts              # useQueue 核心 Hook
│   ├── connection-pool.ts    # RabbitMQ 连接池管理
│   ├── rx-producer.ts        # RxJS 生产者实现
│   ├── rx-consumer.ts        # RxJS 消费者实现
│   ├── rx-types.ts           # RxJS 类型定义
│   ├── types.ts              # 核心类型定义
│   └── tokens.ts             # DI 令牌和配置
├── package.json
└── tsconfig.json
```

---

## 核心概念

### 1. 双 Observable 架构

```typescript
const queue = useQueue<T>('queue-name');

// 生产者 - Observer 接口
queue.producer.next(message);
queue.producer.nextBatch(messages);

// 消费者 - Observable 接口
queue.consumer$.pipe(...).subscribe();
```

**设计理念**：
- 生产者和消费者**完全分离**
- 支持所有 RxJS 操作符（map, filter, mergeMap, retry, buffer...）
- 类型安全的消息传递

### 2. 消息信封 (MessageEnvelope)

包装 RabbitMQ 消息，提供确认控制：

```typescript
interface MessageEnvelope<T> {
  message: T;              // 消息内容
  metadata: MessageMetadata; // 元数据（ID、重试次数等）
  ack(): void;             // 确认成功
  nack(requeue?: boolean): void; // 拒绝消息
}
```

**自动 ACK vs 手动 ACK**：
- `manualAck: false`（默认）- Observable 订阅成功自动 ACK，错误自动 NACK
- `manualAck: true` - 必须手动调用 `envelope.ack()` 或 `envelope.nack()`

### 3. 连接池管理

全局单例 `ConnectionPool`，整个应用共享一个 RabbitMQ 连接：
- 自动重连（指数退避，最大 30s）
- 心跳检测（默认 30s）
- 连接状态追踪
- 优雅关闭

---

## 核心类和函数

### 1. `useQueue<T>(name, options?)` - 唯一推荐入口

**位置**：`src/hooks.ts:135-189`

**职责**：创建队列管理器，管理生产者和消费者生命周期。

**参数**：
```typescript
function useQueue<T = any>(
  name: string,              // 队列名称（自动规范化：去空白、转小写、替换特殊字符）
  options?: RxConsumerOptions // 消费者选项
): QueueManager<T>
```

**返回值**：
```typescript
interface QueueManager<T> {
  producer: QueueProducer<T>;        // 生产者 Observer
  consumer$: Observable<MessageEnvelope<T>>; // 消费者 Observable
  queueName: string;                 // 规范化后的队列名
  dlqName: string;                   // 死信队列名
}
```

**特性**：
- **缓存管理**：同一队列（相同配置）只创建一次，避免消息竞争
- **自动配置**：不存在的队列自动生成默认配置（`dlq = ${queue}.dlq`）
- **队列名规范化**：过滤不可见字符、空格转连字符、统一小写
- **热流共享**：`share()` 确保多次订阅共享同一个 RabbitMQ consumer

**示例**：
```typescript
const queue = useQueue<{ keyword: string; page: number }>('weibo_crawl_queue');

// 生产
queue.producer.next({ keyword: 'AI', page: 1 });

// 消费
queue.consumer$.pipe(
  filter(env => env.message.page === 1),
  map(env => env.message.keyword),
  mergeMap(keyword => crawl(keyword), 5) // 并发 5
).subscribe();
```

---

### 2. `ConnectionPool` - 连接池管理器

**位置**：`src/connection-pool.ts:19-242`

**职责**：管理 RabbitMQ 连接和通道，提供自动重连能力。

**核心方法**：

#### `connect(): Promise<void>` (L40-84)
建立 RabbitMQ 连接和通道。

**特性**：
- 防止并发连接（使用 `connectionPromise` 锁）
- 触发重连回调（`onReconnectedCallback`）
- 自动清理失败连接

#### `waitForConnection(timeoutMs): Promise<void>` (L169-189)
等待连接建立，超时抛异常。

**使用场景**：生产者发送消息前、消费者启动前。

**错误提示**：超时后提供详细诊断信息（状态、Channel、检查项）

#### `scheduleReconnect(): void` (L138-163)
调度重连任务。

**算法**：指数退避 `min(5000 * attempts, 30000)` ms

**触发条件**：
- 连接错误 (L106)
- 连接关闭 (L112)
- 通道关闭 (L134)

#### `getChannel(): any` (L191-196)
获取当前通道，未连接抛异常。

**状态管理**：
```typescript
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error',
}
```

---

### 3. `RxQueueProducer<T>` - RxJS 生产者

**位置**：`src/rx-producer.ts:21-142`

**职责**：实现 Observer 接口，将消息推送到 RabbitMQ 队列。

**核心方法**：

#### `next(message, options?): void` (L29-38)
异步推送单条消息（不阻塞）。

**实现**：
```typescript
this.publishMessage(message, options).catch(err => {
  console.error(`[RxQueueProducer] 发布消息失败: ${this.queueName}`, err);
});
```

#### `nextBatch(messages, options?): Promise<BatchPublishResult>` (L40-85)
同步批量推送消息。

**返回值**：
```typescript
interface BatchPublishResult {
  successCount: number;
  failureCount: number;
  failedIndices: number[];  // 失败消息的索引
  totalTimeMs: number;
}
```

**优化**：
- 自动确保队列存在（`ensureQueue`）
- 统一消息选项构建（`buildMessageOptions`）
- 失败索引记录，便于重试

#### `publishMessage(message, options?): Promise<boolean>` (L97-119)
内部方法：发布单条消息。

**步骤**：
1. 等待连接建立 (`waitForConnection`)
2. 确保队列存在 (`ensureQueue`)
3. 序列化消息 (`JSON.stringify`)
4. 调用 `channel.sendToQueue`

#### `ensureQueue(): Promise<void>` (L121-129)
被动声明队列。

**参数**：
```typescript
await channel.assertQueue(this.queueName, {
  durable: true,   // 持久化
  passive: false,  // 不主动设置参数（避免与 Consumer 冲突）
});
```

#### `buildMessageOptions(options?): Record<string, any>` (L131-140)
构建 RabbitMQ 消息选项。

**默认值**：
```typescript
{
  persistent: true,      // 消息持久化
  timestamp: Date.now(), // 自动添加时间戳
  ...options
}
```

---

### 4. `createRxConsumer<T>()` - RxJS 消费者

**位置**：`src/rx-consumer.ts:73-196`

**职责**：将 RabbitMQ 消息流转换为 RxJS Observable。

**函数签名**：
```typescript
function createRxConsumer<T>(
  connectionPool: ConnectionPool,
  queueName: string,
  options?: RxConsumerOptions,
  queueOptions?: any
): Observable<MessageEnvelope<T>>
```

**核心逻辑**：

#### 启动消费者 (L85-179)
```typescript
const startConsuming = async () => {
  await waitForConnection(connectionPool);
  channel = connectionPool.getChannel();

  // 1. 确保队列存在（使用 queueOptions）
  await channel.assertQueue(queueName, assertOptions);

  // 2. 设置预取数量（控制并发）
  await channel.prefetch(options?.prefetchCount ?? 1);

  // 3. 开始消费
  const consumeResult = await channel.consume(queueName, (msg) => {
    // 反序列化 + 创建信封 + 发送到 Observable
    subscriber.next(envelope);

    // 自动 ACK
    if (!manualAck) envelope.ack();
  });
};
```

#### 队列参数转换 (L96-115)
将自定义字段名转换为 RabbitMQ 标准参数：
```typescript
messageTtl → arguments['x-message-ttl']
deadLetterExchange → arguments['x-dead-letter-exchange']
deadLetterRoutingKey → arguments['x-dead-letter-routing-key']
```

#### 清理函数 (L185-194)
取消订阅时自动停止消费：
```typescript
return async () => {
  await channel.cancel(consumerTag);
};
```

---

### 5. `createMessageEnvelope<T>()` - 消息信封工厂

**位置**：`src/rx-consumer.ts:201-241`

**职责**：创建消息信封，封装 ACK/NACK 控制逻辑。

**实现**：
```typescript
function createMessageEnvelope<T>(
  message: T,
  metadata: MessageMetadata,
  rawMsg: amqp.ConsumeMessage,
  channel: amqp.Channel,
): MessageEnvelope<T> {
  let acknowledged = false; // 防止重复确认

  return {
    message,
    metadata,

    ack() {
      if (acknowledged) return;
      channel.ack(rawMsg);
      acknowledged = true;
    },

    nack(requeue = true) {
      if (acknowledged) return;
      channel.nack(rawMsg, false, requeue);
      acknowledged = true;
    }
  };
}
```

**防御性设计**：
- 幂等性保护（`acknowledged` 标志）
- 重复确认警告
- 错误捕获（避免 ACK 失败崩溃）

---

### 6. `waitForConnection()` - 连接等待辅助函数

**位置**：`src/rx-consumer.ts:11-53`

**职责**：轮询等待 ConnectionPool 建立连接。

**参数**：
```typescript
async function waitForConnection(
  connectionPool: ConnectionPool,
  timeout: number = 120000  // 默认 2 分钟
): Promise<void>
```

**错误处理**：
- 超时 → 抛出详细诊断信息（状态、RabbitMQ 检查清单）
- 状态错误（ERROR/CLOSED）→ 立即抛异常
- 进度日志（每 5 秒输出一次）

---

### 7. 配置管理

**位置**：`src/tokens.ts`

#### `registerMqQueueConfig(config)` (L75-81)
注册队列配置（可选）。

**示例**：
```typescript
registerMqQueueConfig({
  queue: 'weibo_crawl_queue',
  dlq: 'weibo_crawl_queue_dlq',
  queueOptions: {
    durable: true,
    messageTtl: 1800000, // 30 分钟
    deadLetterExchange: 'dlx',
    deadLetterRoutingKey: 'dlq',
  }
});
```

#### `getMqQueueConfig(queueName)` (L47-58)
获取队列配置，不存在则自动生成默认值。

**默认配置**：
```typescript
{
  queue: queueName,
  dlq: `${queueName}.dlq`
}
```

#### `NoRetryError` (L1, L83)
标记不可重试错误（从 `@sker/core` 导入）。

**使用场景**：
```typescript
throw new NoRetryError('参数验证失败'); // 消费者捕获后不重试
```

---

## 使用示例

### 1. 基础生产-消费

```typescript
import { useQueue } from '@sker/mq';

interface Task {
  keyword: string;
  page: number;
}

const queue = useQueue<Task>('weibo_crawl_queue');

// 生产者
queue.producer.next({ keyword: 'AI', page: 1 });

// 消费者
queue.consumer$.subscribe({
  next: envelope => {
    console.log('收到任务:', envelope.message);
    envelope.ack();
  },
  error: err => console.error('消费错误:', err)
});
```

---

### 2. RxJS 流式处理

```typescript
import { filter, map, mergeMap, retry, bufferTime } from 'rxjs/operators';

queue.consumer$.pipe(
  // 1. 过滤首页任务
  filter(env => env.message.page === 1),

  // 2. 提取关键词
  map(env => env.message.keyword),

  // 3. 并发爬取（最多 5 个）
  mergeMap(keyword => crawlWeibo(keyword), 5),

  // 4. 失败重试 3 次
  retry(3),

  // 5. 每 5 秒批量处理
  bufferTime(5000)
).subscribe({
  next: batch => console.log(`处理批次: ${batch.length} 条`),
  error: err => console.error('流处理错误:', err)
});
```

---

### 3. 手动 ACK 控制

```typescript
const queue = useQueue<Task>('critical_tasks', { manualAck: true });

queue.consumer$.pipe(
  tap(envelope => {
    try {
      const result = processTask(envelope.message);

      if (result.success) {
        envelope.ack(); // 成功确认
      } else {
        envelope.nack(true); // 重新入队
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        envelope.nack(false); // 验证失败，不重试
      } else {
        envelope.nack(true); // 其他错误，重试
      }
    }
  })
).subscribe();
```

---

### 4. 批量推送优化

```typescript
const tasks: Task[] = [
  { keyword: 'AI', page: 1 },
  { keyword: 'ML', page: 1 },
  { keyword: 'DL', page: 1 },
];

const result = await queue.producer.nextBatch(tasks, {
  priority: 5,
  expiration: 3600000, // 1 小时过期
});

console.log(`
  成功: ${result.successCount}
  失败: ${result.failureCount}
  耗时: ${result.totalTimeMs}ms
`);

// 重试失败的消息
if (result.failureCount > 0) {
  const failedTasks = result.failedIndices.map(i => tasks[i]);
  await queue.producer.nextBatch(failedTasks);
}
```

---

### 5. 高级队列配置

```typescript
import { registerMqQueueConfig } from '@sker/mq';

// 1. 注册队列配置
registerMqQueueConfig({
  queue: 'high_priority_queue',
  dlq: 'high_priority_queue_dlq',
  queueOptions: {
    durable: true,
    maxPriority: 10,           // 优先级队列（0-10）
    messageTtl: 1800000,       // 消息 TTL 30 分钟
    deadLetterExchange: 'dlx', // 死信交换机
    deadLetterRoutingKey: 'dlq',
  }
});

// 2. 使用队列
const queue = useQueue('high_priority_queue');

// 3. 推送高优先级消息
queue.producer.next({ task: 'urgent' }, { priority: 9 });
```

---

### 6. 错误处理策略

```typescript
import { NoRetryError } from '@sker/mq';
import { catchError, retry } from 'rxjs/operators';

queue.consumer$.pipe(
  mergeMap(envelope =>
    processMessage(envelope.message).pipe(
      // 成功后确认
      tap(() => envelope.ack()),

      // 捕获错误
      catchError(error => {
        if (error instanceof NoRetryError) {
          // 不可重试错误：拒绝且不重新入队
          envelope.nack(false);
          console.error('永久失败:', error.message);
        } else {
          // 可重试错误：拒绝并重新入队
          envelope.nack(true);
        }
        throw error;
      })
    ),
    5 // 并发数
  ),

  // 流级别重试（重新订阅 Observable）
  retry({
    count: 3,
    delay: 5000,
  })
).subscribe();
```

---

### 7. 消费者生命周期管理

```typescript
import { Subscription } from 'rxjs';

const queue = useQueue<Task>('tasks');

// 启动消费者
const subscription: Subscription = queue.consumer$.pipe(
  tap(env => {
    processTask(env.message);
    env.ack();
  })
).subscribe();

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('停止消费者...');
  subscription.unsubscribe(); // 自动调用 channel.cancel()

  // 关闭连接池（整个应用退出时）
  await globalConnectionPool?.close();
});
```

---

## 设计模式和最佳实践

### 1. 单例连接池模式

**位置**：`src/hooks.ts:16-48`

```typescript
let globalConnectionPool: ConnectionPool | null = null;

function getOrCreateConnectionPool(): ConnectionPool {
  if (!globalConnectionPool) {
    globalConnectionPool = new ConnectionPool({ url: process.env.RABBITMQ_URL });
    globalConnectionPool.connect().catch(err => {
      console.error('[MQ] 连接池初始化失败:', err);
    });
  }
  return globalConnectionPool;
}
```

**收益**：
- 整个应用共享一个 RabbitMQ 连接
- 减少连接数，提升性能
- 自动重连，提高可靠性

---

### 2. 队列管理器缓存模式

**位置**：`src/hooks.ts:30-148`

```typescript
const queueManagerCache = new Map<string, QueueManager<any>>();

export function useQueue<T>(name: string, options?: RxConsumerOptions) {
  const cacheKey = `${sanitizedName}:${JSON.stringify(options)}`;

  if (queueManagerCache.has(cacheKey)) {
    return queueManagerCache.get(cacheKey)!;
  }

  // 创建新的 QueueManager...
  queueManagerCache.set(cacheKey, queueManager);
  return queueManager;
}
```

**收益**：
- 同一队列只创建一个 consumer（避免消息竞争）
- 减少 RabbitMQ 连接数
- 提升性能

**注意**：cacheKey 包含 options，确保不同配置使用不同实例。

---

### 3. 热流共享模式 (RxJS share)

**位置**：`src/hooks.ts:161-168`

```typescript
const consumer$ = createRxConsumer<T>(
  connectionPool,
  config.queue,
  options,
  config.queueOptions
).pipe(
  share() // 转为热流
);
```

**share() 的作用**：
- 多次订阅共享同一个 RabbitMQ consumer（避免消息竞争）
- 所有订阅者取消时，自动停止消费（节省资源）
- 下次订阅时重新创建 consumer（保证消息不丢失）

**对比冷流**：
```typescript
// 冷流：每次订阅创建新的 consumer（会导致消息竞争！）
queue.consumer$.subscribe(...); // consumer1
queue.consumer$.subscribe(...); // consumer2 ⚠️ 两个 consumer 竞争同一队列
```

---

### 4. Observer 模式（生产者）

**位置**：`src/rx-producer.ts:21-95`

```typescript
export class RxQueueProducer<T> implements QueueProducer<T> {
  next(message: T, options?: PublishOptions): void {
    // 异步推送，不阻塞
  }

  error(err: Error): void {
    // 生产者错误，标记关闭
  }

  complete(): void {
    // 生产者完成，标记关闭
  }
}
```

**收益**：
- 符合 RxJS Observer 接口
- 可以作为 Observable 的订阅者
- 支持流式生产（`source$.subscribe(queue.producer)`）

---

### 5. 消息信封模式 (Envelope Pattern)

**位置**：`src/rx-consumer.ts:201-241`

```typescript
interface MessageEnvelope<T> {
  message: T;
  metadata: MessageMetadata;
  ack(): void;
  nack(requeue?: boolean): void;
}
```

**收益**：
- 在 RxJS 管道中保持对 RabbitMQ 消息的完全控制
- 支持手动 ACK/NACK（精细控制）
- 类型安全的泛型封装

**使用场景**：
```typescript
queue.consumer$.pipe(
  tap(envelope => {
    if (validate(envelope.message)) {
      envelope.ack();
    } else {
      envelope.nack(false); // 不重新入队
    }
  })
).subscribe();
```

---

### 6. 自动重连模式（指数退避）

**位置**：`src/connection-pool.ts:138-163`

```typescript
private scheduleReconnect(): void {
  this.reconnectAttempts++;

  const reconnectDelay = Math.min(5000 * this.reconnectAttempts, 30000);

  this.reconnectTimer = setTimeout(async () => {
    await this.connect();
  }, reconnectDelay);
}
```

**算法**：`min(5s * attempts, 30s)`
- 第 1 次：5s
- 第 2 次：10s
- 第 3 次：15s
- ...
- 第 6+ 次：30s（上限）

**收益**：
- 避免频繁重连（节省资源）
- 渐进式退避（给 RabbitMQ 恢复时间）
- 上限保护（不会无限增长）

---

### 7. 防御性队列名规范化

**位置**：`src/hooks.ts:62-80`

```typescript
function sanitizeQueueName(name: string | undefined | null): string {
  if (!name) {
    throw new Error('队列名称不能为空');
  }

  const sanitized = name
    .trim()                          // 去除首尾空白
    .replace(/[\n\r\t\s]+/g, ' ')    // 合并所有空白字符
    .replace(/\s+/g, '-')            // 空格转连字符
    .replace(/[^\w.-]/g, '')         // 只保留字母数字点连字符下划线
    .toLowerCase();                  // 统一小写

  if (!sanitized) {
    throw new Error(`无效的队列名称: "${name}"`);
  }

  return sanitized;
}
```

**收益**：
- 防止因换行符、空格导致的错误
- 统一队列名格式（符合 RabbitMQ 规范）
- 入口处统一校验（防御性编程）

**示例**：
```typescript
sanitizeQueueName('Weibo Crawl Queue\n') // → 'weibo-crawl-queue'
sanitizeQueueName('微博_爬虫 Queue')      // → '_-queue'
```

---

### 8. 被动队列声明模式

**位置**：`src/rx-producer.ts:121-129`

```typescript
private async ensureQueue(): Promise<void> {
  const channel = this.connectionPool.getChannel();

  await channel.assertQueue(this.queueName, {
    durable: true,
    passive: false, // 不主动设置参数
  });
}
```

**为什么 `passive: false`？**
- 避免与 Consumer 的队列参数冲突
- Consumer 负责定义完整队列参数（TTL、DLQ、优先级等）
- Producer 只确保队列存在，不覆盖参数

**最佳实践**：
1. Consumer 启动时声明队列参数（通过 `queueOptions`）
2. Producer 发送前被动声明（确保队列存在）
3. 避免 Producer 和 Consumer 参数不一致导致的冲突

---

### 9. 批量处理优化

**位置**：`src/rx-producer.ts:40-85`

```typescript
async nextBatch(messages: T[], options?: PublishOptions): Promise<BatchPublishResult> {
  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;
  const failedIndices: number[] = [];

  await this.ensureQueue();
  const channel = this.connectionPool.getChannel();
  const messageOptions = this.buildMessageOptions(options);

  for (let i = 0; i < messages.length; i++) {
    try {
      const result = channel.sendToQueue(
        this.queueName,
        Buffer.from(JSON.stringify(messages[i])),
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

  return { successCount, failureCount, failedIndices, totalTimeMs: Date.now() - startTime };
}
```

**收益**：
- 一次连接推送多条消息（减少网络开销）
- 记录失败索引（方便重试）
- 返回统计信息（监控和调试）

**使用场景**：
```typescript
const result = await queue.producer.nextBatch(tasks);
if (result.failureCount > 0) {
  const failedTasks = result.failedIndices.map(i => tasks[i]);
  await queue.producer.nextBatch(failedTasks); // 重试
}
```

---

### 10. 消息元数据追踪

**位置**：`src/rx-consumer.ts:133-139`

```typescript
const metadata: MessageMetadata = {
  messageId: msg.properties.messageId,
  correlationId: msg.properties.correlationId,
  timestamp: msg.properties.timestamp,
  retryCount: (msg.properties.headers?.['x-retry-count'] as number) ?? 0,
  properties: msg.properties,
};
```

**收益**：
- 消息链路追踪（通过 correlationId）
- 重试次数记录（防止无限重试）
- 完整的消息属性访问

**使用场景**：
```typescript
queue.consumer$.pipe(
  tap(envelope => {
    console.log(`消息 ${envelope.metadata.messageId} 第 ${envelope.metadata.retryCount} 次重试`);

    if (envelope.metadata.retryCount > 3) {
      envelope.nack(false); // 超过 3 次，放弃
    }
  })
).subscribe();
```

---

## 环境变量

```bash
# RabbitMQ 连接 URL（必需）
RABBITMQ_URL=amqp://user:password@localhost:5672
```

---

## 依赖

- **amqplib** - RabbitMQ Node.js 客户端
- **rxjs** - 响应式编程库
- **@sker/core** - DI 容器（用于配置管理和 NoRetryError）

---

## 常见问题

### 1. 为什么消费者收到重复消息？

**原因**：多次调用 `useQueue` 创建了多个 consumer（消息竞争）。

**解决**：
```typescript
// ❌ 错误：每次调用创建新 consumer
function handler() {
  const queue = useQueue('tasks'); // 不要在循环/函数中调用
  queue.consumer$.subscribe(...);
}

// ✅ 正确：全局创建一次
const queue = useQueue('tasks');
queue.consumer$.subscribe(...);
```

---

### 2. 为什么消息没有被确认？

**原因**：`manualAck: true` 但忘记调用 `envelope.ack()`。

**解决**：
```typescript
// ❌ 错误：忘记确认
queue.consumer$.subscribe(envelope => {
  processMessage(envelope.message);
  // 忘记调用 envelope.ack()
});

// ✅ 正确：手动确认
queue.consumer$.subscribe(envelope => {
  processMessage(envelope.message);
  envelope.ack();
});

// ✅ 更好：使用自动 ACK 模式
const queue = useQueue('tasks', { manualAck: false });
queue.consumer$.subscribe(envelope => {
  processMessage(envelope.message); // 自动确认
});
```

---

### 3. 如何控制消费者并发数？

**方法 1**：设置 `prefetchCount`（RabbitMQ 级别）
```typescript
const queue = useQueue('tasks', { prefetchCount: 10 });
```

**方法 2**：使用 RxJS `mergeMap`（应用级别）
```typescript
queue.consumer$.pipe(
  mergeMap(envelope =>
    processMessage(envelope.message),
    5 // 最多 5 个并发
  )
).subscribe();
```

**推荐**：两者结合使用。

---

### 4. 如何处理消息过期？

**方法 1**：队列级别 TTL（所有消息）
```typescript
registerMqQueueConfig({
  queue: 'tasks',
  dlq: 'tasks_dlq',
  queueOptions: {
    messageTtl: 1800000, // 30 分钟
  }
});
```

**方法 2**：消息级别 TTL（单条消息）
```typescript
queue.producer.next(message, {
  expiration: 3600000, // 1 小时
});
```

---

### 5. 如何实现死信队列？

```typescript
// 1. 注册主队列（配置 DLX）
registerMqQueueConfig({
  queue: 'tasks',
  dlq: 'tasks_dlq',
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx',         // 死信交换机
    deadLetterRoutingKey: 'tasks_dlq', // 路由键
  }
});

// 2. 消费主队列
const queue = useQueue('tasks', { manualAck: true });
queue.consumer$.subscribe(envelope => {
  try {
    processMessage(envelope.message);
    envelope.ack();
  } catch (error) {
    envelope.nack(false); // 不重新入队 → 进入死信队列
  }
});

// 3. 消费死信队列（手动处理失败消息）
const dlq = useQueue('tasks_dlq');
dlq.consumer$.subscribe(envelope => {
  console.error('失败消息:', envelope.message);
  notifyAdmin(envelope.message);
  envelope.ack();
});
```

---

### 6. 如何优雅关闭消费者？

```typescript
import { Subscription } from 'rxjs';

const subscription: Subscription = queue.consumer$.subscribe(...);

// 监听退出信号
process.on('SIGTERM', async () => {
  console.log('优雅关闭中...');

  // 1. 停止消费者（自动调用 channel.cancel）
  subscription.unsubscribe();

  // 2. 关闭连接池（等待未确认消息完成）
  await globalConnectionPool?.close();

  console.log('已关闭');
  process.exit(0);
});
```

---

## 总结

**@sker/mq** 通过 RabbitMQ + RxJS 实现了优雅的消息队列抽象：

- **唯一入口**：`useQueue` 一个函数搞定生产和消费
- **双 Observable 架构**：生产者 Observer + 消费者 Observable
- **自动管理**：连接池、重连、缓存、队列声明全自动
- **类型安全**：泛型支持，TypeScript 友好
- **流式处理**：支持所有 RxJS 操作符（map、filter、merge、retry...）
- **性能优化**：批量推送、预取控制、连接复用

**存在即合理** - 每一行代码都有不可替代的目的。

**优雅即简约** - 代码即文档，无需多余注释。
