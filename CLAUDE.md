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

## API 开发规范 - SDK 驱动开发

本项目采用 **SDK 驱动开发**模式，前后端共享类型定义，确保类型安全。

### 开发流程（三步走）
如果是：sse 则返回 Observable即可

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  第一步: SDK    │ ──▶ │  第二步: API    │ ──▶ │  第三步: 调用   │
│  定义接口规范   │     │  实现接口       │     │  前端/后端调用  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### 第一步：在 @sker/sdk 定义接口规范

```typescript
// packages/sdk/src/controllers/keywords.controller.ts
import { Controller, Get, Query } from '@sker/core'
import type { KeywordWordCloudItem } from '../types'

@Controller('keywords')
export class KeywordsController {
  @Get('wordcloud')
  getWordCloud(@Query('maxWords', z.number()) maxWords?: number): Promise<KeywordWordCloudItem[]> {
    throw new Error('method getWordCloud not implements')
  }
}
```


#### 第二步：在 @sker/api 实现接口

```typescript
// apps/api/src/controllers/keywords.controller.ts
import { Controller, Get, Query } from '@sker/core'
import { root } from '@sker/core'
import { KeywordsService } from '../services/data/keywords.service'
import * as sdk from '@sker/sdk'

// ⚠️ 必须使用 sdk.KeywordsController 作为路径，否则会 404！
@Controller(sdk.KeywordsController)
export class KeywordsController implements sdk.KeywordsController {
  constructor(@Inject(KeywordsService) private keywordsService: KeywordsService) {
  }
  async getWordCloud(maxWords?: number) {
    return this.keywordsService.getWordCloud(maxWords || 100)
  }
}
```

#### 第三步：调用接口

```typescript
// 前端或其他服务调用
import { KeywordsController } from '@sker/sdk'
import { root } from '@sker/core'

// 获取词云数据
const keywordsCtrl = root.get(KeywordsController)
const wordCloud = await keywordsCtrl.getWordCloud(100)
// wordCloud 自动推断为 KeywordWordCloudItem[] 类型
```

### 重要规则

1. **SDK 是唯一的类型来源** - 前后端都从 @sker/sdk 导入类型
2. **不要做多余的类型转换** - SDK 的目的就是让前后端共用类型
3. **API 必须使用 `sdk.controller`** - 否则路由不匹配会导致 404
4. **使用 `root.get()` 获取实例** - 不要直接 new Controller

## 千门八将 - AI Agent 调度规则

基于中国传统"千门八将"概念设计的编程智能体系统。当用户请求匹配以下场景时，**必须**使用 Task 工具调用对应的 subagent_type。

### 自动调度规则

当用户的请求匹配以下关键词或场景时，使用 Task 工具并设置对应的 `subagent_type`：

| 将 | subagent_type | 触发关键词 | 自动调度场景 |
|---|---|---|---|
| **提** | `orchestrator` | 规划、拆解、协调、分解任务 | 复杂功能需要多步骤实现时；需要协调多个模块时；用户说"帮我规划"、"怎么实现这个功能" |
| **正** | `code-artisan` | 编写、实现、开发、创建功能 | 需要编写新功能代码时；实现具体业务逻辑时；用户说"帮我写"、"实现一个" |
| **反** | `architect` | 设计、架构、方案、选型、重构方案 | 讨论系统架构时；技术选型决策时；用户说"怎么设计"、"架构方案" |
| **风** | `scout` | 审查、review、检查代码、扫描 | PR 代码审查时；安全检查时；用户说"帮我审查"、"检查这段代码" |
| **火** | `guard` | 测试、写测试、单元测试、覆盖率 | 需要编写测试用例时；运行测试时；用户说"写测试"、"测试这个" |
| **除** | `fixer` | 修复、bug、报错、异常、排查、调试 | 修复 bug 时；排查问题时；用户说"这里报错了"、"帮我修复" |
| **脱** | `deploy` | 部署、发布、CI/CD、上线、版本 | 配置部署流程时；发布版本时；用户说"部署到"、"发布新版本" |
| **谣** | `researcher` | 调研、研究、对比、最佳实践、文档 | 技术调研时；方案对比时；用户说"调研一下"、"有什么最佳实践" |

### 调度示例

```
# 用户说 → 自动调用的 agent

"帮我实现用户认证功能" → orchestrator (复杂功能，需要规划)
"写一个日期格式化函数" → code-artisan (具体编码任务)
"这个模块应该怎么设计" → architect (架构设计)
"审查一下这个 PR" → scout (代码审查)
"为这个函数写单元测试" → guard (测试编写)
"这个接口报 500 了" → fixer (问题修复)
"帮我配置 GitHub Actions" → deploy (CI/CD 配置)
"OAuth 2.0 有什么最佳实践" → researcher (技术调研)
```

### 调度优先级

1. 如果用户明确指定 agent（如"使用 fixer"），直接调用指定的 agent
2. 如果任务复杂涉及多个步骤，优先使用 `orchestrator` 进行任务拆解
3. 根据关键词匹配对应的 agent
4. 不确定时，询问用户或使用 `orchestrator` 分析任务

简单任务直接使用 code-artisan 执行编码任务