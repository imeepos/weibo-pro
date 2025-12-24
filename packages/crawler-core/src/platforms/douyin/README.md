# 抖音爬虫模块

基于 @sker/crawler-core 实现的抖音平台爬虫。

## 功能特性

- 视频搜索
- 视频详情获取
- 评论爬取
- 创作者信息获取
- 二维码登录
- Cookie 登录

## 核心类

### DouyinClient

API 客户端，封装抖音 Web API 调用。

**主要方法：**
- `searchVideos(keyword, offset, count)` - 搜索视频
- `getVideoDetail(awemeId)` - 获取视频详情
- `getComments(awemeId, cursor, count)` - 获取评论
- `getCreatorInfo(secUid)` - 获取创作者信息
- `loadCookies(cookies)` - 加载 Cookie
- `saveCookies()` - 保存 Cookie

### DouyinLogin

登录实现，支持二维码和 Cookie 登录。

**主要方法：**
- `begin()` - 开始登录流程
- `loginByQrcode()` - 二维码登录
- `loginByCookie(cookies)` - Cookie 登录
- `isLoggedIn()` - 检查登录状态

### DouyinCrawler

爬虫实现，继承 AbstractCrawler。

**主要方法：**
- `search(options)` - 搜索内容
- `getDetail(contentId)` - 获取详情
- `getComments(contentId, maxCount)` - 获取评论
- `getCreator(creatorId)` - 获取创作者

## 使用示例

```typescript
import { Container } from '@sker/core'
import { BrowserManager, JsonStore } from '@sker/crawler-core'
import { DouyinClient, DouyinLogin, DouyinCrawler } from '@sker/crawler-core'

const container = new Container()

// 注册依赖
container.register(BrowserManager)
container.register(DouyinClient)
container.register(DouyinLogin)
container.register(JsonStore, {
  useFactory: () => new JsonStore('./data/douyin'),
})
container.register(DouyinCrawler)

// 获取爬虫实例
const crawler = container.resolve(DouyinCrawler)

// 启动爬虫
await crawler.start()

// 搜索视频
const videos = await crawler.search({
  keyword: '美食',
  maxCount: 10,
})

// 获取视频详情
const detail = await crawler.getDetail(videos[0].id)

// 获取评论
const comments = await crawler.getComments(videos[0].id, 20)

// 获取创作者信息
const creator = await crawler.getCreator(videos[0].authorId)

// 关闭爬虫
await crawler.close()
```

## Cookie 登录

```typescript
// 保存 Cookie
const cookies = await crawler.client.saveCookies()
await fs.writeFile('douyin-cookies.json', cookies)

// 加载 Cookie
const cookies = await fs.readFile('douyin-cookies.json', 'utf-8')
await crawler.login.loginByCookie(JSON.parse(cookies))
```

## 注意事项

1. **X-Bogus 签名**：当前实现未包含 X-Bogus 签名算法，可能需要补充 JS 签名脚本
2. **请求频率**：建议控制请求频率，避免触发反爬机制
3. **登录状态**：定期检查登录状态，Cookie 可能过期
4. **数据存储**：支持 JSON、CSV、Excel、数据库等多种存储方式

## API 端点

- 搜索：`/aweme/v1/web/general/search/single/`
- 视频详情：`/aweme/v1/web/aweme/detail/`
- 评论列表：`/aweme/v1/web/comment/list/`
- 创作者信息：`/aweme/v1/web/aweme/post/`

## 数据结构

### ContentItem

```typescript
{
  id: string              // 视频 ID
  platform: 'douyin'      // 平台标识
  authorId: string        // 作者 ID
  authorName: string      // 作者昵称
  title?: string          // 标题
  content: string         // 描述
  publishTime: Date       // 发布时间
  url: string             // 视频链接
  likeCount: number       // 点赞数
  commentCount: number    // 评论数
  shareCount: number      // 分享数
  viewCount?: number      // 播放数
  videos?: string[]       // 视频链接
  images?: string[]       // 图片链接
  tags?: string[]         // 标签
  metadata?: any          // 原始数据
}
```

### CommentItem

```typescript
{
  id: string              // 评论 ID
  contentId: string       // 视频 ID
  authorId: string        // 评论者 ID
  authorName: string      // 评论者昵称
  content: string         // 评论内容
  publishTime: Date       // 发布时间
  likeCount: number       // 点赞数
  replyCount?: number     // 回复数
  parentId?: string       // 父评论 ID
  metadata?: any          // 原始数据
}
```

### CreatorItem

```typescript
{
  id: string              // 创作者 ID
  platform: 'douyin'      // 平台标识
  name: string            // 昵称
  avatar?: string         // 头像
  description?: string    // 简介
  followersCount: number  // 粉丝数
  followingCount?: number // 关注数
  postsCount?: number     // 作品数
  verified: boolean       // 是否认证
  url: string             // 主页链接
  metadata?: any          // 原始数据
}
```
