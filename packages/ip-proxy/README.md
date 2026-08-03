# @sker/ip-proxy

IP 代理池工具库，基于 Redis 缓存实现智能轮询分配，支持 HTTP 客户端（Axios）代理与浏览器（Playwright）代理。

## 核心职责

- 代理池管理：`ProxyPool` 基于 Redis Sorted Set（`proxy_url -> use_count`）实现最少使用次数的轮询分配
- 代理获取与验证：批量异步验证（`ProxyValidator`，`Promise.all` 并发）、健康检查（`ProxyHealthChecker`）、评分（`ProxyScorer`）
- 过期管理：提前 30 秒判定过期（时间缓冲），自动刷新过期代理
- 接入层：`ProxyInterceptor`（Axios 自动代理注入）、`ProxyBrowserLauncher`（Playwright 浏览器代理）
- 提供商接入：`KuaidailiProvider`（快代理）+ `BaseProxyProvider` 抽象，便于扩展更多提供商
- 依赖注入：`createProxyProviders` 生成 Provider 数组，注册到 `@sker/core` DI 容器；同时提供 Hook API（`useProxy`）

## 目录结构

```
packages/ip-proxy/
├── src/
│   ├── index.ts                       # 导出入口 + createProxyProviders() 组装 DI Provider
│   ├── core/
│   │   ├── proxy-cache.ts             # 代理缓存（基于 @sker/redis）
│   │   ├── proxy-pool.ts              # 代理池：轮询分配 / 释放 / 刷新
│   │   ├── proxy-validator.ts         # 代理有效性验证
│   │   ├── proxy-health-checker.ts    # 健康检查
│   │   └── proxy-scorer.ts            # 代理评分
│   ├── providers/
│   │   ├── base-provider.ts           # BaseProxyProvider 抽象基类
│   │   ├── kuaidaili-provider.ts      # 快代理提供商（KUAIDAILI_CONFIG）
│   │   └── index.ts                   # 提供商导出
│   ├── interceptors/
│   │   ├── axios-interceptor.ts       # ProxyInterceptor：Axios 自动代理注入
│   │   └── browser-launcher.ts        # ProxyBrowserLauncher：Playwright 代理启动
│   ├── hooks/
│   │   └── use-proxy.ts               # useProxy Hook（ProxyManager）
│   ├── constants/
│   │   └── cache-keys.ts              # Redis 缓存键枚举（CacheKeys）
│   ├── errors/
│   │   └── proxy-errors.ts            # ProxyError 系列错误类
│   ├── types/
│   │   ├── index.ts                   # 类型导出
│   │   ├── proxy.types.ts             # ProxyInfo / ValidationResult 等
│   │   ├── provider.types.ts          # 提供商配置类型
│   │   └── axios.d.ts                 # Axios 类型扩展
│   └── utils/
│       ├── proxy-url-parser.ts        # 代理 URL 解析
│       └── time.ts                    # 时间工具
├── examples/
│   └── usage.ts                       # 使用示例
├── __tests__ / vitest.config.ts       # Vitest 测试
├── package.json
├── tsconfig.json
└── tsup.config.ts                     # 构建配置
```

## 边界

- **✅ 负责**：代理 IP 的获取、验证、健康检查、评分、轮询分配与过期刷新；Axios/Playwright 接入；多提供商抽象
- **❌ 不负责**：具体业务请求的重试与降级策略（由调用方在拦截器外层实现）；代理商的账号管理/计费；非 HTTP(S) 协议的代理（如 SOCKS 场景需扩展）
- **对外依赖**：`@sker/core`（DI、Logger、AppError）、`@sker/redis`（缓存）；外部：`axios`；peer（可选）：`playwright`
- **被谁依赖**：`apps/api`、`packages/workflow-run`（`ProxyAutoSelectAstVisitor`）、`packages/nlp`（通过 `@sker/nlp` 依赖链使用代理客户端）

## 快速开始

```typescript
import { root } from '@sker/core';
import { createProxyProviders, useProxy } from '@sker/ip-proxy';

root.set(
  createProxyProviders({
    kuaidaili: {
      secretId: process.env.KUAIDAILI_SECRET_ID!,
      secretKey: process.env.KUAIDAILI_SECRET_KEY!,
      username: process.env.KUAIDAILI_USERNAME!,
      password: process.env.KUAIDAILI_PASSWORD!,
    },
    validator: { testUrl: 'https://httpbin.org/ip', timeout: 5000 },
  })
);
await root.init();

const proxy = useProxy();
const proxyInfo = await proxy.getProxy();
console.log('代理URL:', proxyInfo.url);

// HTTP 客户端代理
const axiosWithProxy = proxy.createAxios({ baseURL: 'https://api.weibo.com' });
const res = await axiosWithProxy.get('/v2/search/topics');

// 浏览器代理
const browser = await proxy.launchBrowser('chromium', { headless: true });
await browser.close();
```

## API

### ProxyManager（`useProxy()`）

| 方法 | 说明 |
| --- | --- |
| `getProxy(): Promise<ProxyInfo>` | 获取可用代理（自动刷新过期） |
| `getProxies(count: number): Promise<ProxyInfo[]>` | 批量获取代理 |
| `releaseProxy(url: string): Promise<void>` | 释放代理（减少使用计数） |
| `refreshExpired(): Promise<void>` | 手动刷新所有过期代理 |
| `createAxios(config?): AxiosInstance` | 创建带自动代理注入的 Axios 实例 |
| `launchBrowser(type, options?): Promise<Browser>` | 启动带代理的 Playwright 浏览器 |

### 错误类（继承 `@sker/core` 的 `AppError`）

`ProxyError` / `ProxyFetchError` / `ProxyValidationError` / `ProxyPoolExhaustedError`

## License

MIT
