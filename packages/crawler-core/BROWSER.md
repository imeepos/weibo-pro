# @sker/crawler-core - Browser Module

Playwright 浏览器封装模块，提供浏览器实例池管理、CDP 支持和反检测能力。

## 核心特性

- **浏览器实例池**: 自动管理浏览器实例复用，提升性能
- **CDP 模式**: 支持 Chrome DevTools Protocol 连接和控制
- **反检测**: 内置 Stealth 脚本，绕过常见爬虫检测
- **存储管理**: Cookie 和 LocalStorage 持久化
- **多浏览器**: 支持 Chromium/Firefox/WebKit

## 安装

```bash
pnpm add playwright
```

## 使用示例

### 基础使用

```typescript
import { BrowserManager } from '@sker/crawler-core';

const manager = new BrowserManager();

const { browser, context } = await manager.launch({
  headless: false,
  viewport: { width: 1920, height: 1080 },
});

const page = await context.newPage();
await page.goto('https://weibo.com');

await manager.release(browser);
```

### 使用代理

```typescript
const { browser, context } = await manager.launch({
  proxy: {
    server: 'http://proxy.example.com:8080',
    username: 'user',
    password: 'pass',
  },
});
```

### CDP 模式

```typescript
import { CDPBrowser } from '@sker/crawler-core';

const cdp = new CDPBrowser();
await cdp.connect('http://localhost:9222');

const page = await context.newPage();
const session = await cdp.createSession(page);

await cdp.setUserAgent('Custom User Agent');
await cdp.setExtraHeaders({ 'X-Custom': 'value' });
```

### 存储持久化

```typescript
// 保存
await manager.saveStorage(context, './storage.json');

// 加载
await manager.loadStorage(context, state);
```

## API

### BrowserManager

#### `constructor(maxPoolSize?: number, idleTimeout?: number)`

- `maxPoolSize`: 最大实例数，默认 5
- `idleTimeout`: 空闲超时（毫秒），默认 300000

#### `launch(config?: BrowserConfig)`

启动浏览器实例，返回 `{ browser, context }`

#### `release(browser: Browser)`

释放浏览器实例回池中

#### `close(browser: Browser)`

关闭指定浏览器实例

#### `closeAll()`

关闭所有浏览器实例

### CDPBrowser

#### `connect(endpoint: string)`

连接到 CDP 端点

#### `createSession(page: Page)`

为页面创建 CDP 会话

#### `send(method: string, params?: object)`

发送 CDP 命令

#### `enableNetwork()`

启用网络监控

#### `setUserAgent(userAgent: string)`

设置 User Agent

#### `setExtraHeaders(headers: Record<string, string>)`

设置额外 HTTP 头

## 配置选项

```typescript
interface BrowserConfig {
  headless?: boolean;              // 无头模式
  proxy?: ProxyConfig;             // 代理配置
  userAgent?: string;              // User Agent
  viewport?: { width: number; height: number }; // 视口大小
  locale?: string;                 // 语言，默认 'zh-CN'
  timezone?: string;               // 时区，默认 'Asia/Shanghai'
  cdpEndpoint?: string;            // CDP 端点
}
```

## 实现细节

- 基于 Playwright Node.js API
- 自动注入反检测脚本
- 实例池采用 LRU 策略
- 支持多浏览器类型切换
