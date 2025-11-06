# Sker Monorepo 包探索指南

## 快速开始

本文档为 Sker 项目 12 个核心包的完整探索结果。所有信息已导出为两种格式：

### 文件位置
- **JSON 格式**（可编程式访问）：`./PACKAGES_INFO.json`
- **Markdown 格式**（详细说明）：`./PACKAGES_SUMMARY.md`
- **本指南**：`./PACKAGES_GUIDE.md`

---

## 12 个包概览

### 第一层：基础设施

#### 1. @sker/core
**依赖注入系统核心**

关键导出：`createInjector`, `Injectable`, `createRootInjector`, `createPlatformInjector`, `createApplicationInjector`, `createFeatureInjector`

特点：
- 四层级注入器（Root > Platform > Application > Feature）
- 自动解析 `providedIn: 'root'` 的服务
- 内置循环依赖检测
- 参数装饰器支持（Optional, Self, SkipSelf, Host）

位置：`packages/core/src/`
主要文件：
- `environment-injector.ts` - 环境注入器实现
- `injector.ts` - 基础注入器接口
- `injectable.ts` - Injectable 装饰器
- `provider.ts` - Provider 类型定义

---

### 第二层：基础服务

#### 2. @sker/redis
**Redis 客户端包装器**

关键导出：`RedisClient`, `RedisPipeline`, `redisConfigFactory`

特点：
- 支持全部 Redis 数据结构
- Pipeline 支持批量操作
- JSON 自动序列化
- REDIS_URL 环境变量配置

位置：`packages/redis/src/`
主要文件：
- `index.ts` - RedisClient 和 RedisPipeline 实现

#### 3. @sker/mq
**RabbitMQ 消息队列**

关键导出：`useQueue`, `ConnectionPool`, 类型定义

特点：
- 唯一入口 `useQueue` Hook
- RxJS 双 Observable 架构
- 全局单例连接池
- 自动重连和重试策略

位置：`packages/mq/src/`
主要文件：
- `hooks.ts` - useQueue Hook 实现
- `connection-pool.ts` - 连接池管理
- `rx-producer.ts` - RxJS 生产者
- `rx-consumer.ts` - RxJS 消费者

#### 4. @sker/nlp
**LLM 客户端库**

关键导出：`NLPAnalyzer`, `useOpenAi`, 类型定义

特点：
- 一次调用多维度分析（情感 + 关键词 + 分类 + 标签）
- OpenAI 兼容 API（支持 DeepSeek 等）
- 上下文感知提示词
- JSON 自动解析

位置：`packages/nlp/src/`
主要文件：
- `NLPAnalyzer.ts` - NLP 分析器实现
- `openai.ts` - OpenAI 客户端
- `types.ts` - 类型定义

#### 5. @sker/entities
**TypeORM 数据模型**

关键导出：Entity 类、DataSource、EntityManager

特点：
- 完整微博数据模型（用户、帖子、评论、转发、喜欢）
- 事件管理模型（事件、分类、标签、统计）
- 工作流追踪模型（工作流、日程、运行）

位置：`packages/entities/src/`
主要文件（样本）：
- `weibo-post.entity.ts` - 微博帖子实体
- `event.entity.ts` - 事件实体
- `workflow-run.entity.ts` - 工作流运行实体

---

### 第三层：工作流引擎

#### 6. @sker/workflow
**工作流执行引擎**

关键导出：`Ast`, `WorkflowGraphAst`, `execute`, `WorkflowScheduler`, `DependencyAnalyzer`

特点：
- AST + 访问者模式架构
- 数据边和控制边支持
- DAG 拓扑排序和并行执行
- 完整的状态和数据流管理

位置：`packages/workflow/src/`
主要文件：
- `ast.ts` - AST 节点基类定义
- `executor.ts` - 执行引擎实现
- `execution/scheduler.ts` - 调度器
- `execution/dependency-analyzer.ts` - 依赖分析
- `execution/data-flow-manager.ts` - 数据流管理

#### 7. @sker/workflow-ast
**工作流节点定义**

关键导出：具体节点类（WeiboAjaxFeedHotTimelineAst, PostContextCollectorAst 等）

特点：
- 定义特定域的节点
- 使用 @Node, @Input, @Output 装饰器
- 支持 JSON 序列化

位置：`packages/workflow-ast/src/`
主要文件（样本）：
- `WeiboAjaxFeedHotTimelineAst.ts` - 微博热闻节点
- `PostContextCollectorAst.ts` - 内容收集节点
- `PostNLPAnalyzerAst.ts` - NLP 分析节点
- `EventAutoCreatorAst.ts` - 事件创建节点

#### 8. @sker/workflow-run
**后端运行时实现**

关键导出：具体访问者类（Visitor 实现）和消费者

特点：
- 实现 AST 节点的 Visitor 接口
- Cheerio HTML 解析
- Playwright 浏览器自动化
- 数据库持久化和 NLP 分析集成

位置：`packages/workflow-run/src/`
主要文件（样本）：
- `PostContextCollectorVisitor.ts` - 内容收集执行
- `PostNLPAnalyzerVisitor.ts` - NLP 分析执行
- `EventAutoCreatorVisitor.ts` - 事件创建执行
- `post-nlp-agent.consumer.ts` - MQ 消费者

---

### 第四层：UI 组件

#### 9. @sker/ui
**基础 UI 组件库**

关键导出：`Button`, `Card`, `Code`

特点：
- 轻量级基础组件
- React 19 支持
- 支持样式定制

位置：`packages/ui/src/`
主要文件：
- `button.tsx` - 按钮组件
- `card.tsx` - 卡片组件
- `code.tsx` - 代码框组件

#### 10. @sker/design
**设计系统（大屏可视化）**

关键导出：`Button` 等组件

特点：
- React 19 + 现代库
- ECharts 图表可视化
- Konva Canvas 编辑
- react-grid-layout 网格布局

位置：`packages/design/src/`
主要文件：
- `components/Button.tsx` - 按钮组件

依赖库：echarts, konva, react-grid-layout, zustand, dayjs

#### 11. @sker/workflow-ui
**工作流可视化编辑器**

关键导出：`WorkflowCanvas`, `NodePalette`, `PropertyPanel`, Hooks, 适配器

特点：
- 基于 React Flow 的交互式编辑
- 完整的编辑器 UI（画布、调色板、属性面板）
- AST 和流图双向转换
- Zustand 状态管理

位置：`packages/workflow-ui/src/`
主要目录：
- `components/` - UI 组件
- `hooks/` - React Hooks
- `store/` - Zustand 状态管理
- `adapters/` - AST 转换适配器

---

### 第五层：应用

#### 12. @sker/agent
**AI Agent 驱动的工作流**

关键导出：`ResearchAgent`, `OpinionAgent`, `tools`

特点：
- LangChain + LangGraph 编排
- 工具调用和多步推理
- 与 @sker/nlp 和 @sker/workflow-run 集成

位置：`packages/agent/src/`
主要文件（样本）：
- `ResearchAgent.ts` - 研究 Agent
- `OpinionAgent.ts` - 舆情分析 Agent
- `tools/` - 工具函数目录

#### 13. @sker/workflow-browser
**浏览器运行时**

特点：
- 前端工作流执行基础设施
- 与 @sker/workflow-ui 配合

位置：`packages/workflow-browser/src/`

#### 14. @sker/typescript-config
**TypeScript 配置共享**

特点：
- 集中管理 tsconfig
- 统一代码规范

位置：`packages/typescript-config/`

---

## 核心设计模式

### 1. 依赖注入
```typescript
// 所有服务通过 @sker/core DI
import { Injectable, Inject } from '@sker/core';

@Injectable({ providedIn: 'root' })
class MyService {
  constructor(@Inject('API_URL') apiUrl: string) {}
}
```

### 2. 装饰器元数据
```typescript
// 工作流节点通过装饰器定义
@Node({ title: "我的节点" })
class MyAst extends Ast {
  @Input() input: string;
  @Output() output: string;
}
```

### 3. 访问者模式
```typescript
// 节点执行通过 Visitor 实现
class MyVisitor implements Visitor {
  async visit(ast: MyAst, ctx: any): Promise<void> {
    // 执行逻辑
  }
}
```

### 4. Observable 架构
```typescript
// 消息队列使用 RxJS Observable
const { publish$, consume$ } = useQueue('my-queue');
publish$.next(message);
consume$.subscribe(msg => {});
```

### 5. 单例模式
- Redis 连接池
- MQ 连接池
- 根注入器和平台注入器

### 6. 工厂模式
```typescript
// Provider 工厂创建复杂对象
{
  provide: MyService,
  useFactory: (dep: Dependency) => new MyService(dep),
  deps: [Dependency]
}
```

---

## 依赖关系总图

```
@sker/core (所有其他包的基础)
│
├─ @sker/workflow (工作流引擎)
│  └─ @sker/workflow-ast (节点定义)
│     ├─ @sker/nlp (LLM)
│     └─ @sker/workflow-run (后端执行)
│        ├─ @sker/entities (数据模型)
│        ├─ @sker/redis (缓存)
│        └─ @sker/mq (消息队列)
│
├─ @sker/redis
├─ @sker/mq
├─ @sker/nlp
├─ @sker/entities
│
├─ @sker/workflow-ui (前端编辑器)
│  ├─ @sker/workflow
│  └─ React Flow
│
├─ @sker/design (UI系统)
│  └─ React 19
│
├─ @sker/ui (基础组件)
│  └─ React 19
│
├─ @sker/agent (AI Agent)
│  ├─ @sker/nlp
│  ├─ @sker/workflow-run
│  ├─ @sker/entities
│  └─ LangChain
│
└─ @sker/typescript-config (配置共享)
```

---

## 快速导入参考

```typescript
// DI 系统
import { createInjector, Injectable, Inject } from '@sker/core';

// 工作流核心
import { 
  Ast, 
  WorkflowGraphAst, 
  execute, 
  WorkflowScheduler 
} from '@sker/workflow';

// 工作流节点
import { PostNLPAnalyzerAst, EventAutoCreatorAst } from '@sker/workflow-ast';

// 后端执行
import { PostNLPAnalyzerVisitor, EventAutoCreatorVisitor } from '@sker/workflow-run';

// 基础服务
import { RedisClient } from '@sker/redis';
import { useQueue } from '@sker/mq';
import { NLPAnalyzer } from '@sker/nlp';

// 数据模型
import { WeiboPostEntity, EventEntity, WorkflowRunEntity } from '@sker/entities';

// 前端编辑器
import { 
  WorkflowCanvas, 
  useWorkflow, 
  astToFlow 
} from '@sker/workflow-ui';

// UI 组件
import { Button, Card } from '@sker/ui';

// AI Agent
import { ResearchAgent, OpinionAgent } from '@sker/agent';
```

---

## 文件结构建议

对于使用这些包的项目，建议的导入结构：

```
src/
├── services/          # 使用 DI 管理的服务
├── workflow/          # 工作流定义
│  ├── nodes/         # AST 节点定义
│  └── visitors/      # 访问者实现
├── components/        # React 组件
│  └── workflow/      # 工作流编辑器集成
├── pages/            # 页面组件
└── App.tsx
```

---

## 常见使用场景

### 场景 1：创建新的工作流节点
1. 在 `@sker/workflow-ast` 中定义 AST 节点
2. 在 `@sker/workflow-run` 中实现 Visitor
3. 通过 DI 注册 Visitor
4. 在 `@sker/workflow-ui` 中注册节点类型

### 场景 2：集成新的 LLM 服务
1. 修改 `@sker/nlp` 中的 `openai.ts`
2. 更新分析提示词
3. 重新构建 @sker/nlp
4. 在 @sker/workflow-run 中使用

### 场景 3：添加新的存储后端
1. 在 `@sker/entities` 中定义新实体
2. 在 service 中使用 TypeORM 操作
3. 通过 DI 注册 service

### 场景 4：扩展工作流编辑器
1. 在 `@sker/workflow-ui` 中添加新组件
2. 在适配器中处理新节点类型
3. 在状态管理中添加新状态

---

## 性能优化建议

1. **DI 容器**：使用 `providedIn: 'root'` 自动处理单例
2. **缓存**：使用 Redis 缓存频繁访问的数据
3. **并行执行**：使用 WorkflowScheduler 的 DAG 排序
4. **消息队列**：使用 MQ 处理长时间任务
5. **React 优化**：使用 Zustand 管理工作流编辑器状态

---

## 调试建议

- 启用 DI 日志：在 EnvironmentInjector 中配置
- 查看工作流执行：在 WorkflowScheduler 中添加日志
- 监控 Redis：使用 redis-cli
- 监控 MQ：使用 RabbitMQ 管理界面
- 浏览器调试：React DevTools + Zustand DevTools

---

## 文件生成时间

本文档由 Sker 包探索工具自动生成。
生成时间：2025-11-06

关联文件：
- PACKAGES_INFO.json - 结构化数据
- PACKAGES_SUMMARY.md - 详细说明

