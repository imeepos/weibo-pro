# @sker/sdk

优雅的 API 客户端 SDK - 数字时代的艺术品

## 核心职责

**@sker/sdk 是前后端共享类型的唯一来源**，负责：
1. 定义 API 接口规范（路径、方法、参数、返回值）
2. 提供类型安全的客户端调用
3. 确保前后端类型一致，无需重复定义

## 开发规范

## API 开发规范 - SDK 驱动开发

本项目采用 **SDK 驱动开发**模式，前后端共享类型定义，确保类型安全。

### 开发流程（三步走）

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

## 概述

`@sker/sdk` 是 Weibo-Pro 平台的类型安全 API 客户端，基于装饰器元数据和依赖注入实现自动化客户端代码生成。每个 Controller 类通过装饰器定义 API 接口，SDK 在运行时自动将其转换为可调用的客户端方法。

**核心设计理念**：
- 类型即文档：通过 TypeScript 类型系统确保 API 调用的完整类型安全
- 装饰器驱动：零手写胶水代码，装饰器自动生成 HTTP 请求逻辑
- DI 容器集成：与 @sker/core 无缝集成，支持多实例配置
- RxJS Observable：原生支持 SSE（Server-Sent Events）流式响应
- Better Auth 集成：使用 better-fetch 和 Better Auth 实现现代化认证

**技术栈**：
- `@better-fetch/fetch` - 现代化的 fetch 包装器，提供类型安全和插件系统
- `better-auth` - 全栈认证框架，支持多种认证方式
- `rxjs` - 用于 SSE 流式响应的响应式编程

## 目录结构

```
packages/sdk/
├── src/
│   ├── controllers/           # API 控制器（客户端存根）
│   │   ├── charts.controller.ts           # 图表数据 API
│   │   ├── events.controller.ts           # 舆情事件 API
│   │   ├── keywords.controller.ts         # 关键词 API
│   │   ├── layout.controller.ts           # 布局配置 API
│   │   ├── llm-models.controller.ts       # LLM 模型管理
│   │   ├── llm-providers.controller.ts    # LLM 提供商管理
│   │   ├── llm-model-providers.controller.ts  # 模型-提供商关联
│   │   ├── llm-chat-logs.controller.ts    # LLM 调用日志统计
│   │   ├── overview.controller.ts         # 概览数据 API
│   │   ├── sentiment.controller.ts        # 情感分析 API
│   │   ├── system.controller.ts           # 系统状态 API
│   │   ├── upload.controller.ts           # 文件上传 API
│   │   ├── user-relation.controller.ts    # 用户关系网络
│   │   ├── users.controller.ts            # 用户数据 API
│   │   ├── workflow.controller.ts         # 工作流 API（含 SSE）
│   │   ├── persona.controller.ts          # Persona 记忆图谱
│   │   ├── prompt-roles.controller.ts     # Prompt 角色管理
│   │   └── prompt-skills.controller.ts    # Prompt 技能管理
│   ├── client.ts              # 客户端核心：装饰器元数据解析 + HTTP 请求生成
│   ├── auth.ts                # Better Auth 认证集成
│   ├── types.ts               # TypeScript 类型定义（200+ 接口）
│   ├── tokens.ts              # DI 注入令牌（BETTER_FETCH, BETTER_FETCH_CONFIG）
│   └── index.ts               # 统一导出入口
├── MIGRATION.md               # 从 axios 迁移到 better-fetch 的指南
├── package.json
└── tsup.config.ts             # 构建配置（ESM + CJS 双模块输出）
```

## 快速开始

### 1. 基础使用

```typescript
import { providers, WorkflowController } from '@sker/sdk'
import { root } from '@sker/core'

// 配置客户端
root.set([
  ...providers({
    baseURL: 'http://localhost:3000/api'
  })
])

// 获取控制器实例
const workflowController = root.get(WorkflowController)

// 调用 API
const workflows = await workflowController.getWorkflows()
```

### 2. 集成 Better Auth

```typescript
import { createAuthClient, createAuthenticatedClientConfig, providers } from '@sker/sdk'
import { root } from '@sker/core'

// 创建认证客户端
const auth = createAuthClient({
  baseURL: 'http://localhost:3000'
})

// 登录
await auth.signIn.email({
  email: 'user@example.com',
  password: 'password123'
})

// 配置带认证的 SDK
const { createAuthenticatedFetchConfig } = createAuthenticatedClientConfig({
  baseURL: 'http://localhost:3000'
})

root.set([
  ...providers(await createAuthenticatedFetchConfig())
])
```

### 3. SSE 流式响应

```typescript
import { WorkflowController } from '@sker/sdk'

const controller = root.get(WorkflowController)

// SSE 返回 Observable
controller.executeWorkflow({ id: '123' }).subscribe({
  next: (event) => console.log('收到事件:', event),
  error: (err) => console.error('错误:', err),
  complete: () => console.log('流结束')
})
```

## 架构设计

### 装饰器元数据驱动

SDK 通过读取 Controller 类的装饰器元数据自动生成客户端方法：

1. **路径解析**：读取 `@Controller()` 和 `@Get/@Post` 等装饰器的路径
2. **参数提取**：解析 `@Param()`, `@Query()`, `@Body()` 装饰器
3. **方法生成**：动态生成对应的 HTTP 请求方法
4. **类型推断**：保留完整的 TypeScript 类型信息

### Better Fetch 集成

使用 `@better-fetch/fetch` 替代 axios，提供：

- 更好的类型安全
- 基于原生 fetch API
- 插件系统支持
- Schema 验证（可选）

### 依赖注入

通过 `@sker/core` 的 DI 容器管理客户端实例：

```typescript
// 注册
root.set([...providers(config)])

// 获取
const controller = root.get(SomeController)
```

## API 参考

### providers(config)

创建 SDK 的 DI 提供者。

```typescript
type BetterFetchOption = {
  baseURL?: string
  headers?: Record<string, string>
  timeout?: number
  retry?: {
    type: 'linear' | 'exponential'
    attempts: number
    delay: number
  }
  // ... 更多选项
}

const providers = (config?: BetterFetchOption) => Provider[]
```

### createAuthClient(options)

创建 Better Auth 客户端实例。

```typescript
const auth = createAuthClient({
  baseURL: 'http://localhost:3000'
})

// 登录
await auth.signIn.email({ email, password })

// 登出
await auth.signOut()

// 获取会话（React）
const { data: session } = auth.useSession()
```

### createAuthenticatedClientConfig(options)

创建带认证的客户端配置。

```typescript
const { authClient, createAuthenticatedFetchConfig } = createAuthenticatedClientConfig({
  baseURL: 'http://localhost:3000',
  tokenStorage: {
    getToken: () => localStorage.getItem('token'),
    setToken: (token) => localStorage.setItem('token', token),
    removeToken: () => localStorage.removeItem('token')
  }
})
```

## 迁移指南

从 axios 版本迁移请参考 [MIGRATION.md](./MIGRATION.md)。
