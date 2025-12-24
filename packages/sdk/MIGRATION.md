# @sker/sdk - 使用 Better Auth 的迁移指南

## 概述

SDK 已从 axios 迁移到 better-fetch + Better Auth，提供更好的类型安全和认证集成。

## 主要变更

### 1. 依赖变更

**移除：**
- `axios`

**新增：**
- `@better-fetch/fetch` - 现代化的 fetch 包装器
- `better-auth` - 认证客户端库

### 2. API 变更

#### 旧的用法（axios）

```typescript
import { providers, AXIOS_CONFIG } from '@sker/sdk'
import { root } from '@sker/core'

root.set([
  ...providers({
    baseURL: 'http://localhost:3000/api'
  })
])
```

#### 新的用法（better-fetch）

```typescript
import { providers, BETTER_FETCH_CONFIG } from '@sker/sdk'
import { root } from '@sker/core'

root.set([
  ...providers({
    baseURL: 'http://localhost:3000/api'
  })
])
```

配置选项与之前基本相同，但现在使用 `BetterFetchOption` 类型（与 axios 的 `AxiosRequestConfig` 兼容）。

### 3. Better Auth 集成

#### 基本认证功能

```typescript
import { createAuthClient } from '@sker/sdk'

// 创建认证客户端
const auth = createAuthClient({
  baseURL: 'http://localhost:3000'
})

// 登录
await auth.signIn.email({
  email: 'user@example.com',
  password: 'password123'
})

// 登出
await auth.signOut()

// 获取当前会话（React 示例）
const { data: session } = auth.useSession()
```

#### 带认证的 API 客户端

```typescript
import {
  providers,
  createAuthenticatedClientConfig,
  WorkflowController
} from '@sker/sdk'
import { root } from '@sker/core'

// 创建带认证的配置
const { authClient, createAuthenticatedFetchConfig } = createAuthenticatedClientConfig({
  baseURL: 'http://localhost:3000'
})

// 设置 SDK 提供者
root.set([
  ...providers(await createAuthenticatedFetchConfig())
])

// 使用控制器
const workflowController = root.get(WorkflowController)
const workflows = await workflowController.getWorkflows()
```

#### 自定义 Token 存储

```typescript
import { createAuthenticatedClientConfig } from '@sker/sdk'

const config = createAuthenticatedClientConfig({
  baseURL: 'http://localhost:3000',
  tokenStorage: {
    getToken: async () => {
      // 从你的存储中获取 token（如 localStorage、AsyncStorage 等）
      return localStorage.getItem('auth_token')
    },
    setToken: async (token: string) => {
      localStorage.setItem('auth_token', token)
    },
    removeToken: async () => {
      localStorage.removeItem('auth_token')
    }
  }
})
```

### 4. 响应格式

SDK 继续支持后端的标准响应格式：

```typescript
{
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
  }
}
```

当 `success: true` 时，SDK 自动解包并返回 `data` 字段。

### 5. 错误处理

```typescript
try {
  const result = await controller.someMethod()
  // 成功处理
} catch (error) {
  // error.message 包含详细的错误信息
  console.error('API 错误:', error.message)
}
```

### 6. SSE（Server-Sent Events）

SSE 功能保持不变，仍然使用原生 fetch API 处理流式响应：

```typescript
import { WorkflowController } from '@sker/sdk'
import { root } from '@sker/core'

const controller = root.get(WorkflowController)

// SSE 方法返回 Observable
controller.executeWorkflow({ id: '123' }).subscribe({
  next: (event) => console.log('收到事件:', event),
  error: (err) => console.error('错误:', err),
  complete: () => console.log('流结束')
})
```

## 迁移步骤

1. **更新依赖**：运行 `pnpm install` 安装新的依赖
2. **更新导入**：将 `AXIOS_CONFIG` 改为 `BETTER_FETCH_CONFIG`
3. **测试 API 调用**：确保所有 API 调用正常工作
4. **添加认证**：如需要，集成 Better Auth 认证功能

## 优势

- **类型安全**：Better Fetch 提供更好的 TypeScript 类型推断
- **现代化**：基于原生 fetch API，支持最新的 Web 标准
- **认证集成**：无缝集成 Better Auth，自动处理 token
- **插件系统**：支持通过插件扩展功能
- **Schema 验证**：可选的运行时响应验证（使用 zod 等）

## 参考资源

- [Better Fetch 文档](https://better-fetch.vercel.app/)
- [Better Auth 文档](https://www.better-auth.com/)
- [Better Auth GitHub](https://github.com/better-auth/better-auth)
