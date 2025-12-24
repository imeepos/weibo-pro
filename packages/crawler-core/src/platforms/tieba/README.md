# 贴吧爬虫模块

基于 Playwright 的百度贴吧爬虫实现。

## 核心文件

- `tieba-client.ts` - API 客户端，封装贴吧搜索、详情、评论接口
- `tieba-crawler.ts` - 爬虫实现，继承 AbstractCrawler
- `tieba-login.ts` - 登录实现，支持二维码和 Cookie 登录
- `example.ts` - 使用示例

## 功能特性

- 关键词搜索帖子
- 获取帖子详情
- 获取帖子评论
- 二维码登录
- Cookie 持久化

## 使用示例

```typescript
import { EnvironmentInjector } from '@sker/core'
import { BrowserManager, JsonStore } from '@sker/crawler-core'
import { TiebaCrawler, TiebaLogin, TiebaClient } from '@sker/crawler-core'

const injector = EnvironmentInjector.createWithAutoProviders([
  { provide: BrowserManager, useClass: BrowserManager },
  { provide: TiebaClient, useClass: TiebaClient },
  { provide: TiebaLogin, useClass: TiebaLogin },
  { provide: JsonStore, useValue: new JsonStore('./data/tieba') },
  { provide: TiebaCrawler, useClass: TiebaCrawler },
])

const crawler = injector.get(TiebaCrawler)

// 搜索帖子
const contents = await crawler.search({
  keyword: '编程',
  maxCount: 10,
  sortBy: 'time',
})

// 获取详情
const detail = await crawler.getDetail(contentId)

// 获取评论
const comments = await crawler.getComments(contentId, 20)
```

## 实现说明

### TiebaClient

使用 Playwright 访问贴吧页面，通过 DOM 解析提取数据：

- `searchByKeyword()` - 搜索帖子列表
- `getNoteDetail()` - 获取帖子详情
- `getComments()` - 获取帖子评论
- `pong()` - 检查登录状态（通过 Cookie）

### TiebaCrawler

实现 AbstractCrawler 接口：

- `search()` - 搜索内容并转换为标准格式
- `getDetail()` - 获取详情并转换为标准格式
- `getComments()` - 获取评论并转换为标准格式
- `getCreator()` - 获取创作者信息

### TiebaLogin

实现 ILogin 接口：

- `loginByQrcode()` - 二维码登录
- `loginByCookie()` - Cookie 登录
- `isLoggedIn()` - 检查登录状态

## 技术要点

1. **最小化实现** - 只实现核心功能，避免过度设计
2. **依赖注入** - 使用 @sker/core 的 EnvironmentInjector
3. **类型安全** - 完整的 TypeScript 类型定义
4. **浏览器自动化** - 基于 Playwright 绕过反爬检测
5. **Cookie 管理** - 支持 Cookie 持久化和复用
