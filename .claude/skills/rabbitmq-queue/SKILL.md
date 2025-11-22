---
name: rabbitmq-queue
description: 使用 RabbitMQ 消息队列实现生产者和消费者模式。当需要异步任务处理、消息发布订阅、或批量数据处理时使用。
---

# RabbitMQ 消息队列

本项目使用 @sker/mq 包封装 RabbitMQ，结合 RxJS 实现响应式消息处理。

## 核心文件

- 队列钩子：`packages/mq/src/hooks.ts`
- 消费者：`packages/mq/src/rx-consumer.ts`
- 生产者：`packages/mq/src/rx-producer.ts`

## 生产者使用

```typescript
import { useQueue } from '@sker/mq';

interface TaskMessage {
  keyword: string;
  page: number;
}

const queue = useQueue<TaskMessage>('task_queue');

// 单条推送
queue.producer.next({ keyword: 'AI', page: 1 });

// 批量推送
await queue.producer.nextBatch([
  { keyword: 'AI', page: 1 },
  { keyword: 'ML', page: 1 },
]);
```

## 消费者使用

```typescript
import { useQueue } from '@sker/mq';
import { filter, map, mergeMap, bufferTime, tap } from 'rxjs';

const queue = useQueue<TaskMessage>('task_queue');

// RxJS 管道处理
queue.consumer$.pipe(
  // 过滤
  filter(env => env.message.page === 1),

  // 转换
  map(env => env.message.keyword),

  // 并发处理（并发度 5）
  mergeMap(keyword => processKeyword(keyword), 5),

  // 批量聚合（每 5 秒）
  bufferTime(5000),

  // 日志
  tap(batch => console.log(`处理批次: ${batch.length} 条`))
).subscribe({
  next: result => console.log('成功:', result),
  error: err => console.error('失败:', err)
});
```

## 手动 ACK 模式

```typescript
queue.consumer$.pipe(
  tap(envelope => {
    try {
      processMessage(envelope.message);
      envelope.ack();  // 确认消费
    } catch (error) {
      if (isRetryable(error)) {
        envelope.nack(true);   // 重新入队
      } else {
        envelope.nack(false);  // 不重新入队
      }
    }
  })
).subscribe();
```

## 常用 RxJS 操作符

- `mergeMap(fn, concurrency)`: 并发处理
- `bufferTime(ms)`: 时间窗口批量
- `bufferCount(n)`: 数量批量
- `retry(n)`: 错误重试
- `catchError(fn)`: 错误处理
- `filter(fn)`: 过滤消息
- `tap(fn)`: 副作用（日志等）

## 错误处理

```typescript
import { NoRetryError } from '@sker/core';

// 不可重试错误
if (invalidData) {
  throw new NoRetryError('数据格式错误');
}

// 消费者中检测
queue.consumer$.pipe(
  tap(envelope => {
    try {
      // 处理逻辑
    } catch (error) {
      if (error instanceof NoRetryError) {
        envelope.nack(false);  // 不重试
      } else {
        envelope.nack(true);   // 可重试
      }
    }
  })
).subscribe();
```

## 启动消费者

```typescript
// apps/api/src/main.ts
import { startPostNLPConsumer } from './consumers/nlp.consumer';

async function bootstrap() {
  // ... 初始化

  // 启动消费者
  startPostNLPConsumer();

  // ... 启动服务
}
```

## 关键要点

1. **手动 ACK 模式必须处理 ack/nack**
2. **使用 `mergeMap` 控制并发度**
3. **`nack(true)` 重新入队，`nack(false)` 丢弃**
4. **`NoRetryError` 标记不可重试错误**
5. **确保队列配置为 durable 防止消息丢失**

## 参考实现

- `apps/api/src/consumers/nlp.consumer.ts`
- `packages/mq/src/hooks.ts`
