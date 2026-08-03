# @sker/app

面向移动端的 Web 应用（React + Vite），作为 Claude Agent 的移动聊天客户端，浏览在线 CLI 客户端并与之实时对话。

## 核心职责

- 移动端聊天界面：`ChatPage` 支持多任务并行聊天、流式消息、Token 用量统计与权限审批交互
- CLI 客户端列表：`CliListPage` 通过 API 拉取在线 CLI 客户端并支持选择会话
- 实时通信：`socket.service` 维护 Socket.IO 连接，基于 RxJS 订阅 Claude 事件流
- 状态管理：`store/chat.store.ts` 基于 zustand 管理会话、任务、连接状态、审批与权限模式
- SDK 初始化：`lib/sdk.ts` 创建 better-auth 客户端并挂载 `@sker/sdk` 插件，自动注册 Controller 到 DI 容器
- 路由：基于 react-router-dom，挂载在 `/mobile` 基路径下

## 目录结构

```
apps/app/
├── src/
│   ├── main.tsx               # 入口（引入 reflect-metadata 与 @sker/sdk 自动注册）
│   ├── App.tsx                # 路由（BrowserRouter basename=/mobile）+ 底部导航
│   ├── components/            # 聊天组件（ChatInput、MessageBubble、TokenUsage 等）与 ui 原语
│   ├── pages/                 # ChatPage、CliListPage
│   ├── services/              # socket.service 及服务入口
│   ├── store/                 # zustand chat.store
│   ├── lib/                   # sdk.ts（better-auth + @sker/sdk 插件）、utils
│   ├── types/                 # Claude 相关类型（claude.ts、index.ts）
│   ├── test/                  # 测试 setup
│   └── index.css              # 全局样式
├── index.html                 # HTML 入口
├── vite.config.ts
└── vitest.config.ts
```

## 边界

- **✅ 负责**：移动端 UI 渲染、与 `@sker/api` 的 WebSocket/HTTP 通信、聊天状态管理、CLI 客户端浏览
- **❌ 不负责**：不承载业务逻辑（服务端逻辑在 `@sker/api`）；不执行爬虫/工作流；不提供桌面大屏可视化（那是 `@sker/bigscreen`）
- **对外依赖**：`@sker/core`、`@sker/sdk`；外部依赖 react、react-dom、react-router-dom、socket.io-client、zustand、rxjs、tailwindcss、lucide-react
- **被谁依赖**：作为顶层应用，不被其他包依赖

## 常用命令

```bash
pnpm dev            # 开发（vite）
pnpm build          # 构建
pnpm preview        # 预览构建产物
pnpm test           # 单元测试
```
