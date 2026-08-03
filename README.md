# Weibo-Pro

基于 TypeScript 的微博舆情监控与分析平台（pnpm + Turborepo monorepo），覆盖数据采集、NLP 分析、事件检测、可视化大屏与 AI Agent 辅助等能力。

## 架构概览

```
apps/     可部署应用（API / Web / 爬虫 / Worker / Storybook 等）
packages/ 共享库（基础框架 / 数据层 / AI 分析 / 工作流引擎 / UI 组件）
```

依赖方向（自下而上）：
```
core / utils / typescript-config / eslint-config        ← 基础工具
    ↓
entities / redis / mq / sdk / auth / store / compiler   ← 数据与服务基座
    ↓
workflow* / nlp / agent / llm-protocol / crawler-core   ← 业务引擎
    ↓
api / crawler / app / bigscreen / cli / worker          ← 可部署应用
```

## 包索引

### Apps（应用）

| 包 | 定位 | 文档 |
|----|------|------|
| `@sker/api` | 后端 API 服务（Hono + DI，REST/WS/SSE、认证、Agent 网关、工作流控制面） | [README](apps/api/README.md) |
| `@sker/app` | 移动端 Web 聊天客户端（React + Vite） | [README](apps/app/README.md) |
| `@sker/bigscreen` | 大屏可视化 Web 应用（60+ 图表） | [README](apps/bigscreen/README.md) |
| `@sker/cli` | 基于 Claude Agent SDK 的终端编程助手 CLI | [README](apps/cli/README.md) |
| `@sker/crawler` | 微博爬虫执行服务（Cron 精确调度） | [README](apps/crawler/README.md) |
| `@sker/email-d1` | Cloudflare 临时邮箱服务（Email Routing + D1） | [README](apps/email-d1/README.md) |
| `@sker/storybook` | 组件库文档与开发环境 | [README](apps/storybook/README.md) |
| `@sker/tests` | API 集成测试包 | [README](apps/tests/README.md) |
| `@sker/worker` | Cloudflare Worker 边缘代理服务 | [README](apps/worker/README.md) |

### Packages（共享库）

| 包 | 定位 | 文档 |
|----|------|------|
| `@sker/core` | 企业级依赖注入框架 | [README](packages/core/README.md) |
| `@sker/entities` | TypeORM 实体与数据访问层 | [README](packages/entities/README.md) |
| `@sker/sdk` | 类型安全 API 客户端（前后端类型唯一来源） | [README](packages/sdk/README.md) |
| `@sker/auth` | Better Auth 装饰器插件框架（RBAC + OpenAPI） | [README](packages/auth/README.md) |
| `@sker/store` | 框架无关的响应式状态管理 | [README](packages/store/README.md) |
| `@sker/utils` | 加密与编码工具库 | [README](packages/utils/README.md) |
| `@sker/compiler` | 多厂商 LLM 请求/响应统一 AST 与工具调用编译 | [README](packages/compiler/README.md) |
| `@sker/json-harmony` | 容错解析损坏 JSON / YAML 混合内容 | [README](packages/json-harmony/README.md) |
| `@sker/redis` | Redis 客户端包装（ioredis + DI） | [README](packages/redis/README.md) |
| `@sker/mq` | RabbitMQ + RxJS 消息队列客户端 | [README](packages/mq/README.md) |
| `@sker/nlp` | 社交媒体舆情 NLP 分析引擎 | [README](packages/nlp/README.md) |
| `@sker/agent` | 自主研究与舆情分析 Agent + 多智能体编程系统 | [README](packages/agent/README.md) |
| `@sker/llm-protocol` | OpenAI / Claude / Codex 三协议互转 | [README](packages/llm-protocol/README.md) |
| `@sker/ip-proxy` | IP 代理池工具库 | [README](packages/ip-proxy/README.md) |
| `@sker/email` | 临时邮箱服务（验证码提取） | [README](packages/email/README.md) |
| `@sker/pageindex` | PDF/Markdown 文档结构化索引 CLI | [README](packages/pageindex/README.md) |
| `@sker/workflow` | 工作流引擎（AST + Visitor + RxJS） | [README](packages/workflow/README.md) |
| `@sker/workflow-ast` | 工作流节点（AST 类）定义 | [README](packages/workflow-ast/README.md) |
| `@sker/workflow-compiler` | 工作流 DSL 编译器 | [README](packages/workflow-compiler/README.md) |
| `@sker/workflow-run` | 工作流后端运行时执行层（72 个 Visitor） | [README](packages/workflow-run/README.md) |
| `@sker/workflow-browser` | 浏览器端工作流执行器 | [README](packages/workflow-browser/README.md) |
| `@sker/workflow-ui` | 工作流可视化编辑器（React Flow） | [README](packages/workflow-ui/README.md) |
| `@sker/ui` | 企业级 React UI 组件库（Radix/Plate/ECharts） | [README](packages/ui/README.md) |
| `@sker/aui` | AI-first UI 系统（UI 即 AI 上下文） | [README](packages/aui/README.md) |
| `@sker/cli-v2` | CLI 守护进程（Socket.IO 驱动 Claude Agent） | [README](packages/cli/README.md) |
| `@sker/crawler-core` | 爬虫核心库（HTTP/浏览器/多平台爬虫） | [README](packages/crawler-core/README.md) |
| `@sker/typescript-config` | 共享 tsconfig 预设 | [README](packages/typescript-config/README.md) |
| `@sker/eslint-config` | 共享 ESLint flat config 预设 | [README](packages/eslint-config/README.md) |

## 常用命令

```bash
pnpm dev            # 开发（turbo 并行）
pnpm build          # 构建所有包
pnpm test           # 运行测试
pnpm lint           # 代码检查
pnpm check-types    # 类型检查
pnpm storybook      # Storybook 开发（--filter=@sker/storybook）
```
