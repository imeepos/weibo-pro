# 微博爬虫模块

基于 @sker/crawler-core 实现的微博平台爬虫。

## 模块结构

```
platforms/weibo/
├── weibo-client.ts    # API 客户端（HTTP 请求封装）
├── weibo-login.ts     # 登录实现（二维码/Cookie）
├── weibo-crawler.ts   # 爬虫核心（搜索/详情/评论）
├── index.ts           # 模块导出
└── example.ts         # 使用示例
```

## 核心功能

### WeiboClient
- 搜索微博（关键词、分页、排序）
- 获取微博详情
- 获取评论列表
- 获取用户信息
- Cookie 管理

### WeiboLogin
- 二维码登录
- Cookie 登录
- 登录状态检查

### WeiboCrawler
- 继承 AbstractCrawler
- 实现 ICrawler 接口
- 统一的数据格式转换

## 使用示例

```typescript
import { Container } from '@sker/core'
import { BrowserManager, JsonStore, WeiboCrawler, WeiboLogin, WeiboClient } from '@sker/crawler-core'

const container = new Container()
container.register(BrowserManager)
container.register(WeiboClient)
container.register(WeiboLogin)
container.register(JsonStore, { useValue: new JsonStore('./data') })
container.register(WeiboCrawler)

const crawler = container.resolve(WeiboCrawler)

// 启动并登录
await crawler.start()

// 搜索
const contents = await crawler.search({ keyword: 'AI', maxCount: 10 })

// 获取详情
const detail = await crawler.getDetail(contents[0].id)

// 获取评论
const comments = await crawler.getComments(contents[0].id, 20)

// 获取用户
const creator = await crawler.getCreator('1234567890')

await crawler.close()
```

## 设计原则

- **最小化实现**：只实现核心功能，无冗余代码
- **依赖注入**：使用 @sker/core 容器管理依赖
- **接口统一**：遵循 AbstractCrawler 和 ICrawler 规范
- **类型安全**：完整的 TypeScript 类型定义
