# Crawler 应用

**存在即合理**：专注于消费 MQ 任务并执行爬虫工作流的独立服务。

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     Crawler 应用层                           │
│  职责：监听 MQ 队列，执行爬虫工作流                          │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                    ▼         ▼         ▼
         ┌──────────────┬──────────────┬──────────────┐
         │  @sker/mq    │ @sker/workflow│@sker/workflow│
         │  消息队列     │  工作流引擎   │    -run      │
         │              │              │  Visitor实现  │
         └──────────────┴──────────────┴──────────────┘
```

## 核心职责

**监听 RabbitMQ 爬取队列 → 执行爬虫工作流 → 处理结果**

与 `Broker`（发布任务）形成完美互补：
- **Broker**：接收 API 请求，将爬取任务发布到 MQ
- **Crawler**：从 MQ 消费任务并执行爬取

## 目录结构

```
apps/crawler/
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
├── src/
│   ├── main.ts          # 应用入口
│   ├── consumers/       # 消费者定义
│   │   ├── weibo-search.consumer.ts
│   │   ├── weibo-detail.consumer.ts
│   │   └── index.ts
│   └── config/          # 队列配置
│       └── queues.ts
└── readme.md
```

## 可复用的基础设施

项目已有的完整基础设施（无需重复造轮子）：

### 1. 消息队列系统 (`@sker/mq`)
```typescript
useQueue<TaskType>('queue_name')
  .consumer$ // Observable 消费流
  .producer.next(task) // 发布任务
```

### 2. 工作流引擎 (`@sker/workflow`)
```typescript
execute(workflowAst, context)
```

### 3. 爬虫 Visitor 实现 (`@sker/workflow-run`)
已实现的爬虫能力：
- `WeiboKeywordSearchAstVisitor` - 微博关键词搜索
- `WeiboAjaxStatusesShowAstVisitor` - 微博详情
- `WeiboAjaxStatusesCommentAstVisitor` - 评论爬取
- `WeiboAjaxStatusesRepostTimelineAstVisitor` - 转发爬取
- `PostNLPAnalyzerVisitor` - NLP 分析
- `PlaywrightService` - Playwright 浏览器服务

### 4. 数据实体 (`@sker/entities`)
- `WeiboPostEntity` - 微博帖子实体

### 5. 依赖注入容器 (`@sker/core`)
- 完整的 IoC 容器支持

## 核心实现

### 应用入口 (`src/main.ts`)
```typescript
import 'reflect-metadata';
import { root } from '@sker/core';
import { registerMqQueueConfig } from '@sker/mq';
import { startWeiboSearchConsumer } from './consumers/weibo-search.consumer';
import { startWeiboDetailConsumer } from './consumers/weibo-detail.consumer';
import { queueConfigs } from './config/queues';

async function bootstrap() {
  console.log('[Crawler] 启动爬虫服务...');

  // 注册队列配置
  queueConfigs.forEach(registerMqQueueConfig);

  // 启动所有消费者
  const consumers = [
    startWeiboSearchConsumer(),
    startWeiboDetailConsumer(),
  ];

  console.log(`[Crawler] ${consumers.length} 个消费者已启动`);

  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('[Crawler] 收到终止信号，优雅关闭...');
    consumers.forEach(c => c.stop());
    process.exit(0);
  });
}

bootstrap().catch(console.error);
```

### 队列配置 (`src/config/queues.ts`)
```typescript
import type { MqQueueConfig } from '@sker/mq';

export const queueConfigs: MqQueueConfig[] = [
  {
    queue: 'weibo_search_queue',
    dlq: 'weibo_search_queue.dlq',
    queueOptions: {
      durable: true,
      messageTtl: 1800000, // 30分钟
      deadLetterExchange: '',
      deadLetterRoutingKey: 'weibo_search_queue.dlq',
    },
  },
  {
    queue: 'weibo_detail_queue',
    dlq: 'weibo_detail_queue.dlq',
    queueOptions: {
      durable: true,
      messageTtl: 900000, // 15分钟
    },
  },
];
```

### 搜索消费者 (`src/consumers/weibo-search.consumer.ts`)
```typescript
import { mergeMap, tap, retry } from 'rxjs';
import { root } from '@sker/core';
import { useQueue } from '@sker/mq';
import { execute } from '@sker/workflow';
import { WeiboKeywordSearchAst } from '@sker/workflow-ast';
import {
  WeiboKeywordSearchAstVisitor,
  PlaywrightService,
  WeiboAccountService
} from '@sker/workflow-run';

export interface WeiboSearchTask {
  keyword: string;
  startDate: string;
  endDate: string;
  page?: number;
}

// 注册依赖
root.set([
  { provide: WeiboKeywordSearchAstVisitor, useClass: WeiboKeywordSearchAstVisitor },
  { provide: PlaywrightService, useClass: PlaywrightService },
  { provide: WeiboAccountService, useClass: WeiboAccountService },
]);

export function startWeiboSearchConsumer() {
  const queue = useQueue<WeiboSearchTask>('weibo_search_queue');

  console.log('[WeiboSearchConsumer] 消费者启动');
  console.log(`  队列: ${queue.queueName}`);
  console.log(`  死信队列: ${queue.dlqName}`);

  const subscription = queue.consumer$
    .pipe(
      tap(envelope => {
        const { keyword, startDate, endDate } = envelope.message;
        console.log(`[WeiboSearchConsumer] 接收任务: ${keyword} [${startDate} ~ ${endDate}]`);
      }),
      mergeMap(
        async envelope => {
          const task = envelope.message;

          // 构建工作流 AST
          const ast = new WeiboKeywordSearchAst();
          ast.keyword = task.keyword;
          ast.startDate = task.startDate;
          ast.endDate = task.endDate;
          ast.page = task.page;

          // 执行工作流
          const result = await execute(ast, {});

          if (result.state === 'success') {
            console.log(`[WeiboSearchConsumer] 任务成功: ${task.keyword}`);
            envelope.ack();
          } else {
            console.error(`[WeiboSearchConsumer] 任务失败: ${task.keyword}`, result.error);
            envelope.nack(false); // 移入死信队列
          }

          return result;
        },
        5 // 并发数
      ),
      retry({
        count: 2,
        delay: 3000,
      })
    )
    .subscribe({
      error: err => console.error('[WeiboSearchConsumer] 异常:', err),
      complete: () => console.log('[WeiboSearchConsumer] 已关闭'),
    });

  return {
    subscription,
    stop: () => subscription.unsubscribe(),
  };
}
```

## 工作流程

```
1. Broker 发布任务到 MQ
        ↓
2. Crawler 消费任务
        ↓
3. 执行工作流 AST (Visitor 模式)
        ↓
4. 结果处理
        ├─ 成功 → ACK
        └─ 失败 → NACK → DLQ
```

## 设计亮点

### 存在即合理
1. **唯一职责**：消费 MQ 队列 → 执行爬虫工作流
2. **最小依赖**：完全复用现有基础设施，零重复代码
3. **清晰边界**：与 Broker、API 各司其职

### 优雅即简约
1. **无状态服务**：每个任务独立处理，易于水平扩展
2. **声明式配置**：队列配置集中管理
3. **RxJS 流式处理**：优雅的异步流控制

### 性能即艺术
1. **并发控制**：`mergeMap(_, 5)` 控制并发数
2. **连接复用**：Playwright 浏览器实例共享
3. **优雅关闭**：SIGTERM 信号处理，确保任务不丢失

### 错误处理哲学
1. **重试策略**：自动重试 2 次，延迟 3 秒
2. **死信队列**：失败任务进入 DLQ，可追溯
3. **幂等设计**：支持任务重复执行

## 为什么 Crawler 和 Broker 分离？

| 维度 | Crawler (消费者) | Broker (生产者) |
|------|------------------|-----------------|
| **职责** | 监听队列，执行爬取 | 接收 API 请求，发布任务 |
| **触发方式** | MQ 消息驱动 | HTTP API 驱动 |
| **扩展性** | 可独立水平扩展 | 可独立水平扩展 |
| **依赖** | 需要 Playwright | 无需浏览器 |
| **资源消耗** | CPU/内存密集 | 轻量级 |

## 后续扩展

当需要支持更多爬虫类型时，只需：

1. 在 `consumers/` 目录添加新消费者
2. 在 `config/queues.ts` 注册新队列
3. 在 `main.ts` 启动新消费者

**代码即文档，无需额外文档**

## 命令

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 生产启动
pnpm start
```

## 环境变量

```bash
# RabbitMQ 连接
RABBITMQ_URL=amqp://admin:password@localhost:5672

# 数据库连接
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis 连接
REDIS_URL=redis://:password@localhost:6379
```
