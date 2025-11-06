# Sker Monorepo 包系统文档

本目录包含 Sker 项目完整的包系统文档。

## 文档速查

### 我应该查看哪个文档？

| 文档 | 大小 | 用途 | 最佳场景 |
|------|------|------|---------|
| **PACKAGES_INFO.json** | 14KB | 结构化数据 | 编程式访问、生成 README、集成工具 |
| **PACKAGES_SUMMARY.md** | 12KB | 详细讲解 | 学习系统架构、理解设计模式 |
| **PACKAGES_GUIDE.md** | 11KB | 使用指南 | 快速开发、查找代码、调试问题 |
| **本文档** | - | 导航指南 | 快速找到需要的资源 |

## 快速导航

### 想要快速了解系统架构？
→ 阅读 **PACKAGES_SUMMARY.md** 的"包结构总览"部分

### 想要查询某个包的导出？
→ 查看 **PACKAGES_INFO.json** 的 packages 数组

### 想要快速导入某个模块？
→ 参考 **PACKAGES_GUIDE.md** 的"快速导入参考"部分

### 想要创建新的工作流节点？
→ 跳转到 **PACKAGES_GUIDE.md** 的"常见使用场景"部分

### 想要理解依赖关系？
→ 查看 **PACKAGES_SUMMARY.md** 中的"依赖关系可视化"或 **PACKAGES_GUIDE.md** 的"依赖关系总图"

## 12 个包一览

```
基础设施层 (2个)
├── @sker/core              依赖注入容器
└── @sker/typescript-config TypeScript配置

基础服务层 (4个)
├── @sker/redis             Redis客户端
├── @sker/mq                RabbitMQ消息队列
├── @sker/nlp               LLM客户端
└── @sker/entities          TypeORM数据模型

工作流引擎层 (3个)
├── @sker/workflow          工作流执行引擎
├── @sker/workflow-ast      工作流节点定义
└── @sker/workflow-run      后端运行时实现

UI组件层 (3个)
├── @sker/ui                基础组件库
├── @sker/design            设计系统
└── @sker/workflow-ui       工作流编辑器

应用层 (2个)
├── @sker/agent             AI Agent
└── @sker/workflow-browser  浏览器运行时
```

## 核心概念速查

### 依赖注入（DI）
- **文件**：PACKAGES_SUMMARY.md 的"@sker/core 依赖注入系统"
- **关键导出**：`createInjector`, `Injectable`, `Inject`
- **特点**：四层级（Root/Platform/Application/Feature）

### 工作流执行引擎
- **文件**：PACKAGES_SUMMARY.md 的"@sker/workflow 工作流引擎"
- **关键导出**：`Ast`, `execute`, `WorkflowScheduler`
- **模式**：访问者模式 + DAG 拓扑排序

### 消息队列
- **文件**：PACKAGES_SUMMARY.md 的"@sker/mq RabbitMQ 消息队列"
- **关键导出**：`useQueue`
- **特点**：RxJS 双 Observable 架构

### NLP 分析
- **文件**：PACKAGES_SUMMARY.md 的"@sker/nlp LLM 客户端"
- **关键导出**：`NLPAnalyzer`
- **特点**：一次调用多维度分析

### 工作流编辑器
- **文件**：PACKAGES_SUMMARY.md 的"@sker/workflow-ui 工作流编辑器"
- **关键导出**：`WorkflowCanvas`, `useWorkflow`
- **特点**：React Flow + AST 双向转换

## 设计模式速查

| 模式 | 文件 | 用途 |
|------|------|------|
| 依赖注入 | PACKAGES_SUMMARY.md | 全局依赖管理 |
| 装饰器 | PACKAGES_SUMMARY.md | 元数据定义 |
| 访问者模式 | PACKAGES_SUMMARY.md | 工作流执行 |
| Observable | PACKAGES_SUMMARY.md | 异步消息处理 |
| 单例模式 | PACKAGES_GUIDE.md | 全局共享资源 |
| 工厂模式 | PACKAGES_GUIDE.md | 复杂对象创建 |

## 推荐导入速查

```typescript
// DI 核心
import { createInjector, Injectable } from '@sker/core';

// 工作流
import { execute, Ast } from '@sker/workflow';
import { PostNLPAnalyzerAst } from '@sker/workflow-ast';
import { PostNLPAnalyzerVisitor } from '@sker/workflow-run';

// 基础服务
import { RedisClient } from '@sker/redis';
import { useQueue } from '@sker/mq';
import { NLPAnalyzer } from '@sker/nlp';

// 数据模型
import { WeiboPostEntity, EventEntity } from '@sker/entities';

// 前端
import { WorkflowCanvas } from '@sker/workflow-ui';
import { Button } from '@sker/ui';

// AI
import { ResearchAgent } from '@sker/agent';
```

完整列表见：PACKAGES_GUIDE.md 的"快速导入参考"

## 常见任务指南

### 创建新工作流节点
**步骤**：
1. 在 `@sker/workflow-ast` 中定义 AST 节点
2. 在 `@sker/workflow-run` 中实现 Visitor
3. 在 `@sker/workflow-ui` 中注册节点

**详见**：PACKAGES_GUIDE.md 的"场景 1：创建新的工作流节点"

### 集成新 LLM 服务
**步骤**：
1. 修改 `@sker/nlp` 的配置
2. 更新分析提示词
3. 在 workflow-run 中使用

**详见**：PACKAGES_GUIDE.md 的"场景 2：集成新的 LLM 服务"

### 添加新数据模型
**步骤**：
1. 在 `@sker/entities` 中定义实体
2. 创建 service 使用 TypeORM 操作
3. 通过 DI 注册 service

**详见**：PACKAGES_GUIDE.md 的"场景 3：添加新的存储后端"

### 扩展工作流编辑器
**步骤**：
1. 在 `@sker/workflow-ui` 中添加新组件
2. 在适配器中处理新节点
3. 在状态管理中添加新状态

**详见**：PACKAGES_GUIDE.md 的"场景 4：扩展工作流编辑器"

## 性能优化建议

- **DI 容器**：使用 `providedIn: 'root'` 自动单例化
- **缓存**：使用 Redis 缓存频繁数据
- **并行执行**：利用 WorkflowScheduler 的 DAG 排序
- **异步处理**：使用 MQ 处理长时间任务
- **前端优化**：使用 Zustand 管理编辑器状态

完整建议见：PACKAGES_GUIDE.md 的"性能优化建议"

## 调试建议

- **DI 问题**：启用 EnvironmentInjector 日志
- **工作流执行**：在 WorkflowScheduler 中添加日志
- **Redis**：使用 redis-cli 监控
- **消息队列**：使用 RabbitMQ 管理界面
- **浏览器**：使用 React DevTools + Zustand DevTools

完整建议见：PACKAGES_GUIDE.md 的"调试建议"

## 文件统计

| 文件 | 行数 | 大小 |
|------|------|------|
| PACKAGES_INFO.json | 394 | 14KB |
| PACKAGES_SUMMARY.md | 402 | 12KB |
| PACKAGES_GUIDE.md | 472 | 11KB |
| **总计** | **1,268** | **37KB** |

## 更新信息

- **生成时间**：2025-11-06
- **包数量**：12 个
- **导出总数**：100+ 个类/函数/类型
- **设计模式**：6 种核心模式

## 相关资源

- 项目主目录：`/home/ubuntu/worktrees/demo/sker/`
- 包目录：`packages/`
- 源代码：各包的 `src/` 目录

---

**快速开始**：选择上方的文档开始阅读，或使用"常见任务指南"快速定位需要的信息。

