# @sker/ip-proxy

IP 代理池工具库，支持 HTTP 客户端代理和浏览器代理，基于 Redis 缓存实现智能轮询分配。

## 特性

- ✅ **HTTP 客户端代理** - Axios 自动代理注入
- ✅ **浏览器代理** - Playwright 代理配置支持
- ✅ **Redis 缓存** - 基于 Sorted Set 的轮询分配策略
- ✅ **批量异步验证** - 并发验证代理 IP 有效性
- ✅ **自动刷新** - 过期检测与自动重新获取
- ✅ **时间缓冲** - 提前 30 秒判定过期，避免临界失败
- ✅ **DI 集成** - 完全集成 @sker/core 依赖注入容器
- ✅ **类型安全** - 完整的 TypeScript 类型定义

## 安装

```bash
pnpm add @sker/ip-proxy
```

## 快速开始

### 1. 配置依赖注入

```typescript
import { root } from '@sker/core'
import { createProxyProviders } from '@sker/ip-proxy'

root.set(
  createProxyProviders({
    kuaidaili: {
      secretId: process.env.KUAIDAILI_SECRET_ID!,
      secretKey: process.env.KUAIDAILI_SECRET_KEY!,
      username: process.env.KUAIDAILI_USERNAME!,
      password: process.env.KUAIDAILI_PASSWORD!,
    },
    validator: {
      testUrl: 'https://httpbin.org/ip',
      timeout: 5000,
    },
  })
)

await root.init()
```

### 2. 使用 Hook API

```typescript
import { useProxy } from '@sker/ip-proxy'

const proxy = useProxy()

// 获取代理 IP
const proxyInfo = await proxy.getProxy()
console.log('代理URL:', proxyInfo.url)
console.log('过期时间:', new Date(proxyInfo.expiresAt))

// 释放代理（减少使用计数）
await proxy.releaseProxy(proxyInfo.url)
```

### 3. HTTP 客户端代理

```typescript
const axiosWithProxy = proxy.createAxios({
  baseURL: 'https://api.weibo.com',
  timeout: 10000,
})

// 自动使用代理发送请求
const response = await axiosWithProxy.get('/v2/search/topics')
```

### 4. 浏览器代理

```typescript
const browser = await proxy.launchBrowser('chromium', {
  headless: true,
})

const page = await browser.newPage()
await page.goto('https://weibo.com')

await browser.close()
```

## API 文档

### `useProxy(options?: ProxyOptions): ProxyManager`

创建代理管理器实例。

#### 返回值 `ProxyManager`

| 方法                                              | 说明                           |
| ------------------------------------------------- | ------------------------------ |
| `getProxy(): Promise<ProxyInfo>`                  | 获取可用代理（自动刷新过期）   |
| `getProxies(count: number): Promise<ProxyInfo[]>` | 批量获取代理                   |
| `releaseProxy(url: string): Promise<void>`        | 释放代理（减少使用计数）       |
| `refreshExpired(): Promise<void>`                 | 手动刷新所有过期代理           |
| `createAxios(config?): AxiosInstance`             | 创建带自动代理注入的 Axios实例 |
| `launchBrowser(type, options?): Promise<Browser>` | 启动带代理的 Playwright 浏览器 |

### `createProxyProviders(config): Provider[]`

创建代理提供商 Providers，用于注册到 DI 容器。

#### 配置项

```typescript
interface ProxyProvidersConfig {
  // 快代理配置
  kuaidaili: {
    secretId: string // 快代理 secret_id
    secretKey: string // 快代理 secret_key
    username: string // 快代理认证用户名
    password: string // 快代理认证密码
  }

  // 验证器配置（可选）
  validator?: {
    testUrl?: string // 验证代理的测试URL，默认 https://httpbin.org/ip
    timeout?: number // 验证超时时间（毫秒），默认 5000
  }
}
```

## 类型定义

### `ProxyInfo`

```typescript
interface ProxyInfo {
  url: string // 代理URL，格式：http://user:pass@ip:port
  expiresAt: number // 过期时间戳（毫秒）
  provider: string // 提供商名称
  createdAt: number // 创建时间戳（毫秒）
}
```

### `ValidationResult`

```typescript
interface ValidationResult {
  proxyUrl: string // 代理URL
  valid: boolean // 是否有效
  latency: number // 延迟（毫秒）
  error: string | null // 错误信息
}
```

## 核心设计

### 轮询分配策略

使用 Redis Sorted Set 存储 `proxy_url -> use_count`，每次获取使用次数最少的代理：

- 获取代理：`ZRANGE ip_proxy:use_counts 0 0`
- 使用后：`ZINCRBY ip_proxy:use_counts 1 proxy_url`
- 释放后：`ZINCRBY ip_proxy:use_counts -1 proxy_url`

### 时间缓冲机制

提前 30 秒判定代理过期，避免临界时间使用导致请求失败：

```typescript
const now = Date.now()
const isExpired = now >= proxyInfo.expiresAt - 30000 // 提前30秒
```

### 批量异步验证

使用 `Promise.all` 并发验证代理 IP，大幅提升初始化速度：

```typescript
const results = await Promise.all(proxies.map((p) => validateProxy(p)))
```

## 错误处理

所有错误继承自 `@sker/core` 的 `AppError`：

| 错误类                    | 说明                   |
| ------------------------- | ---------------------- |
| `ProxyError`              | 代理相关的基础错误     |
| `ProxyFetchError`         | 从提供商获取代理失败   |
| `ProxyValidationError`    | 代理验证失败           |
| `ProxyPoolExhaustedError` | 代理池耗尽，无可用代理 |

## 相比 MediaCrawler 的改进

| 改进点           | MediaCrawler（Python）    | @sker/ip-proxy（TypeScript）        |
| ---------------- | ------------------------- | ----------------------------------- |
| 分配策略         | 随机选择 + 一次性消费     | 基于使用次数的轮询分配              |
| 验证方式         | 串行验证，阻塞初始化      | 批量异步验证，并发执行              |
| 缓存键管理       | 硬编码字符串              | 枚举统一管理                        |
| 类型安全         | 无类型检查                | 完整 TypeScript 类型定义            |
| 依赖注入         | 无                        | 完全集成 @sker/core DI 容器         |
| API 设计         | 类方法调用                | Hook API（useProxy）+ 类方法双模式 |
| 浏览器代理支持   | 仅 Playwright CDP         | Playwright 完整支持                 |
| 时间缓冲         | 提前 5 秒（单层）         | 提前 30 秒（双层缓冲）              |
| 错误处理         | 通用 Exception            | 专用错误类 + ErrorFactory           |

## 依赖

- `@sker/core` - 依赖注入容器和日志系统
- `@sker/redis` - Redis 客户端
- `axios` - HTTP 客户端
- `playwright` - 浏览器自动化（可选）

## License

MIT
