# @sker/workflow-run

工作流运行时执行层 - 将抽象的 AST 节点转换为具体的业务逻辑。

## 核心理念

**Visitor 即执行器** - 每个 AST 节点对应一个 Visitor，通过装饰器自动路由
**服务即能力** - 账号管理、浏览器实例、解析器作为可注入服务复用
**快照即增量** - 通过快照差值精确统计事件热度变化

## 架构

```
src/
├── Weibo*AstVisitor.ts      # 微博 API 调用 Visitor (9个)
├── Post*Visitor.ts           # NLP 处理管道 Visitor (3个)
├── post-nlp-agent.consumer.ts # 消息队列消费者
├── PlaywrightService.ts      # 共享浏览器服务
├── WeiboAccountService.ts    # 账号池管理服务
├── ParsedSearchResult.ts     # HTML 解析器
└── weibo-*.ts                # 请求构建器、错误处理器
```

## 核心模块

### 1. Visitor 模式

通过 `@Handler` 装饰器将 Visitor 与 AST 节点绑定：

```typescript
import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboKeywordSearchAst } from '@sker/workflow-ast';

@Injectable()
export class WeiboKeywordSearchAstVisitor {
  @Handler(WeiboKeywordSearchAst)
  async handler(ast: WeiboKeywordSearchAst, ctx: any) {
    // 执行逻辑
    ast.state = 'success';
    return ast;
  }
}
```

### 2. 账号池管理

基于 Redis Sorted Set 实现健康评分机制：

```typescript
// 选择健康度最高的账号
const selection = await accountService.selectBestAccount();

// 使用后降低健康度
await accountService.decreaseHealthScore(selection.id, 1);
```

**核心特性**：
- 自动选择健康度最高的账号
- 使用后自动降低健康评分（防止单账号过载）
- 过滤失效账号（状态检查 + Cookie 验证）

### 3. NLP 处理管道

消息队列驱动的三阶段处理：

```typescript
startPostNLPConsumer(); // 启动消费者

// 管道：收集上下文 → NLP 分析 → 自动创建事件
PostContextCollectorAst → PostNLPAnalyzerAst → EventAutoCreatorAst
```

**数据流**：
1. `PostContextCollectorVisitor` - 获取帖子、评论、转发
2. `PostNLPAnalyzerVisitor` - 调用 `@sker/nlp` 分析情感和事件
3. `EventAutoCreatorVisitor` - 入库并更新统计

### 4. 事件统计快照增量法

核心创新：通过快照差值统计事件热度变化

```typescript
// 保存当前快照
const snapshot = { post_id, comments_count, reposts_count, ... };

// 计算与上次快照的增量
const deltaComments = current.comments_count - lastSnapshot.comments_count;

// 增量计入当前小时的统计
stats.comment_count += deltaComments;
```

**优势**：
- 精确反映"今天新增的互动"而非累积总量
- 可检测旧帖子突然爆火（一年前的帖子今天评论激增）
- 统计时间线清晰：统计时间 = 数据变化时间

参见 `EventAutoCreatorVisitor.ts:19-35` 的详细说明。

## 微博 API Visitor

| Visitor | 功能 | 输出 |
|---------|------|------|
| `WeiboKeywordSearchAstVisitor` | 关键词搜索 | 帖子列表 → NLP 队列 |
| `WeiboAjaxFeedHotTimelineAstVisitor` | 热门时间线 | 热门帖子列表 |
| `WeiboAjaxProfileInfoAstVisitor` | 用户资料 | 用户信息 |
| `WeiboAjaxFriendshipsAstVisitor` | 用户关系 | 关注/粉丝列表 |
| `WeiboAjaxStatusesShowAstVisitor` | 帖子详情 | 完整帖子内容 |
| `WeiboAjaxStatusesCommentAstVisitor` | 评论列表 | 评论数据 |
| `WeiboAjaxStatusesLikeShowAstVisitor` | 点赞列表 | 点赞用户 |
| `WeiboAjaxStatusesRepostTimelineAstVisitor` | 转发列表 | 转发数据 |
| `WeiboAjaxStatusesMymblogAstVisitor` | 个人微博 | 用户帖子列表 |

## 基础设施服务

### PlaywrightService

共享浏览器实例，降低资源消耗：

```typescript
const html = await playwright.getHtml(url, cookieHeader, userAgent);
```

**特性**：
- 全局单例浏览器进程
- 自动健康检查和重连
- Cookie 自动注入

### WeiboAccountService

账号池管理服务：

```typescript
// 自动选择最优账号并注入 Cookie
const selection = await accountService.injectCookies(request);

// 获取带 XSRF-TOKEN 的账号（用于 POST 请求）
const withToken = await accountService.selectBestAccountWithToken();
```

## 依赖注入

所有 Visitor 和服务通过 `@sker/core` 自动注册：

```typescript
import { root } from '@sker/core';

root.set([
  PostContextCollectorVisitor,
  PostNLPAnalyzerVisitor,
  EventAutoCreatorVisitor,
]);
```

## 使用示例

### 启动 NLP 消费者

```typescript
import { startPostNLPConsumer } from '@sker/workflow-run';

const consumer = startPostNLPConsumer();

// 优雅停止
process.on('SIGTERM', () => consumer.stop());
```

### 执行工作流

```typescript
import { execute } from '@sker/workflow';
import { WeiboKeywordSearchAst } from '@sker/workflow-ast';

const searchAst = new WeiboKeywordSearchAst();
searchAst.keyword = '热点话题';
searchAst.startDate = new Date('2025-01-01');
searchAst.endDate = new Date('2025-01-07');

await execute({ nodes: [searchAst], edges: [] }, {});
```

## 开发

```bash
# 构建
pnpm build

# 开发模式（带热重载）
pnpm dev

# 类型检查
pnpm check-types
```

## 设计原则

1. **Visitor 即职责** - 每个 Visitor 只负责一个 AST 节点的执行
2. **服务即复用** - 账号、浏览器、解析器作为服务共享
3. **快照即真相** - 通过数据快照精确反映变化
4. **队列即异步** - 消息队列解耦数据采集和分析
5. **依赖注入即灵活** - 通过 DI 实现松耦合和可测试性

---

**代码即文档，简约即优雅。**
