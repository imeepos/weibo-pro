## Project Overview

Weibo-Pro 是一个基于 Turborepo 的微博舆情分析平台，采用数据采集-处理-展示三层架构。

### Apps
- **@sker/api** (NestJS) - 后端 API 服务，端口 3000
- **@sker/app** (Expo + React Native) - 移动端应用
- **@sker/bigscreen** - 大屏展示应用
- **@sker/crawler** - 爬虫应用
- **@sker/storybook** - UI 组件库开发工具

### Core Packages
- **基础设施**: @sker/core (DI容器), @sker/entities (TypeORM), @sker/mq (RabbitMQ), @sker/redis, @sker/nlp
- **工作流引擎**: @sker/workflow (引擎核心), @sker/workflow-ast (节点定义), @sker/workflow-run (执行器), @sker/workflow-browser (浏览器执行器), @sker/workflow-ui (可视化编辑器)
- **业务逻辑**: @sker/agent (LangChain Agent + 千门八将), @sker/sdk (API客户端)
- **UI层**: @sker/ui (UI组件库), @sker/design (设计系统), @sker/store (RxJS状态管理)
- **认证**: @sker/auth (Better Auth)
- **工程配置**: @sker/eslint-config, @sker/typescript-config

## Development Commands

```bash
# 开发环境启动（推荐使用 dev:robust 确保依赖已构建）
pnpm dev:robust           # 启动所有应用（自动检查并构建依赖）
pnpm dev                  # 启动所有应用（不检查依赖）
pnpm dev:clean            # 清理端口后启动

# 单独启动应用
turbo dev --filter=@sker/api     # 只启动 API
turbo dev --filter=@sker/app     # 只启动移动端应用
turbo dev --filter=@sker/storybook  # 只启动 Storybook

# 构建
pnpm build                # 构建所有应用和包
pnpm build:force          # 强制重新构建（不使用缓存）
pnpm build:deps           # 只构建 packages（不构建 apps）

# 检查
pnpm lint                 # 代码检查
pnpm check-types          # 类型检查
pnpm format               # 格式化代码

# 工具脚本
pnpm ensure-deps          # 确保所有依赖包已构建
pnpm port:guardian        # 检查并清理端口占用
pnpm clean:cache          # 清理 Turbo 缓存
```

## 千门八将 - AI Agent 系统

基于中国传统"千门八将"概念设计的编程智能体系统，每个角色各司其职、协同工作。

### 八将角色

| 将 | Agent | 职责 | 使用场景 |
|---|---|---|---|
| **提** | `orchestrator` | 调度中枢 | 复杂任务拆解、多角色协调 |
| **正** | `code-artisan` | 编码实现 | 功能开发、代码编写 |
| **反** | `architect` | 架构设计 | 系统设计、方案规划、技术选型 |
| **风** | `scout` | 代码审查 | PR审查、安全扫描、质量分析 |
| **火** | `guard` | 测试防护 | 测试编写、质量保障 |
| **除** | `fixer` | 问题修复 | Bug定位、故障排查 |
| **脱** | `deploy` | 部署发布 | CI/CD、版本发布 |
| **谣** | `researcher` | 技术调研 | 技术调研、文档生成 |

### 使用方式

```
使用 orchestrator 规划这个功能的实现
使用 architect 设计这个模块的架构
使用 scout 审查这段代码
使用 guard 为这个函数写测试
使用 fixer 修复这个 bug
使用 deploy 发布新版本
使用 researcher 调研 OAuth 最佳实践
```
