# @sker/bigscreen

微博舆情分析平台的大屏可视化 Web 应用（React + Vite），聚合 60+ 图表组件，展示事件态势、用户检测、传播网络、工作流编辑与 LLM 管理。

## 核心职责

- 数据大屏与图表：基于 echarts / recharts / three / d3-force-3d / reactflow 实现词云、情感、传播、社群、网络拓扑等 60+ 图表
- 用户检测与画像：UserDetection / UserDetection3D、用户关系网络、画像证据（persona evidence）、MemoryGraph
- 事件分析：EventAnalysis / EventDetail，覆盖生命周期、里程碑、情感转移、意见聚类
- 工作流编辑：WorkflowEditor / WorkflowManagement，复用 `@sker/workflow-ui` 与 `@sker/workflow-browser`
- 布局定制：自定义布局设计器 + 组件注册表（ComponentRegistry），支持拖拽式 Widget 编排
- 实时数据：WebSocket 订阅 + 自动刷新 hooks（useAutoRefresh、useRealTimeData 等）
- LLM 与提示词管理：LlmManagement、LlmChatLogs、PromptManagement
- 前端性能优化：路由级懒加载、图表组件按需加载（LazyChart）、Web Worker（community-detector）

## 目录结构

```
apps/bigscreen/
├── src/
│   ├── main.tsx                  # 入口（better-auth 客户端初始化、错误边界）
│   ├── App.tsx                   # 路由 + 懒加载 + 动画包装
│   ├── api/                      # 后端 API 封装（按领域拆分：charts、users、workflow 等）
│   ├── components/
│   │   ├── charts/               # 60+ 图表组件（词云、情感、网络拓扑、社群检测等）
│   │   ├── biz/                  # 业务组件（BleMesh、NetworkTopology 等）
│   │   ├── layout/               # 布局编辑器与 Widget 容器
│   │   ├── ui/                   # 通用 UI（Toast、StatsOverview 等）
│   │   ├── common/               # 通用组件（ErrorBoundary、UserCard、LazyChart）
│   │   ├── user-investigation/   # 用户调查面板（画像蒸馏、人物网络、档案）
│   │   └── Hero/                 # 首页 Hero 区
│   ├── pages/                    # 页面级组件（DataOverview、EventAnalysis、UserDetection 等）
│   ├── hooks/                    # 数据获取/轮询/图表配置 hooks
│   ├── services/                 # API 服务、组件注册表、应用初始化
│   ├── stores/                   # zustand 全局状态（应用/布局）
│   ├── workers/                  # Web Worker（community-detector.worker）
│   ├── utils/                    # 图表工具、性能、日志、WebSocket 封装
│   ├── constants/                # 指标说明、mock 数据
│   ├── config/                   # 性能配置
│   └── types/                    # 领域类型（charts、layout、websocket、bleMesh）
├── vite.config.ts                # 多页面/插件/性能配置
├── wrangler.jsonc                # Cloudflare 部署配置
└── nginx.conf                    # nginx 部署配置
```

## 边界

- **✅ 负责**：舆情数据可视化、用户检测/关系网络、事件分析、工作流编辑器、LLM/提示词管理、自定义布局
- **❌ 不负责**：不提供后端数据（来自 `@sker/api`）；不承载移动端聊天（那是 `@sker/app`）；不执行爬虫与数据采集
- **对外依赖**：`@sker/core`、`@sker/entities`、`@sker/sdk`、`@sker/ui`、`@sker/workflow`、`@sker/workflow-ast`、`@sker/workflow-browser`、`@sker/workflow-ui`；外部依赖 react、echarts、echarts-for-react、recharts、three、d3-force-3d、reactflow、framer-motion、socket.io-client、zustand、axios、dayjs
- **被谁依赖**：作为顶层应用，不被其他包依赖

## 常用命令

```bash
pnpm dev              # 开发（端口 9088）
pnpm build            # 构建
pnpm build:cloudflare # 构建 Cloudflare 部署产物
pnpm deploy           # 构建 + wrangler 部署
pnpm type-checks      # 类型检查
pnpm test             # 单元测试
```
