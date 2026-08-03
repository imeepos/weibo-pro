# @sker/api

微博舆情分析平台的后端 API 服务，基于 Hono + @sker/core DI 构建，对外提供数据查询、业务服务、认证、实时推送（WebSocket/SSE）与 Claude Agent 网关。

## 核心职责

- 实现 REST API：以 `@sker/sdk` 中定义的 Controller 为唯一接口规范，覆盖事件分析、关键词、情感、用户关系/分层、传播、画像、LLM 管理、工作流等业务
- 认证与鉴权：基于 better-auth 提供 `/api/auth/*` 路由（本项目中作为 API 路由转发器，不使用其内置认证能力）
- 实时推送：基于 Socket.IO 提供 `/ws` 通道；SSE 场景直接返回 `Observable`
- Claude Agent 网关：`src/claude` 子模块管理 Claude 会话/任务，面向移动端 CLI 客户端提供服务
- 数据服务层：基于 `@sker/core` DI 容器与 `@sker/entities` 实体，实现各类数据分析与调查（investigation）服务
- 工作流能力：工作流 DSL、模板、调度、派生节点（derived-node）的加载与管理
- 爬虫管理控制面：`src/crawler` 子模块提供爬虫配置、登录、控制接口
- 文件上传与静态资源：`/uploads` 静态文件服务

## 目录结构

```
apps/api/
├── src/
│   ├── main.ts                    # 入口：Hono 服务器、better-auth、Socket.IO、DI 初始化、种子数据
│   ├── config/                    # 环境变量校验（env.config.ts）与启动检查（startup-check.ts）
│   ├── controllers/               # HTTP Controller（实现 @sker/sdk 接口，SDK 驱动开发）
│   ├── services/
│   │   ├── data/                  # 数据分析服务（事件、关键词、情感、传播、画像、用户调查等）
│   │   │   ├── events/            # 事件分析子模块（生命周期、里程碑、舆情、用户风险等）
│   │   │   ├── investigation/     # 用户调查子模块（画像蒸馏、用户档案、人物网络）
│   │   │   └── performance/       # 性能测试服务
│   │   ├── workflow/              # 派生节点服务（derived-node）
│   │   └── *.service.ts           # 上传、缓存、聊天、工作流、LLM 等服务
│   ├── claude/                    # Claude 模块（Gateway、Service、Controller、worker-gateway）
│   ├── crawler/                   # 爬虫管理控制面（配置/登录/控制）
│   ├── middleware/                # 鉴权中间件
│   ├── scripts/                   # 运维脚本（get-event-id、test-event-data）
│   └── utils/                     # 日志、OpenAPI、类型转换、校验等工具
├── Dockerfile                     # 容器镜像
├── tsup.config.js                 # 构建配置（输出 dist/main.js）
├── vitest.config.ts               # 测试配置
└── API_EXAMPLES.md                # API 示例文档
```

## 边界

- **✅ 负责**：HTTP/WebSocket/SSE 实时 API、认证路由转发、业务数据服务、Claude Agent 网关、工作流管理与派生节点、爬虫控制面、文件上传
- **❌ 不负责**：不直接执行爬虫工作流（由 `@sker/crawler` 承担调度执行）；不渲染任何前端页面；不消费定时爬取任务
- **对外依赖**：`@sker/core`、`@sker/sdk`、`@sker/entities`、`@sker/workflow`、`@sker/workflow-ast`、`@sker/workflow-run`、`@sker/auth`、`@sker/agent`、`@sker/ip-proxy`、`@sker/llm-protocol`、`@sker/mq`、`@sker/redis`、`@sker/utils`；外部依赖 hono、better-auth、socket.io、typeorm、zod、rxjs、node-cron
- **被谁依赖**：作为顶层应用不被其他包 import；`@sker/bigscreen`、`@sker/app`、`@sker/tests` 通过 HTTP/WebSocket/API 消费其能力

## 常用命令

```bash
pnpm dev          # 开发
pnpm build        # 构建（tsup）
pnpm start        # 运行 dist/main.js
pnpm pm2:start    # pm2 启动（名称 sker-api）
pnpm test         # 单元测试
```
