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


每次用户多次指正修复的问题，尽量总结成skill，放到当前项目目录下的 .claude\skills，下次碰到同类问题的时候，优先查看skill
当然，有些skill会随着代码的更新逐渐失效，当发现失效的skill时应及时修正错误，移除已废弃的skill