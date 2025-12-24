# @sker/crawler-core

爬虫核心抽象层，定义统一的爬虫接口和基类。

## 核心接口

### ICrawler

```typescript
interface ICrawler {
  readonly platform: string
  readonly login: ILogin
  readonly store: IStore

  start(): Promise<void>
  search(options: SearchOptions): Promise<ContentItem[]>
  getDetail(contentId: string): Promise<ContentItem>
  getComments(contentId: string, maxCount?: number): Promise<CommentItem[]>
  getCreator(creatorId: string): Promise<CreatorItem>
  close(): Promise<void>
}
```

### ILogin

```typescript
interface ILogin {
  begin(): Promise<void>
  loginByQrcode(): Promise<LoginResult>
  loginByCookie(cookies: Record<string, string>): Promise<LoginResult>
  isLoggedIn(): Promise<boolean>
}
```

### IStore

```typescript
interface IStore {
  storeContent(item: ContentItem): Promise<void>
  storeComment(item: CommentItem): Promise<void>
  storeCreator(item: CreatorItem): Promise<void>
}
```

## 使用示例

```typescript
import { AbstractCrawler, Injectable } from '@sker/crawler-core'

@Injectable()
export class WeiboCrawler extends AbstractCrawler {
  readonly platform = 'weibo'
  readonly login = new WeiboLogin()
  readonly store = new WeiboStore()

  async search(options: SearchOptions): Promise<ContentItem[]> {
    // 实现搜索逻辑
  }

  async getDetail(contentId: string): Promise<ContentItem> {
    // 实现详情获取
  }

  async getComments(contentId: string, maxCount?: number): Promise<CommentItem[]> {
    // 实现评论获取
  }

  async getCreator(creatorId: string): Promise<CreatorItem> {
    // 实现创作者信息获取
  }

  protected async onStart(): Promise<void> {
    // 启动时的初始化逻辑
  }

  protected async onClose(): Promise<void> {
    // 关闭时的清理逻辑
  }
}
```

## 数据类型

- **ContentItem**: 内容项（帖子/微博）
- **CommentItem**: 评论项
- **CreatorItem**: 创作者信息
- **SearchOptions**: 搜索选项
- **LoginResult**: 登录结果
