# @sker/crawler-core

爬虫核心工具包，提供 HTTP 客户端、浏览器管理等基础设施。

## 目录结构

```
src/
├── http/                           # HTTP 客户端模块
│   ├── http-client.ts             # HttpClient 核心类
│   ├── cookie-jar.ts              # Cookie 管理器
│   ├── retry.ts                   # 重试处理器
│   ├── types.ts                   # 类型定义
│   ├── index.ts                   # 模块导出
│   └── example.ts                 # 使用示例
├── browser/                        # 浏览器管理模块
│   ├── manager.ts                 # BrowserManager 浏览器池
│   ├── cdp.ts                     # CDP 协议封装
│   ├── stealth.ts                 # 反检测脚本
│   └── types.ts                   # 类型定义
├── store/                          # 存储策略模块
│   ├── json.store.ts              # JSON 文件存储
│   ├── csv.store.ts               # CSV 文件存储
│   ├── excel.store.ts             # Excel 文件存储
│   ├── database.store.ts          # 数据库存储
│   ├── factory.ts                 # 存储工厂
│   └── index.ts                   # 模块导出
├── abstract-crawler.ts             # 爬虫抽象基类
├── crawler.interface.ts            # 爬虫接口定义
├── login.interface.ts              # 登录接口定义
├── store.interface.ts              # 存储接口定义
├── types.ts                        # 通用类型定义
└── index.ts                        # 统一导出
```

## HTTP 客户端模块

### HttpClient 核心类

基于 axios 封装的 HTTP 客户端，专为爬虫场景设计。

**特性：**
- Cookie 自动管理和持久化
- 代理支持（HTTP/HTTPS/SOCKS5）
- 自动重试（指数退避）
- 请求/响应拦截器
- 请求签名支持
- 请求日志

**基础使用：**

```typescript
import { HttpClient } from '@sker/crawler-core';

const client = new HttpClient({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  enableCookies: true,
  enableLogging: true,
});

const response = await client.get('/users');
```

**配置选项：**

```typescript
interface HttpClientConfig {
  baseURL?: string;              // 基础 URL
  timeout?: number;              // 超时时间（默认 30000ms）
  headers?: Record<string, string>;  // 默认请求头
  proxy?: HttpProxyConfig;       // 代理配置
  retry?: Partial<RetryConfig>;  // 重试配置
  enableCookies?: boolean;       // 启用 Cookie 管理
  enableLogging?: boolean;       // 启用请求日志
}
```

### CookieJar Cookie 管理器

基于 tough-cookie 实现的 Cookie 管理器。

**功能：**
- 自动管理 Cookie
- Cookie 持久化（序列化/反序列化）
- 支持 Cookie 作用域

**使用示例：**

```typescript
const client = new HttpClient({ enableCookies: true });

// 发送请求，自动保存 Cookie
await client.get('https://example.com/login');

// 序列化 Cookie
const cookies = await client.saveCookies();

// 在新客户端中加载 Cookie
const newClient = new HttpClient({ enableCookies: true });
await newClient.loadCookies(cookies);
```

### RetryHandler 重试处理器

实现指数退避的自动重试机制。

**默认配置：**

```typescript
{
  maxRetries: 3,                 // 最大重试次数
  baseDelay: 1000,               // 基础延迟（ms）
  maxDelay: 30000,               // 最大延迟（ms）
  retryableStatuses: [408, 429, 500, 502, 503, 504]  // 可重试的状态码
}
```

**重试策略：**
- 延迟计算：`delay = baseDelay * 2^retryCount`
- 最大延迟限制：`min(delay, maxDelay)`
- 自动判断是否可重试

### 代理配置

支持三种代理协议：HTTP、HTTPS、SOCKS5。

**HTTP/HTTPS 代理：**

```typescript
const client = new HttpClient({
  proxy: {
    protocol: 'http',
    host: '127.0.0.1',
    port: 8080,
    auth: {
      username: 'user',
      password: 'pass',
    },
  },
});
```

**SOCKS5 代理：**

```typescript
const client = new HttpClient({
  proxy: {
    protocol: 'socks5',
    host: '127.0.0.1',
    port: 1080,
  },
});
```

### 请求签名

为各平台签名算法预留接口。

**实现签名提供者：**

```typescript
import { SignatureProvider } from '@sker/crawler-core';
import type { InternalAxiosRequestConfig } from 'axios';

class WeiboSignature implements SignatureProvider {
  sign(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    const timestamp = Date.now();
    config.headers['X-Timestamp'] = timestamp.toString();
    config.headers['X-Signature'] = this.generateSignature(config, timestamp);
    return config;
  }

  private generateSignature(config: InternalAxiosRequestConfig, timestamp: number): string {
    // 实现签名算法
    return `signature_${timestamp}`;
  }
}

// 使用
const client = new HttpClient();
client.setSignatureProvider(new WeiboSignature());
```

### 拦截器

支持请求和响应拦截器。

**请求拦截器：**

```typescript
client.addRequestInterceptor({
  onRequest: (config) => {
    config.headers['User-Agent'] = 'Custom UA';
    return config;
  },
  onRequestError: (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  },
});
```

**响应拦截器：**

```typescript
client.addResponseInterceptor({
  onResponse: (response) => {
    console.log('Response:', response.status);
    return response;
  },
  onResponseError: (error) => {
    console.error('Response error:', error);
    return Promise.reject(error);
  },
});
```

## 浏览器管理模块

### BrowserManager 浏览器池

管理 Playwright 浏览器实例池。

**特性：**
- 浏览器实例复用
- 自动清理空闲实例
- 存储状态管理（Cookie、LocalStorage）

### CDPBrowser CDP 协议封装

封装 Chrome DevTools Protocol 操作。

**功能：**
- 连接远程浏览器
- 设置 User-Agent
- 设置额外请求头
- Cookie 管理
- 清除缓存

### STEALTH_SCRIPT 反检测脚本

绕过常见的浏览器自动化检测。

**绕过项：**
- WebDriver 检测
- Chrome 对象模拟
- Permissions API
- Plugins 长度
- Languages 修复

## 爬虫抽象基类

### AbstractCrawler

所有平台爬虫的抽象基类。

**必须实现的方法：**

```typescript
abstract class AbstractCrawler {
  abstract readonly platform: string;
  abstract readonly login: ILogin;
  abstract readonly store: IStore;

  abstract search(options: SearchOptions): Promise<ContentItem[]>;
  abstract getDetail(contentId: string): Promise<ContentItem>;
  abstract getComments(contentId: string, maxCount?: number): Promise<CommentItem[]>;
  abstract getCreator(creatorId: string): Promise<CreatorItem>;
}
```

**生命周期钩子：**

```typescript
protected async onStart(): Promise<void> {}
protected async onClose(): Promise<void> {}
```

## 类型定义

### ContentItem 内容项

```typescript
interface ContentItem {
  id: string;
  platform: string;
  authorId: string;
  authorName: string;
  title?: string;
  content: string;
  publishTime: Date;
  url: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount?: number;
  images?: string[];
  videos?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}
```

### CommentItem 评论项

```typescript
interface CommentItem {
  id: string;
  contentId: string;
  authorId: string;
  authorName: string;
  content: string;
  publishTime: Date;
  likeCount: number;
  replyCount?: number;
  parentId?: string;
  metadata?: Record<string, any>;
}
```

### CreatorItem 创作者

```typescript
interface CreatorItem {
  id: string;
  platform: string;
  name: string;
  avatar?: string;
  description?: string;
  followersCount: number;
  followingCount?: number;
  postsCount?: number;
  verified: boolean;
  url: string;
  metadata?: Record<string, any>;
}
```

## 最佳实践

### 1. Cookie 持久化

```typescript
// 保存 Cookie 到文件
const cookies = await client.saveCookies();
await fs.writeFile('cookies.json', cookies);

// 从文件加载 Cookie
const cookies = await fs.readFile('cookies.json', 'utf-8');
await client.loadCookies(cookies);
```

### 2. 代理轮换

```typescript
const proxies = [
  { protocol: 'socks5', host: '127.0.0.1', port: 1080 },
  { protocol: 'socks5', host: '127.0.0.1', port: 1081 },
];

let currentProxy = 0;
const getClient = () => {
  const proxy = proxies[currentProxy];
  currentProxy = (currentProxy + 1) % proxies.length;
  return new HttpClient({ proxy });
};
```

### 3. 请求限流

```typescript
import pLimit from 'p-limit';

const limit = pLimit(5); // 最多 5 个并发请求

const tasks = urls.map(url =>
  limit(() => client.get(url))
);

await Promise.all(tasks);
```

### 4. 错误处理

```typescript
try {
  const response = await client.get('/api/data');
} catch (error) {
  if (error.response?.status === 429) {
    // 处理限流
    await sleep(60000);
  } else if (error.response?.status === 403) {
    // 处理封禁
    await refreshCookies();
  } else {
    throw error;
  }
}
```

## 存储策略模块

提供多种数据存储方式，支持 JSON、CSV、Excel 和数据库存储。

### JsonStore JSON 文件存储

```typescript
import { JsonStore } from '@sker/crawler-core';

const store = new JsonStore('./data');
await store.storeContent(contentItem);
```

### CsvStore CSV 文件存储

```typescript
import { CsvStore } from '@sker/crawler-core';

const store = new CsvStore('./data');
await store.storeContent(contentItem);
```

### ExcelStore Excel 文件存储

基于 exceljs 实现。

```typescript
import { ExcelStore } from '@sker/crawler-core';

const store = new ExcelStore('./data');
await store.storeContent(contentItem);
```

### DatabaseStore 数据库存储

支持 TypeORM 所有数据库类型（SQLite、MySQL、PostgreSQL、MongoDB 等）。

```typescript
import { DatabaseStore } from '@sker/crawler-core';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'sqlite',
  database: './data.db',
  entities: [ContentEntity, CommentEntity, CreatorEntity],
  synchronize: true
});

await dataSource.initialize();

const store = new DatabaseStore(dataSource, {
  content: ContentEntity,
  comment: CommentEntity,
  creator: CreatorEntity
});

await store.storeContent(contentItem);
```

### StoreFactory 存储工厂

统一创建存储实例。

```typescript
import { StoreFactory } from '@sker/crawler-core';

// JSON 存储
const jsonStore = StoreFactory.create({
  type: 'json',
  baseDir: './data/json'
});

// CSV 存储
const csvStore = StoreFactory.create({
  type: 'csv',
  baseDir: './data/csv'
});

// Excel 存储
const excelStore = StoreFactory.create({
  type: 'excel',
  baseDir: './data/excel'
});

// 数据库存储
const dbStore = StoreFactory.create({
  type: 'database',
  database: {
    dataSource,
    entities: {
      content: ContentEntity,
      comment: CommentEntity,
      creator: CreatorEntity
    }
  }
});
```

