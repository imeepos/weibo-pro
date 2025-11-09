# 🚀 Broker 应用 - 爬虫任务调度中心

基于 `@sker/workflow-run` 构建的分布式爬虫任务调度系统，统一管理所有爬虫任务的发布、调度和分发。

## 🎯 核心功能

- **任务定义**: 统一的爬虫任务类型和数据格式
- **智能调度**: 基于优先级的任务调度算法
- **队列管理**: 动态的 RabbitMQ 队列管理
- **工作流集成**: 与现有 AST 工作流系统无缝集成
- **监控告警**: 完整的系统监控和性能指标
- **配置管理**: 动态配置和热重载支持

## 🏗️ 系统架构

### 核心组件

1. **TaskScheduler** - 任务调度器
   - 智能的任务优先级调度
   - 批量处理和并发控制
   - 完整的任务生命周期管理

2. **QueueManager** - 队列管理器
   - 统一的 RabbitMQ 队列管理
   - 动态队列创建和配置
   - 实时队列状态监控

3. **TaskRouter** - 任务路由器
   - 智能的任务路由算法
   - 负载均衡和故障转移
   - 动态路由策略配置

4. **WorkflowTaskAdapter** - 工作流适配器
   - AST 工作流到任务的自动转换
   - 与现有工作流系统集成
   - 统一的任务执行接口

5. **MonitorIntegrator** - 监控集成器
   - 性能指标收集和告警
   - 系统健康状态监控
   - 与现有监控系统集成

## 🔄 实现计划

### 阶段一：基础架构 (1-2天)

#### 1. 项目初始化和配置
- [ ] 创建 package.json 和依赖配置
- [ ] 设置 TypeScript 和构建配置
- [ ] 配置 NestJS 应用框架

#### 2. 核心类型定义
- [ ] 定义 `CrawlTaskType` 枚举
- [ ] 创建 `CrawlTask` 接口
- [ ] 定义 API 请求/响应类型

#### 3. 数据库实体
- [ ] 创建 `CrawlTaskEntity`
- [ ] 创建 `TaskExecutionEntity`
- [ ] 配置数据库连接

### 阶段二：核心服务 (2-3天)

#### 4. 队列管理器
- [ ] 实现 `QueueManager` 服务
- [ ] 配置 RabbitMQ 连接池
- [ ] 实现队列创建和管理

#### 5. 任务调度器
- [ ] 实现 `TaskScheduler` 服务
- [ ] 添加任务提交和状态查询
- [ ] 实现批量任务处理

#### 6. API 控制器
- [ ] 创建 `BrokerController`
- [ ] 实现任务提交 API
- [ ] 实现状态查询 API

### 阶段三：智能功能 (2-3天)

#### 7. 任务路由器
- [ ] 实现 `TaskRouter` 服务
- [ ] 添加负载均衡策略
- [ ] 实现动态路由配置

#### 8. 工作流集成
- [ ] 创建 `WorkflowTaskAdapter`
- [ ] 实现 AST 到任务的转换
- [ ] 集成现有工作流系统

#### 9. 监控集成
- [ ] 实现 `MonitorIntegrator`
- [ ] 添加性能指标收集
- [ ] 集成告警系统

### 阶段四：高级特性 (1-2天)

#### 10. 配置管理
- [ ] 实现 `ConfigManager`
- [ ] 添加热重载支持
- [ ] 实现配置验证

#### 11. 测试和文档
- [ ] 编写单元测试
- [ ] 创建集成测试
- [ ] 完善 API 文档

## 📁 项目结构

```
apps/broker/
├── src/
│   ├── entities/                    # 数据库实体
│   │   ├── crawl-task.entity.ts     # 爬虫任务实体
│   │   └── task-execution.entity.ts # 任务执行记录实体
│   ├── services/                    # 核心服务
│   │   ├── task-scheduler.service.ts        # 任务调度器
│   │   ├── queue-manager.service.ts         # 队列管理器
│   │   ├── task-router.service.ts           # 任务路由器
│   │   ├── workflow-adapter.service.ts      # 工作流适配器
│   │   ├── monitor-integrator.service.ts    # 监控集成器
│   │   └── config-manager.service.ts        # 配置管理器
│   ├── controllers/                 # API 控制器
│   │   ├── broker.controller.ts     # 主控制器
│   │   └── status.controller.ts     # 状态控制器
│   ├── types/                       # 类型定义
│   │   ├── crawl-task.types.ts      # 任务类型定义
│   │   ├── queue.types.ts           # 队列类型定义
│   │   └── api.types.ts             # API 类型定义
│   ├── config/                      # 配置
│   │   ├── broker.config.ts         # 主配置
│   │   └── queue.config.ts          # 队列配置
│   ├── utils/                       # 工具函数
│   │   ├── task-id.generator.ts     # 任务ID生成器
│   │   └── validation.utils.ts      # 验证工具
│   ├── main.ts                      # 应用入口
│   └── dependencies.ts              # 依赖注入配置
├── test/                            # 测试文件
├── package.json                     # 项目配置
├── tsconfig.json                    # TypeScript 配置
└── README.md                        # 项目文档
```

## 🛠️ 技术栈

### 核心框架
- **NestJS** - 企业级 Node.js 框架
- **TypeORM** - 数据库 ORM
- **@sker/mq** - 消息队列（复用现有）

### 数据库
- **PostgreSQL** - 主数据库（复用现有）
- **Redis** - 缓存和状态存储（复用现有）

### 消息队列
- **RabbitMQ** - 消息代理（复用现有）
- **RxJS** - 响应式编程（复用现有）

### 监控和日志
- **现有监控系统** - 复用工作流监控
- **结构化日志** - 统一的日志格式

## 🎯 任务定义

### 爬虫任务类型
```typescript
enum CrawlTaskType {
  // 微博相关任务
  WEIBO_HOT_TIMELINE = 'weibo_hot_timeline',
  WEIBO_KEYWORD_SEARCH = 'weibo_keyword_search',
  WEIBO_USER_PROFILE = 'weibo_user_profile',
  WEIBO_POST_DETAIL = 'weibo_post_detail',
  WEIBO_COMMENTS = 'weibo_comments',
  WEIBO_REPOSTS = 'weibo_reposts',

  // 其他平台任务（可扩展）
  DOUYIN_TRENDING = 'douyin_trending',
  ZHIHU_HOT = 'zhihu_hot',
}
```

### 任务数据结构
```typescript
interface CrawlTask {
  id: string;                    // 任务唯一标识
  type: CrawlTaskType;           // 任务类型
  payload: any;                  // 任务负载数据
  priority: number;              // 优先级 (1-10, 10最高)
  maxRetries: number;            // 最大重试次数
  retryDelay: number;            // 重试延迟(ms)
  createdAt: Date;               // 创建时间
  scheduledAt?: Date;            // 计划执行时间
  metadata?: Record<string, any>; // 元数据
}
```

## 🔧 API 设计

### 任务提交 API
```typescript
POST /api/broker/tasks
{
  "type": "weibo_hot_timeline",
  "payload": { "count": 20, "refresh": 1 },
  "priority": 8,
  "maxRetries": 3
}
```

### 批量提交 API
```typescript
POST /api/broker/tasks/batch
{
  "tasks": [
    { "type": "weibo_hot_timeline", "payload": {...} },
    { "type": "weibo_keyword_search", "payload": {...} }
  ]
}
```

### 状态查询 API
```typescript
GET /api/broker/tasks/:taskId

Response:
{
  "id": "task_123",
  "status": "running",
  "progress": 50,
  "createdAt": "2024-01-01T00:00:00Z",
  "startedAt": "2024-01-01T00:01:00Z",
  "executions": [...]
}
```

### 系统状态 API
```typescript
GET /api/broker/status

Response:
{
  "queues": {
    "weibo_hot_timeline_queue": {
      "messageCount": 15,
      "consumerCount": 2,
      "state": "running"
    }
  },
  "tasks": {
    "pending": 25,
    "running": 10,
    "completed": 150,
    "failed": 5
  },
  "system": {
    "uptime": "2h 30m",
    "memoryUsage": "45%",
    "cpuUsage": "12%"
  }
}
```

## ⚙️ 配置管理

### 队列配置
```typescript
{
  queues: {
    weibo_hot_timeline: {
      name: 'weibo_hot_timeline_queue',
      prefetch: 5,
      durable: true,
      maxRetries: 3,
    },
    weibo_keyword_search: {
      name: 'weibo_keyword_search_queue',
      prefetch: 3,
      durable: true,
      maxRetries: 5,
    },
  }
}
```

### 调度配置
```typescript
{
  scheduler: {
    maxConcurrentTasks: 50,
    taskTimeout: 300000, // 5分钟
    retryDelay: 5000,    // 5秒
  }
}
```

### 监控配置
```typescript
{
  monitoring: {
    metricsInterval: 60000, // 1分钟
    alertThresholds: {
      queueSize: 1000,
      errorRate: 0.1,      // 10%
      avgProcessingTime: 30000, // 30秒
    },
  }
}
```

## 🎨 设计理念

### 存在即合理
- 复用现有的消息队列和工作流基础设施
- 每个组件都有明确的不可替代的职责
- 消除重复代码和冗余功能

### 优雅即简约
- 代码自文档化，命名清晰表达意图
- 统一的错误处理和状态管理
- 清晰的 API 设计和响应格式

### 性能即艺术
- 智能的任务调度算法
- 高效的批量处理机制
- 优雅的资源控制和负载均衡

## 🚀 快速开始

### 开发环境
```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建项目
pnpm build

# 运行测试
pnpm test
```

### 生产部署
```bash
# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

## 🔗 集成指南

### 与工作流系统集成
```typescript
import { WorkflowTaskAdapter } from './services/workflow-adapter.service';

// 将 AST 转换为任务
const task = await workflowAdapter.astToTask(ast);

// 提交任务
const taskId = await taskScheduler.submitTask(task);
```

### 与监控系统集成
```typescript
import { MonitorIntegrator } from './services/monitor-integrator.service';

// 记录任务指标
await monitorIntegrator.recordTaskMetrics({
  taskId: 'task_123',
  executionTime: 1500,
  success: true,
  queueTime: 200
});
```

## 📊 监控指标

### 性能指标
- 任务执行时间分布
- 队列等待时间
- 错误率和重试次数
- 系统资源使用率

### 业务指标
- 各类型任务数量
- 任务成功率
- 平均处理时间
- 队列积压情况

## 🤝 贡献指南

欢迎贡献代码和改进建议！请遵循以下原则：

1. **存在即合理** - 每个改动都有明确目的
2. **优雅即简约** - 代码清晰、简洁、自文档化
3. **性能即艺术** - 优化同时保持代码美观

## 📄 许可证

本项目基于现有 @sker/workflow-run 架构构建，遵循相同的许可证条款。