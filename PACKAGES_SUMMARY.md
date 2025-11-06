# Sker Monorepo 包详解

## 包结构总览

```
@sker (13个包)
├── 基础设施层
│   ├── @sker/core                    # DI 容器核心
│   └── @sker/typescript-config       # TS 配置共享
├── 基础服务层
│   ├── @sker/redis                   # Redis 客户端
│   ├── @sker/mq                      # RabbitMQ 客户端
│   ├── @sker/nlp                     # LLM 客户端（OpenAI API）
│   └── @sker/entities                # TypeORM 数据模型
├── 工作流引擎层
│   ├── @sker/workflow                # 工作流引擎核心
│   ├── @sker/workflow-ast            # 工作流节点定义
│   └── @sker/workflow-run            # 后端运行时实现
├── UI 组件层
│   ├── @sker/ui                      # 基础组件库
│   ├── @sker/design                  # 设计系统（大屏可视化）
│   └── @sker/workflow-ui             # 工作流编辑器
└── 应用层
    ├── @sker/agent                   # AI Agent（LangChain）
    └── @sker/workflow-browser        # 浏览器运行时
```

## 核心包详解

### 1. @sker/core 依赖注入系统

**核心功能**：提供类型安全的 DI 容器，支持多层级注入器。

**主要导出**：
- `EnvironmentInjector`, `Injector` - DI 容器
- `@Injectable`, `@Inject` - 装饰器
- `createRootInjector()`, `createPlatformInjector()`, `createApplicationInjector()`, `createFeatureInjector()` - 工厂函数

**关键特性**：
1. 四层级注入器：Root（全局单例）> Platform（全局单例）> Application > Feature
2. 自动解析 `@Injectable({ providedIn: 'root' })` 的服务
3. 支持多种 Provider：值、类、工厂函数、现有对象
4. 内置循环依赖检测
5. 参数装饰器：`@Optional`, `@Self`, `@SkipSelf`, `@Host`

**示例**：
```typescript
import { createInjector, Injectable, Inject } from '@sker/core';

@Injectable({ providedIn: 'root' })
class UserService {
  getUsers() { return ['user1', 'user2']; }
}

const injector = createInjector([
  { provide: 'API_URL', useValue: 'https://api.example.com' }
]);

const userService = injector.get(UserService);
```

---

### 2. @sker/workflow 工作流引擎

**核心功能**：基于 AST 和访问者模式的通用工作流执行引擎。

**主要导出**：
- `Ast`, `WorkflowGraphAst`, `ArrayIteratorAst` - 节点基类
- `execute()`, `executeAst()` - 执行函数
- `WorkflowScheduler` - 调度器
- `DependencyAnalyzer` - 依赖分析
- `DataFlowManager` - 数据流管理

**关键特性**：
1. 完整的 AST 节点和边定义（数据边和控制边）
2. 访问者模式执行，支持自定义 Visitor
3. DAG 拓扑排序，支持并行执行
4. 完整的状态管理和数据流传递
5. 可序列化/反序列化为 JSON

---

### 3. @sker/workflow-ast 工作流节点定义

**核心功能**：定义特定域的工作流节点（微博、NLP、事件等）。

**主要导出**：
- `WeiboAjaxFeedHotTimelineAst` - 微博热闻
- `PostContextCollectorAst` - 内容收集
- `PostNLPAnalyzerAst` - NLP 分析
- `EventAutoCreatorAst` - 事件创建

**关键特性**：
1. 每个节点继承 `Ast` 基类
2. 使用 `@Node`, `@Input`, `@Output` 装饰器定义元数据
3. 与 @sker/nlp、@sker/workflow-run 集成
4. 支持 JSON 序列化

**示例**：
```typescript
@Node({ title: "帖子上下文收集器" })
export class PostContextCollectorAst extends Ast {
  @Input({ title: "帖子 ID" })
  postId: string;
  
  @Output({ title: "上下文数据" })
  context: PostContext;
  
  type: 'PostContextCollectorAst' = 'PostContextCollectorAst';
}
```

---

### 4. @sker/workflow-run 后端运行时

**核心功能**：实现工作流节点的实际执行逻辑（Visitor 模式）。

**主要导出**：
- `PostContextCollectorVisitor` - 内容收集执行器
- `PostNLPAnalyzerVisitor` - NLP 分析执行器
- `EventAutoCreatorVisitor` - 事件创建执行器
- `startPostNLPConsumer()` - MQ 消费者启动

**关键特性**：
1. 实现 AST 节点的 Visitor 接口
2. 使用 Cheerio 进行 HTML 解析
3. 使用 Playwright 进行浏览器自动化
4. 集成数据库持久化和 NLP 分析
5. 支持异步消息队列消费

---

### 5. @sker/redis Redis 客户端

**核心功能**：ioredis 包装器，支持完整的 Redis 操作。

**主要导出**：
- `RedisClient` - Redis 客户端
- `RedisPipeline` - 管道支持
- `redisConfigFactory()` - 配置工厂

**关键特性**：
1. 支持所有 Redis 数据结构（String, Hash, Set, Sorted Set, List）
2. 管道（Pipeline）支持批量操作
3. JSON 自动序列化/反序列化
4. 从 `REDIS_URL` 环境变量读取配置

**示例**：
```typescript
import { RedisClient } from '@sker/redis';

const redis = new RedisClient(...);
await redis.set('key', { data: 'value' }, 3600); // TTL 1小时
const data = await redis.get('key');
```

---

### 6. @sker/mq RabbitMQ 消息队列

**核心功能**：RabbitMQ 客户端，RxJS 双 Observable 架构。

**主要导出**：
- `useQueue()` - 唯一推荐的使用方式
- `ConnectionPool` - 连接池管理
- `QueueManager`, `QueueProducer` - 类型定义

**关键特性**：
1. 唯一入口 `useQueue` Hook 隐藏复杂度
2. RxJS 双 Observable：发布流和消费流分离
3. 全局单例连接池，自动重连
4. 灵活的消费选项和重试策略

**示例**：
```typescript
import { useQueue } from '@sker/mq';

const { publish$, consume$ } = useQueue('my-queue');

// 发布消息
publish$.next({ data: 'message' });

// 消费消息
consume$.subscribe(msg => console.log(msg));
```

---

### 7. @sker/nlp LLM 客户端

**核心功能**：OpenAI API 兼容的 LLM 客户端，一次调用获取完整分析结果。

**主要导出**：
- `NLPAnalyzer` - NLP 分析器
- `useOpenAi()` - OpenAI 客户端工厂
- `CompleteAnalysisResult`, `PostContext` - 类型定义

**关键特性**：
1. 一次调用获取：情感分析 + 关键词提取 + 事件分类 + 标签
2. 支持 OpenAI 兼容的 LLM（DeepSeek 等）
3. 上下文感知的智能提示词
4. JSON 自动解析

**示例**：
```typescript
import { NLPAnalyzer } from '@sker/nlp';

const analyzer = new NLPAnalyzer();
const result = await analyzer.analyze(context, categories, tags);
// result 包含 sentiment, keywords, event, tags
```

---

### 8. @sker/entities 数据模型

**核心功能**：TypeORM 实体定义，业务数据模型。

**主要导出**：
- Weibo 系列：`WeiboUserEntity`, `WeiboPostEntity`, `WeiboCommentEntity`
- Event 系列：`EventEntity`, `EventCategoryEntity`, `EventTagEntity`
- Workflow 系列：`WorkflowEntity`, `WorkflowRunEntity`, `WorkflowRunLogEntity`

**关键特性**：
1. 完整的微博数据模型（用户、帖子、评论、转发、喜欢）
2. 事件管理模型（事件、分类、标签、统计）
3. 工作流追踪模型（工作流、日程、运行记录）
4. TypeORM 原生集成

---

### 9. @sker/workflow-ui 工作流编辑器

**核心功能**：React Flow 基础的工作流可视化编辑器。

**主要导出**：
- `WorkflowCanvas` - 工作流画布
- `NodePalette` - 节点调色板
- `PropertyPanel` - 属性面板
- Hooks：`useWorkflow()`, `useWorkflowStore()`, `useSelectionStore()`
- 适配器：`astToFlow()`, `flowToAst()`

**关键特性**：
1. 完整的编辑器 UI（画布、调色板、属性面板）
2. 交互式节点图编辑（拖拽、连接、删除）
3. AST 和流图双向转换
4. Zustand 状态管理

---

### 10. @sker/agent AI Agent

**核心功能**：LangChain + LangGraph AI 工作流编排。

**主要导出**：
- `ResearchAgent` - 研究 Agent
- `OpinionAgent` - 舆情分析 Agent
- `tools` - 工具函数

**关键特性**：
1. LangChain + LangGraph 工作流编排
2. 支持工具调用和多步骤推理
3. 与 @sker/nlp、@sker/workflow-run 集成
4. 数据库持久化

---

## 核心设计模式

| 模式 | 使用 | 例子 |
|-----|------|------|
| **依赖注入** | 所有包通过 @sker/core DI | `@Injectable()`, `Inject()` |
| **装饰器** | 元数据定义 | `@Node`, `@Input`, `@Output`, `@Injectable` |
| **访问者模式** | 工作流执行 | `Visitor` + `Ast` |
| **Observable** | 消息队列异步 | RxJS `Subject`, `Observable` |
| **单例模式** | 全局共享资源 | Redis 连接、MQ 连接池 |
| **工厂模式** | 复杂对象创建 | Provider `useFactory` |

---

## 推荐导入方式

```typescript
// DI 核心
import { createInjector, Injectable, Inject } from '@sker/core';

// 工作流执行
import { execute, Ast, WorkflowGraphAst } from '@sker/workflow';
import { PostNLPAnalyzerAst } from '@sker/workflow-ast';
import { PostNLPAnalyzerVisitor } from '@sker/workflow-run';

// 基础服务
import { RedisClient } from '@sker/redis';
import { useQueue } from '@sker/mq';
import { NLPAnalyzer } from '@sker/nlp';

// 数据模型
import { WeiboPostEntity, EventEntity, WorkflowRunEntity } from '@sker/entities';

// 前端编辑器
import { WorkflowCanvas, useWorkflow, astToFlow } from '@sker/workflow-ui';

// AI Agent
import { ResearchAgent, OpinionAgent } from '@sker/agent';
```

---

## 依赖关系可视化

```
@sker/core                    (基础DI容器)
│
├─→ @sker/workflow           (工作流引擎)
│   └─→ @sker/workflow-ast   (AST定义)
│       ├─→ @sker/nlp        (LLM客户端)
│       └─→ @sker/workflow-run (后端运行时)
│           ├─→ @sker/entities (数据模型)
│           ├─→ @sker/redis
│           └─→ @sker/mq
│
├─→ @sker/redis
├─→ @sker/mq
├─→ @sker/nlp
├─→ @sker/entities
│
├─→ @sker/workflow-ui        (前端编辑器)
│   ├─→ @sker/workflow
│   └─→ React Flow
│
├─→ @sker/design             (UI组件库)
│   └─→ React 19
│
├─→ @sker/ui                 (基础组件)
│   └─→ React 19
│
├─→ @sker/agent              (AI Agent)
│   ├─→ @sker/nlp
│   ├─→ @sker/workflow-run
│   ├─→ @sker/entities
│   └─→ LangChain + LangGraph
│
└─→ @sker/typescript-config   (TS配置共享)
```

---

## 快速开始

### 创建工作流节点

```typescript
import { Ast, Input, Output, Node } from '@sker/workflow';

@Node({ title: "我的节点" })
export class MyCustomAst extends Ast {
  @Input({ title: "输入数据" })
  input: string;
  
  @Output({ title: "输出数据" })
  output: string;
  
  type: 'MyCustomAst' = 'MyCustomAst';
}
```

### 实现节点执行器

```typescript
import { Visitor } from '@sker/workflow';
import { MyCustomAst } from './MyCustomAst';

export class MyCustomVisitor implements Visitor {
  async visit(ast: MyCustomAst, ctx: any): Promise<void> {
    ast.output = ast.input.toUpperCase();
  }
}
```

### 执行工作流

```typescript
import { execute, WorkflowGraphAst } from '@sker/workflow';

const workflow = new WorkflowGraphAst();
workflow.name = '我的工作流';
workflow.addNode(new MyCustomAst());

await execute(workflow, new MyCustomVisitor(), {});
```

---

## 文件位置

所有包都位于 `/home/ubuntu/worktrees/demo/sker/packages/` 目录下。

JSON 格式的详细信息：
- `/home/ubuntu/worktrees/demo/sker/PACKAGES_INFO.json`

