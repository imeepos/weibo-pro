# @sker/crawler-core

爬虫核心库，提供 HTTP 客户端、浏览器管理、存储策略、多平台爬虫、任务调度、分析与工作流集成等爬虫基础设施。

## 核心职责

- 定义统一爬虫契约：`ICrawler` / `ILogin` / `IStore` 接口与 `AbstractCrawler` 抽象基类
- 封装基于 axios 的 `HttpClient`：Cookie 自动管理、HTTP/HTTPS/SOCKS5 代理、指数退避重试、请求/响应拦截器、签名扩展
- 提供浏览器管理：`BrowserManager`（Playwright 实例池）、`CDPBrowser`（CDP 协议封装）、`STEALTH_SCRIPT` 反检测脚本
- 提供多种存储策略：JSON / CSV / Excel / 数据库，并通过 `StoreFactory` 统一创建
- 内置多平台爬虫实现：微博、抖音、贴吧、知乎、小红书、B 站、快手
- 提供任务队列 / 任务消费者 / Cron 定时调度器（`scheduler`）
- 提供 `SentimentAnalyzer`（对接 `@sker/nlp`）与 `Statistics`（趋势、用户画像、传播树）分析能力
- 与 `@sker/workflow` 集成，内置爬虫工作流（搜索 → 详情 → 评论 → 存储）

## 目录结构

```
packages/crawler-core/
├── src/
│   ├── index.ts                        # 统一导出入口
│   ├── types.ts                        # 通用类型：ContentItem / CommentItem / CreatorItem 等
│   ├── crawler.interface.ts            # ICrawler 接口与 SearchOptions
│   ├── login.interface.ts              # ILogin 登录接口
│   ├── store.interface.ts              # IStore 存储接口
│   ├── abstract-crawler.ts             # AbstractCrawler 抽象基类（实现 start/close 生命周期）
│   ├── http/                           # HTTP 客户端模块
│   │   ├── http-client.ts              #   HttpClient 核心类（axios 封装）
│   │   ├── cookie-jar.ts               #   CookieJar Cookie 管理器
│   │   ├── retry.ts                    #   RetryHandler 指数退避重试
│   │   └── types.ts                    #   HTTP 配置与类型定义
│   ├── browser/                        # 浏览器管理模块
│   │   ├── manager.ts                  #   BrowserManager Playwright 实例池
│   │   ├── cdp.ts                      #   CDPBrowser CDP 协议封装
│   │   ├── stealth.ts                  #   STEALTH_SCRIPT 反检测脚本
│   │   └── types.ts                    #   浏览器配置类型
│   ├── store/                          # 存储策略模块
│   │   ├── json.store.ts               #   JsonStore JSON 文件存储
│   │   ├── csv.store.ts                #   CsvStore CSV 文件存储
│   │   ├── excel.store.ts              #   ExcelStore Excel 存储（exceljs）
│   │   ├── database.store.ts           #   DatabaseStore 数据库存储（TypeORM）
│   │   └── factory.ts                  #   StoreFactory 存储工厂
│   ├── platforms/                      # 多平台爬虫实现
│   │   ├── weibo/                      #   微博：WeiboClient / WeiboLogin / WeiboCrawler
│   │   ├── douyin/                     #   抖音：DouyinClient / DouyinLogin / DouyinCrawler
│   │   ├── tieba/                      #   贴吧：TiebaClient / TiebaLogin / TiebaCrawler
│   │   ├── bilibili/                   #   B 站：BilibiliClient / BilibiliLogin / BilibiliCrawler
│   │   ├── zhihu/                      #   知乎：ZhihuClient / ZhihuLogin / ZhihuCrawler
│   │   ├── xhs/                        #   小红书：XhsClient / XhsLogin / XhsCrawler
│   │   └── kuaishou/                   #   快手：KuaishouClient / KuaishouLogin / GraphQL（未导出 index）
│   ├── scheduler/                      # 任务调度模块
│   │   ├── task-queue.ts               #   TaskQueue 任务队列
│   │   ├── task-consumer.ts            #   TaskConsumer 任务消费者（ACK/NACK、状态追踪）
│   │   ├── task-scheduler.ts           #   TaskScheduler Cron 定时调度器
│   │   └── types.ts                    #   任务类型定义
│   ├── analytics/                      # 分析模块
│   │   ├── sentiment-analyzer.ts       #   SentimentAnalyzer 情感/关键词分析（@sker/nlp）
│   │   ├── statistics.ts               #   Statistics 趋势/用户画像/传播树
│   │   └── types.ts                    #   分析类型定义
│   ├── workflow/                       # 工作流集成（@sker/workflow）
│   │   ├── nodes/                      #   搜索/详情/评论/存储 工作流节点
│   │   ├── visitors/                   #   节点 visitor 实现
│   │   └── workflows/                  #   createCrawlerWorkflow 爬虫工作流定义
│   └── test/setup.ts                   # vitest 测试初始化
├── ormconfig.ts                        # TypeORM 迁移/CLI 配置
├── .env.example                        # 环境变量示例
├── tsup.config.ts                      # tsup 构建配置
├── tsconfig.json                       # TypeScript 配置（继承 @sker/typescript-config/base）
├── vitest.config.ts                    # vitest 测试配置
├── CLAUDE.md                           # 模块详细文档（HttpClient/浏览器/存储使用示例）
└── BROWSER.md                          # 浏览器相关说明
```

## 边界

- **✅ 负责**：爬虫领域的基础设施 —— HTTP 客户端、浏览器控制、Cookie/代理/重试、数据存储、平台爬虫实现、任务调度、爬取结果分析、爬虫工作流定义
- **❌ 不负责**：
  - 不消费 MQ 任务（`apps/crawler` 负责监听 RabbitMQ 并驱动爬取流程）
  - 不提供业务 API / 前端界面（属于 `apps/api`、`apps/bigscreen` 等）
  - 不做具体的登录风控策略与平台风控逆向（仅提供登录/签名扩展点）
  - 快手平台无 `index.ts` 导出，且根入口仅再导出 weibo / douyin / tieba 三个平台；其余平台实现存在但需通过子路径或自行导入
- **对外依赖**：`@sker/core`（DI 容器）、`@sker/entities`、`@sker/mq`、`@sker/nlp`（`NLPAnalyzer`）、`@sker/workflow`（工作流执行）；外部：axios、playwright、typeorm、exceljs、tough-cookie、socks-proxy-agent、cron、rxjs、reflect-metadata
- **被谁依赖**：目前没有其他包在 `package.json` 中声明依赖本包（`apps/api` 仅在健康检查中字符串提及）。本包定位为爬虫应用（如 `apps/crawler`）待集成的核心库

## 核心接口与类型

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
import { AbstractCrawler } from '@sker/crawler-core'

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

  protected async onStart(): Promise<void> {}
  protected async onClose(): Promise<void> {}
}
```

> 各模块（HttpClient、浏览器管理、存储策略）的详细用法见 [CLAUDE.md](./CLAUDE.md)。
