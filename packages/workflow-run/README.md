# @sker/workflow-run

工作流后端运行时执行层：包含全部业务节点的 Visitor 实现（72 个），将抽象的 AST 节点转换为真实业务逻辑（微博 API、LLM、舆情、调度等）。

## 核心职责

- **节点执行器**：为 `@sker/workflow-ast` 中每个节点实现对应 `*AstVisitor`（72 个），通过 `@Handler` 装饰器自动路由执行
- **服务层**：微博 API 客户端、账号池管理/监控、Playwright 浏览器自动化、HTML 解析、限流/延迟、NLP 处理、Cron 调度等可注入服务（38 个）
- **LLM 能力**：`llm-client` 客户端工厂、`StreamingLlmInvoker` 流式调用、`ChatAgent` 对话代理
- **事件持久化**：`DatabaseEventStore` 基于数据库的事件存储；`ProcessSubject` 进程内响应式主体
- **调度与执行服务**：`CronSchedulerService` 定时调度、`WorkflowExecutionService` 工作流执行编排
- **多模态支持**：图/视频/音频/文生图等多模态 LLM 节点执行器

## 目录结构

```
packages/workflow-run/src/
├── index.ts                      # 公共 API 入口（导出所有 Visitor 与服务）
├── main.ts                       # 开发/调试入口（tsx 运行）
├── *AstVisitor.ts                # 节点执行器（顶层 72 个）：Weibo*Visitor、Llm*Visitor、
│                                 #   KeywordAgentAstVisitor、MergeAstVisitor、StoreAstVisitor、
│                                 #   MqAstVisitor、ScheduledWorkflowVisitor、ClaudeCodeAstVisitor 等
├── llm-client.ts                 # LLM 客户端工厂（useLlmModel）
├── chat/                         # ChatAgent：对话代理（index.ts、ChatAgent.ts）
├── core/                         # ProcessSubject（响应式进程主体）
├── event-store/                  # 数据库事件存储：DatabaseEventStore（database.ts、index.ts）
├── services/                     # 服务层（38 个）
│   ├── weibo-api-client.base.ts  # 微博 API 客户端基类
│   ├── weibo-account.service.ts  # 微博账号池管理
│   ├── weibo-auth.service.ts     # 微博认证服务
│   ├── weibo-error.handler.ts    # 微博错误处理器
│   ├── weibo-request-header.builder.ts / weibo-referer.builder.ts  # 请求头/Referer 构造器
│   ├── weibo-account-monitor.service.ts  # 账号监控（健康分/告警/快照）
│   ├── weibo-worker-proxy.service.ts     # Worker 代理
│   ├── PlaywrightService.ts      # 共享浏览器自动化服务
│   ├── WeiboHtmlParser.ts        # 微博 HTML 解析器
│   ├── IncrementalPostDetector.ts# 增量帖子检测
│   ├── delay.service.ts          # 延迟服务（退避策略）
│   ├── rate-limiter.service.ts   # 速率限制服务
│   ├── CronSchedulerService.ts   # Cron 调度服务
│   ├── WorkflowExecutionService.ts # 工作流执行服务
│   ├── LlmInvoker.ts / StreamingLlmInvoker.ts / PromptBuilder.ts  # LLM 调用
│   ├── SmartToolsFactory.ts / StoryToolsFactory.ts  # 工具工厂
│   ├── claude-code.service.ts    # Claude Code 服务
│   └── ...
├── utils/                        # abort-helper.ts、retry-on-network-error.ts
└── __tests__/                    # 测试文件（*Visitor.test.ts 等）
```

## 边界

- **✅ 负责**：后端节点真实执行（微博 API 调用、账号池、浏览器自动化、LLM 调用、消息队列、SQL 等）、事件持久化、Cron 定时调度、NLP 处理管道、工作流执行服务
- **❌ 不负责**：引擎核心与装饰器（属于 `@sker/workflow`）、节点定义（属于 `@sker/workflow-ast`）、浏览器端执行（属于 `@sker/workflow-browser`）、前端可视化渲染（属于 `@sker/workflow-ui`）
- **对外依赖**：`@sker/workflow`、`@sker/workflow-ast`、`@sker/core`、`@sker/entities`、`@sker/ip-proxy`、`@sker/json-harmony`、`@sker/mq`、`@sker/nlp`、`@sker/redis`、`@sker/sdk`；外部：langchain、@langchain/openai、playwright、typeorm、node-schedule、cron-parser、cheerio、exceljs、marked、execa、deepagents、reflect-metadata、zod、rxjs
- **被谁依赖**：`@sker/agent`；apps：`api`、`crawler`

---

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
// 管道：收集上下文 → NLP 分析 → 自动创建事件
PostContextCollectorAst → PostNLPAnalyzerAst → EventAutoCreatorAst
```

**数据流**：
1. `PostContextCollectorVisitor` - 获取帖子、评论、转发
2. `PostNLPAnalyzerVisitor` - 调用 `@sker/nlp` 分析情感和事件
3. `EventAutoCreatorVisitor` - 入库并更新统计

### 4. 事件统计快照增量法

通过快照差值统计事件热度变化：`deltaComments = current.comments_count - lastSnapshot.comments_count`，增量计入当前小时统计。

**优势**：
- 精确反映"今天新增的互动"而非累积总量
- 可检测旧帖子突然爆火（一年前的帖子今天评论激增）
- 统计时间线清晰：统计时间 = 数据变化时间

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
- 全局单例浏览器进程
- 自动健康检查和重连
- Cookie 自动注入

### WeiboAccountService
账号池管理服务：
- 自动选择最优账号并注入 Cookie
- 获取带 XSRF-TOKEN 的账号（用于 POST 请求）

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

## 设计原则

1. **Visitor 即职责** - 每个 Visitor 只负责一个 AST 节点的执行
2. **服务即复用** - 账号、浏览器、解析器作为服务共享
3. **快照即真相** - 通过数据快照精确反映变化
4. **队列即异步** - 消息队列解耦数据采集和分析
5. **依赖注入即灵活** - 通过 DI 实现松耦合和可测试性

## 开发

```bash
# 构建
pnpm build

# 开发模式（带热重载）
pnpm dev

# 类型检查
pnpm check-types

# 测试
pnpm test
```

---

**代码即文档，简约即优雅。**
