# @sker/sdk

类型安全 API 客户端 SDK —— 前后端共享类型的唯一来源，通过装饰器元数据与依赖注入自动生成可调用的 HTTP 客户端方法。

## 核心职责

- **接口规范单一来源**：以 Controller 装饰器类定义 API 路径、方法、参数与返回类型，前后端共用，杜绝重复定义
- **类型安全调用**：调用方直接获得完整的 TypeScript 类型推导，无需手写 HTTP 请求胶水代码
- **装饰器驱动**：解析 `@Controller` / `@Get` / `@Post` / `@Param` / `@Query` / `@Body` 等元数据，自动生成客户端请求逻辑
- **DI 集成**：通过 `@sker/core` 的 `root` 注入器管理与获取客户端实例（`providers()` / `root.get()`）
- **流式响应**：基于 RxJS 原生支持 SSE（Server-Sent Events）流式响应（如工作流执行）
- **认证集成**：基于 `better-auth` 与 `@better-fetch/fetch` 提供登录、会话与鉴权请求配置

## 目录结构

```
src/
├── index.ts                           # 统一导出
├── client-plugin.ts                   # 客户端插件：Better Fetch 插件，处理鉴权/重试/SSE 等
├── tokens.ts                          # DI 注入令牌（BETTER_FETCH、BETTER_FETCH_CONFIG）
├── types.ts                           # 共享 TypeScript 类型定义（各 API 的请求/响应模型）
├── controllers/                       # API 控制器（客户端存根），每个文件对应一组领域 API
│   ├── account-monitor.controller.ts  # 账号监控 API
│   ├── charts.controller.ts           # 图表数据 API
│   ├── chat.controller.ts             # 聊天/对话 API
│   ├── claude.controller.ts           # Claude 任务 API
│   ├── comment-depth.controller.ts    # 评论深度分析 API
│   ├── community-detection.controller.ts  # 社区发现 API
│   ├── community-evolution.controller.ts  # 社区演化 API
│   ├── config.controller.ts           # 配置 API
│   ├── crawler.controller.ts          # 爬虫控制 API
│   ├── derived-node.controller.ts     # 派生节点 API
│   ├── event-statistics.controller.ts # 事件统计 API
│   ├── events.controller.ts           # 舆情事件 API
│   ├── influence-prediction.controller.ts  # 影响力预测 API
│   ├── keywords.controller.ts         # 关键词 API
│   ├── layout.controller.ts           # 布局配置 API
│   ├── llm-chat-logs.controller.ts    # LLM 调用日志 API
│   ├── llm-model-providers.controller.ts  # 模型-提供商关联 API
│   ├── llm-models.controller.ts       # LLM 模型管理 API
│   ├── llm-providers.controller.ts    # LLM 提供商管理 API
│   ├── llm-proxy.controller.ts        # LLM 代理 API
│   ├── login.controller.ts            # 登录 API
│   ├── markdown.controller.ts         # Markdown 渲染 API
│   ├── media-crawler.controller.ts    # 媒体爬虫 API
│   ├── media-type.controller.ts       # 媒体类型 API
│   ├── network-centrality.controller.ts  # 网络中心性 API
│   ├── overview.controller.ts         # 概览数据 API
│   ├── persona.controller.ts          # Persona 记忆图谱 API
│   ├── posting-time.controller.ts     # 发帖时间分析 API
│   ├── posts.controller.ts            # 微博内容 API
│   ├── prompt-optimizer.controller.ts # Prompt 优化 API
│   ├── prompt-roles.controller.ts     # Prompt 角色管理 API
│   ├── prompt-skills.controller.ts    # Prompt 技能管理 API
│   ├── propagation-velocity.controller.ts  # 传播速度分析 API
│   ├── proxy.controller.ts            # 代理配置 API
│   ├── sentiment-transition.controller.ts  # 情感迁移分析 API
│   ├── sentiment.controller.ts        # 情感分析 API
│   ├── spread-breadth.controller.ts   # 传播广度分析 API
│   ├── system.controller.ts           # 系统状态 API
│   ├── upload.controller.ts           # 文件上传 API
│   ├── user-relation.controller.ts    # 用户关系网络 API
│   ├── user-stratification.controller.ts  # 用户分层分析 API
│   ├── users.controller.ts            # 用户数据 API
│   ├── workflow-dsl.controller.ts     # 工作流 DSL 解析 API
│   └── workflow.controller.ts         # 工作流 API（含 SSE 流式）
```

## 边界

- **✅ 负责**：API 接口规范定义（路径/方法/参数/返回值/类型）；类型安全的客户端调用与认证配置；SSE 流式响应封装
- **❌ 不负责**：不实现任何业务逻辑（服务端由 `apps/api` 实现）；不持有数据模型（实体见 `@sker/entities`）；不含 HTTP 服务端路由处理（`@sker/core` 提供 `@Controller` 元数据，实际路由在服务端）
- **对外依赖**：`@sker/core`、`@sker/workflow`、`@sker/workflow-ast`；外部依赖 `@better-fetch/fetch`、`better-auth`、`rxjs`
- **被谁依赖**：`apps/api`、`apps/app`、`apps/bigscreen`、`apps/storybook`、`apps/tests`、`apps/worker`；`packages/ui`、`packages/workflow-browser`、`packages/workflow-run`、`packages/workflow-ui`
