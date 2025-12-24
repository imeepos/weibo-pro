# 爬虫任务调度系统

基于 @sker/mq 的分布式爬虫任务调度系统。

## 核心组件

### TaskQueue - 任务队列管理

封装 RabbitMQ 队列操作，支持任务优先级。

```typescript
import { TaskQueue } from '@sker/crawler-core';

const queue = new TaskQueue('weibo_crawl_queue', 10); // 最大优先级 10

// 推送单个任务
await queue.push({
  id: 'task-001',
  type: 'search',
  payload: { keyword: 'AI', page: 1 },
  priority: 5,
});

// 批量推送
await queue.pushBatch([
  { id: 'task-002', type: 'search', payload: { keyword: 'ML', page: 1 } },
  { id: 'task-003', type: 'search', payload: { keyword: 'DL', page: 1 } },
]);
```

### TaskConsumer - 任务消费者

从队列消费任务并执行处理器，支持并发控制和自动 ACK/NACK。

```typescript
import { TaskConsumer } from '@sker/crawler-core';

const consumer = new TaskConsumer(queue, 5); // 并发数 5

// 注册处理器
consumer.register('search', async (task) => {
  console.log('处理搜索任务:', task.payload);
  // 执行爬虫逻辑
});

consumer.register('detail', async (task) => {
  console.log('处理详情任务:', task.payload);
});

// 启动消费
consumer.start();
```

### TaskScheduler - 定时任务调度器

基于 Cron 表达式的定时任务调度。

```typescript
import { TaskScheduler } from '@sker/crawler-core';

const scheduler = new TaskScheduler(queue);

// 每天凌晨 2 点执行
scheduler.add({
  name: 'daily-crawl',
  cron: '0 2 * * *',
  taskType: 'search',
  payload: { keyword: 'AI', page: 1 },
  enabled: true,
});

// 每小时执行
scheduler.add({
  name: 'hourly-crawl',
  cron: '0 * * * *',
  taskType: 'search',
  payload: { keyword: 'ML', page: 1 },
});

// 控制定时任务
scheduler.disable('hourly-crawl');
scheduler.enable('hourly-crawl');
scheduler.remove('daily-crawl');
scheduler.stopAll();
```

## 任务状态

```typescript
enum TaskStatus {
  PENDING = 'pending',     // 待处理
  RUNNING = 'running',     // 执行中
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed',       // 失败
}
```

## 完整示例

```typescript
import {
  TaskQueue,
  TaskConsumer,
  TaskScheduler,
  type CrawlerTask,
} from '@sker/crawler-core';

// 1. 创建队列
const queue = new TaskQueue('weibo_crawl_queue', 10);

// 2. 创建消费者
const consumer = new TaskConsumer(queue, 5);

consumer.register('search', async (task) => {
  const { keyword, page } = task.payload;
  // 执行搜索爬虫
  console.log(`搜索关键词: ${keyword}, 页码: ${page}`);
});

consumer.start();

// 3. 创建定时任务
const scheduler = new TaskScheduler(queue);

scheduler.add({
  name: 'daily-crawl',
  cron: '0 2 * * *',
  taskType: 'search',
  payload: { keyword: 'AI', page: 1 },
});

// 4. 手动推送任务
await queue.push({
  id: 'manual-task-001',
  type: 'search',
  payload: { keyword: 'Machine Learning', page: 1 },
  priority: 8,
});
```

## 架构特点

- **分布式**: 基于 RabbitMQ，支持多个 worker 并行处理
- **优先级**: 支持任务优先级队列
- **可靠性**: 自动 ACK/NACK，失败任务自动重试
- **定时调度**: 支持 Cron 表达式定时任务
- **状态追踪**: 自动追踪任务状态（pending → running → completed/failed）
- **最小化**: 只实现核心功能，代码简洁高效
