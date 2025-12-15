# @sker/workflow-run

工作流后端执行器包，包含所有节点的 Visitor 实现。

## 包信息

- **包名**: `@sker/workflow-run`
- **描述**: Backend runtime execution for workflow nodes
- **关键词**: workflow, runtime, backend, execution, sker

## 目录结构

```
packages/workflow-run/
├── src/
│   ├── services/                        # 服务层
│   │   ├── weibo-api-client.base.ts     # 微博 API 客户端基类
│   │   ├── weibo-account.service.ts     # 微博账号管理服务
│   │   ├── weibo-auth.service.ts        # 微博认证服务
│   │   ├── weibo-error.handler.ts       # 微博错误处理器
│   │   ├── weibo-request-header.builder.ts  # 微博请求头构造器
│   │   ├── weibo-referer.builder.ts     # 微博 Referer 构造器
│   │   ├── PlaywrightService.ts         # Playwright 浏览器自动化服务
│   │   ├── WeiboHtmlParser.ts           # 微博 HTML 解析器
│   │   ├── IncrementalPostDetector.ts   # 增量帖子检测器
│   │   ├── delay.service.ts             # 延迟服务（退避策略）
│   │   ├── rate-limiter.service.ts      # 速率限制服务
│   │   ├── CronSchedulerService.ts      # Cron 调度服务
│   │   └── WorkflowExecutionService.ts  # 工作流执行服务
│   │
│   ├── utils/
│   │   └── abort-helper.ts              # 中止信号辅助工具
│   │
│   ├── *Visitor.ts                      # 所有节点执行器（33 个）
│   ├── llm-client.ts                    # LLM 客户端工厂
│   └── index.ts                         # 导出入口
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Visitor 执行器分类

### 一、微博 API 节点（9 个）

所有微博 API 访问器继承自 `WeiboApiClient` 基类，统一处理账号选择、Token 提取、请求头构造、错误处理。

#### 1. `WeiboKeywordSearchAstVisitor`
- **绑定 AST**: `WeiboKeywordSearchAst`
- **功能**: 微博关键词搜索（Playwright 爬取）
- **输入**: `keyword`, `startDate`, `endDate`, `page`
- **输出**: `mblogid`, `uid`（流式发射每条帖子）
- **特性**:
  - 使用 Playwright 渲染微博搜索页面
  - 分页爬取，自动处理翻页
  - 达到 50 页上限时自动调整时间范围继续采集
  - 支持取消信号（AbortController）

#### 2. `WeiboAjaxStatusesShowAstVisitor`
- **绑定 AST**: `WeiboAjaxStatusesShowAst`
- **功能**: 获取微博帖子详情（Ajax API）
- **输入**: `mblogid`, `uid`
- **输出**: `mid`, `uid`
- **特性**:
  - 调用 `/ajax/statuses/show` API
  - 自动保存 `WeiboUserEntity` 和 `WeiboPostEntity` 到数据库
  - 使用 upsert 模式避免重复插入

#### 3. `WeiboAjaxStatusesCommentAstVisitor`
- **绑定 AST**: `WeiboAjaxStatusesCommentAst`
- **功能**: 获取微博评论（分页）
- **输入**: `mblogid`, `uid`
- **输出**: 评论数据（流式发射）
- **特性**:
  - 调用 `/ajax/statuses/buildComments` API
  - 支持分页拉取评论
  - 自动保存 `WeiboCommentEntity` 到数据库

#### 4. `WeiboAjaxStatusesRepostTimelineAstVisitor`
- **绑定 AST**: `WeiboAjaxStatusesRepostTimelineAst`
- **功能**: 获取微博转发（分页）
- **输入**: `mblogid`, `uid`
- **输出**: 转发数据（流式发射）
- **特性**:
  - 调用 `/ajax/statuses/repostTimeline` API
  - 支持分页拉取转发
  - 自动保存 `WeiboRepostEntity` 到数据库

#### 5. `WeiboAjaxStatusesLikeShowAstVisitor`
- **绑定 AST**: `WeiboAjaxStatusesLikeShowAst`
- **功能**: 获取微博点赞用户列表
- **输入**: `mblogid`, `uid`
- **输出**: 点赞用户数据

#### 6. `WeiboAjaxProfileInfoAstVisitor`
- **绑定 AST**: `WeiboAjaxProfileInfoAst`
- **功能**: 获取微博用户资料
- **输入**: `uid`
- **输出**: 用户详细信息
- **特性**:
  - 调用 `/ajax/profile/info` API
  - 更新 `WeiboUserEntity` 表

#### 7. `WeiboAjaxFriendshipsAstVisitor`
- **绑定 AST**: `WeiboAjaxFriendshipsAst`
- **功能**: 获取用户关注列表/粉丝列表
- **输入**: `uid`, `type` (following/followers)
- **输出**: 关注/粉丝数据

#### 8. `WeiboAjaxFeedHotTimelineAstVisitor`
- **绑定 AST**: `WeiboAjaxFeedHotTimelineAst`
- **功能**: 获取热门微博时间线
- **输出**: 热门帖子流

#### 9. `WeiboAjaxStatusesMymblogAstVisitor`
- **绑定 AST**: `WeiboAjaxStatusesMymblogAst`
- **功能**: 获取用户微博列表
- **输入**: `uid`
- **输出**: 用户发布的微博列表

### 二、微博账号管理节点（2 个）

#### 10. `WeiboLoginAstVisitor`
- **绑定 AST**: `WeiboLoginAst`
- **功能**: 微博账号登录（Playwright 自动化）
- **输入**: `username`, `password`
- **输出**: `cookies`, `status`
- **特性**:
  - 使用 Playwright 模拟登录流程
  - 自动保存 cookies 到 `WeiboAccountEntity`

#### 11. `WeiboAccountPickAstVisitor`
- **绑定 AST**: `WeiboAccountPickAst`
- **功能**: 选择最佳可用账号
- **输出**: `accountId`, `healthScore`
- **特性**:
  - 调用 `WeiboAccountService.selectBestAccount()`
  - 基于健康分数和可用性选择账号

### 三、数据处理节点（3 个）

#### 12. `PostContextCollectorVisitor`
- **绑定 AST**: `PostContextCollectorAst`
- **功能**: 收集微博帖子的完整上下文（帖子+评论+转发）
- **输入**: `postId`（支持 id 或 mblogid）
- **输出**: `post`, `comments`, `reposts`
- **特性**:
  - 从数据库查询帖子及其互动数据
  - 评论按点赞数排序
  - 转发通过 `retweeted_status->>'id'` 匹配

#### 13. `PostNLPAnalyzerVisitor`
- **绑定 AST**: `PostNLPAnalyzerAst`
- **功能**: NLP 情感分析 + 关键词提取 + 事件分类
- **输入**: `post`, `comments`, `reposts`
- **输出**: `nlpResult`
- **特性**:
  - 调用 `NLPAnalyzer.analyze()`（OpenAI-compatible API）
  - 动态加载可用分类、标签、最近事件作为上下文
  - 返回情感分数、关键词、事件类型、推荐标签

#### 14. `EventAutoCreatorVisitor`
- **绑定 AST**: `EventAutoCreatorAst`
- **功能**: 自动创建或更新舆情事件
- **输入**: `post`, `nlpResult`
- **输出**: `is_end` = true
- **特性**:
  - 基于 `nlpResult.event.type` 查找或创建分类
  - 基于事件标题 + 分类去重事件
  - 自动创建新标签（如果 `isNew = true`）
  - 快照增量法更新事件统计（`updateEventStatistics`）
  - 计算事件热度（帖子数 × 0.4 + 评论增量 × 0.3 + 转发增量 × 0.5 + 点赞增量 × 0.1）

### 四、控制流节点（3 个）

#### 15. `SwitchAstVisitor`
- **绑定 AST**: `SwitchAst`
- **功能**: 条件分支路由
- **输入**: `value`
- **输出**: 多个路由端口（`output_1`, `output_2`, ..., `output_default`）
- **特性**:
  - 评估每个分支的 `condition` 表达式（使用 `new Function`）
  - 匹配的分支发射输入值
  - 不匹配的分支发射 `ROUTE_SKIPPED` 特殊值
  - `default` 分支：仅当所有普通分支都不匹配时激活

#### 16. `MergeAstVisitor`
- **绑定 AST**: `MergeAst`
- **功能**: 合并多个输入数组
- **输入**: `inputs` (数组的数组)
- **输出**: `result`, `totalCount`
- **合并模式**:
  - `append`: 拼接所有数组 `[[a, b], [c, d]] → [a, b, c, d]`
  - `combine`: 按索引配对 `[[a1, a2], [b1, b2]] → [{0: a1, 1: b1}, {0: a2, 1: b2}]`
  - `chooseBranch`: 取第一个非空分支
  - `wait`: 默认同 `append`

#### 17. `LoopAstVisitor`
- **绑定 AST**: `LoopAst`
- **功能**: 循环控制节点
- **输入**: 数组
- **输出**: 逐个发射数组元素

### 五、LLM 节点（3 个）

#### 18. `LlmTextAgentAstVisitor`
- **绑定 AST**: `LlmTextAgentAst`
- **功能**: 调用 LLM 生成文本
- **输入**: `prompt`, `system`, `model`, `temperature`
- **输出**: `text`, `username`, `profile`
- **特性**:
  - 使用 `useLlmModel()` 工厂创建模型
  - 支持数组拼接提示词

#### 19. `LlmStructuredOutputAstVisitor`
- **绑定 AST**: `LlmStructuredOutputAst`
- **功能**: 调用 LLM 生成结构化输出（JSON）
- **输入**: `prompt`, `system`, `schema` (Zod Schema)
- **输出**: 结构化数据对象

#### 20. `LlmCategoryAstVisitor`
- **绑定 AST**: `LlmCategoryAst`
- **功能**: LLM 分类节点
- **输入**: `text`, `categories`
- **输出**: `category`

### 六、消息队列节点（2 个）

#### 21. `MqPushAstVisitor`
- **绑定 AST**: `MqPushAst`
- **功能**: 推送消息到 RabbitMQ 队列
- **输入**: `queueName`, `input`
- **输出**: `success` (boolean)
- **特性**:
  - 调用 `useQueue(queueName).producer.next(data)`
  - 跨工作流通信：通过队列名称连接不同工作流

#### 22. `MqPullAstVisitor`
- **绑定 AST**: `MqPullAst`
- **功能**: 从 RabbitMQ 队列拉取消息（流式）
- **输入**: `queueName`, `max` (最大拉取数量), `timeout`
- **输出**: `output`（逐条发射消息）
- **特性**:
  - 订阅 `useQueue(queueName).consumer$`（RxJS Observable）
  - 使用 `take(max)` 限制拉取数量
  - 超时处理：如果队列为空且 `emitCount > 0`，正常结束；否则抛出错误
  - 自动 ACK 消息

### 七、存储节点（2 个）

#### 23. `StoreGetAstVisitor`
- **绑定 AST**: `StoreGetAst`
- **功能**: 从 Redis 获取键值
- **输入**: `key`
- **输出**: `value`

#### 24. `StoreSetAstVisitor`
- **绑定 AST**: `StoreSetAst`
- **功能**: 向 Redis 设置键值
- **输入**: `key`, `value`, `ttl`
- **输出**: `success`

### 八、群聊节点（2 个）

#### 25. `ShareAstVisitor`
- **绑定 AST**: `ShareAst`
- **功能**: 群聊消息广播（多 Agent 共享上下文）
- **输入**: 消息内容
- **输出**: 广播后的消息

#### 26. `GroupChatLoopAstVisitor`
- **绑定 AST**: `GroupChatLoopAst`
- **功能**: 群聊循环控制（多轮对话）
- **输入**: 对话历史
- **输出**: 下一轮对话消息

### 九、角色系统节点（2 个）

#### 27. `PersonaAstVisitor`
- **绑定 AST**: `PersonaAst`
- **功能**: 角色记忆管理（持久化 Agent 人格）
- **输入**: `personaId`, `memory`
- **输出**: 加载的角色数据

#### 28. `PersonaCreatorAstVisitor`
- **绑定 AST**: `PersonaCreatorAst`
- **功能**: 创建新角色
- **输入**: `name`, `description`, `traits`
- **输出**: `personaId`

### 十、高级 LLM 节点（5 个）

#### 29. `PromptRoleSkillAstVisitor`
- **绑定 AST**: `PromptRoleSkillAst`
- **功能**: 角色技能提示词生成
- **输入**: 角色配置
- **输出**: 增强的提示词

#### 30. `QueryRewriterAstVisitor`
- **绑定 AST**: `QueryRewriterAst`
- **功能**: 查询重写（优化搜索关键词）
- **输入**: 原始查询
- **输出**: 优化后的查询

#### 31. `AnswerFinalizerAstVisitor`
- **绑定 AST**: `AnswerFinalizerAst`
- **功能**: 答案终稿器（多轮优化后的最终答案）
- **输入**: 多轮答案
- **输出**: 最终答案

#### 32. `AnswerEvaluatorAstVisitor`
- **绑定 AST**: `AnswerEvaluatorAst`
- **功能**: 答案评估器（质量打分）
- **输入**: 答案文本
- **输出**: 评分 + 评估报告

#### 33. `ResearchPlannerAstVisitor`
- **绑定 AST**: `ResearchPlannerAst`
- **功能**: 研究规划器（生成调研步骤）
- **输入**: 研究主题
- **输出**: 调研计划

### 十一、错误处理节点（1 个）

#### 34. `ErrorAnalyzerAstVisitor`
- **绑定 AST**: `ErrorAnalyzerAst`
- **功能**: 错误分析器（诊断工作流失败原因）
- **输入**: 错误堆栈
- **输出**: 分析报告 + 修复建议

### 十二、定时调度节点（1 个）

#### 35. `ScheduledWorkflowVisitor`
- **绑定 AST**: `ScheduledWorkflowAst`
- **功能**: 创建定时调度任务
- **输入**: `workflowName`, `scheduleType`, `cronExpression` / `intervalSeconds` / `startTime`, `inputs`, `enabled`
- **输出**: `scheduleId`, `nextRunAt`, `status`
- **调度类型**:
  - `CRON`: Cron 表达式调度
  - `INTERVAL`: 间隔调度（秒）
  - `ONCE`: 一次性调度
- **特性**:
  - 创建 `WorkflowScheduleEntity` 记录
  - 如果 `enabled = true`，自动添加到 `CronSchedulerService`
  - 支持 `startTime` 和 `endTime` 配置

## 核心设计模式

### 1. @Handler 装饰器

所有 Visitor 使用 `@Handler(AstClass)` 装饰器绑定到对应的 AST 节点。

```typescript
@Injectable()
export class WeiboKeywordSearchAstVisitor {
    @Handler(WeiboKeywordSearchAst)
    handler(ast: WeiboKeywordSearchAst, input$: Observable<any>, ctx: any): Observable<NodeEvent> {
        // 执行逻辑
    }
}
```

### 2. 反射驱动执行

工作流引擎通过反射查找 Handler 方法：

```typescript
// packages/workflow/src/execution/visitor-executor.ts
const handler = getHandlerForAst(ast); // 通过反射找到对应的 Visitor
handler(ast, input$, ctx); // 调用执行
```

### 3. Observable 数据流

所有 Visitor 返回 `Observable<NodeEvent>`，节点状态通过事件发射：

```typescript
obs.next({ type: 'node_runing', id: ast.id, data: ast });  // 运行中
obs.next({ type: 'node_emit', id: ast.id, property: 'mblogid', value: '123' }); // 发射数据
obs.next({ type: 'node_success', id: ast.id, data: ast }); // 成功
obs.complete(); // 完成
```

### 4. AbortController 取消机制

所有 Visitor 支持工作流取消：

```typescript
const abortController = new AbortController();

// 包装上下文
const wrappedCtx = {
    ...ctx,
    abortSignal: abortController.signal
};

// 检查取消信号
if (wrappedCtx.abortSignal?.aborted) {
    throw new Error('工作流已取消');
}

// 返回清理函数
return () => {
    abortController.abort();
    obs.complete();
};
```

### 5. WeiboApiClient 基类模式

所有微博 API Visitor 继承 `WeiboApiClient`，消除重复代码：

```typescript
export abstract class WeiboApiClient {
    protected async fetchApi<T>(options: FetchApiOptions): Promise<T> {
        // 账号选择 + Token 提取 + 请求头构造 + 错误处理
    }

    protected async *fetchWithPagination<T>(options: FetchPaginationOptions<T>): AsyncGenerator<T> {
        // 分页生成器模式
    }
}
```

子类只需关注业务逻辑：

```typescript
@Injectable()
export class WeiboAjaxStatusesShowAstVisitor extends WeiboApiClient {
    @Handler(WeiboAjaxStatusesShowAst)
    async visit(ast: WeiboAjaxStatusesShowAst, ctx: any): Observable<NodeEvent> {
        const url = `https://weibo.com/ajax/statuses/show?id=${ast.mblogid}`;
        const body = await this.fetchApi<WeiboAjaxStatusesShowAstReponse>({
            url,
            refererOptions: { uid: ast.uid, mid: ast.mblogid }
        });
        // 处理业务逻辑
    }
}
```

## 服务层

### 1. `WeiboApiClient` (基类)

**职责**: 统一微博 API 请求基础设施

**核心方法**:
- `fetchApi<T>(options)`: 单次请求
- `fetchWithPagination<T>(options)`: 分页生成器

**特性**:
- 自动账号选择（`WeiboAccountService.selectBestAccountWithToken()`）
- 速率限制（`RateLimiterService.acquire()`）
- 退避策略（`DelayService.backoffDelay()`）
- 自动构造请求头（`WeiboRequestHeaderBuilder`）
- 自动构造 Referer（`WeiboRefererBuilder`）
- 错误处理（`WeiboErrorHandler`）
- 健康分数管理（登录失效时标记账号过期）

### 2. `WeiboAccountService`

**职责**: 微博账号管理

**核心方法**:
- `selectBestAccount()`: 选择最佳可用账号（基于健康分数）
- `selectBestAccountWithToken()`: 选择账号 + 提取 XSRF-TOKEN
- `markAccountAsExpired(id)`: 标记账号为过期状态
- `decreaseHealthScore(id, delta)`: 降低账号健康分数

### 3. `PlaywrightService`

**职责**: Playwright 浏览器自动化

**核心方法**:
- `getHtml(url, cookieHeader, userAgent)`: 渲染页面并返回 HTML

**特性**:
- 无头浏览器模式
- 自动注入 cookies
- 等待页面加载完成

### 4. `WeiboHtmlParser`

**职责**: 解析微博搜索页面 HTML

**核心方法**:
- `parseSearchResultHtml(html)`: 解析搜索结果

**返回**:
```typescript
{
    posts: Array<{ mid: string; uid: string }>,
    hasNextPage: boolean,
    nextPageLink: string,
    totalCount: number,
    currentPage: number,
    totalPage: number,
    lastPostTime: Date
}
```

### 5. `DelayService`

**职责**: 延迟和退避策略

**核心方法**:
- `randomDelay(minSec, maxSec)`: 随机延迟
- `backoffDelay(key)`: 指数退避延迟（基于连续错误次数）
- `recordSuccess(key)`: 记录成功（重置退避计数器）
- `recordError(key)`: 记录错误（增加退避计数器）

**退避策略**:
- 连续失败次数 = 0: 0 秒
- 连续失败次数 = 1: 2 秒
- 连续失败次数 = 2: 4 秒
- 连续失败次数 = 3: 8 秒
- 连续失败次数 ≥ 4: 16 秒

### 6. `RateLimiterService`

**职责**: 速率限制（防止 API 过载）

**核心方法**:
- `acquire(key)`: 获取令牌（如果速率超限，等待）

**策略**: 令牌桶算法

### 7. `CronSchedulerService`

**职责**: Cron 调度管理

**核心方法**:
- `addSchedule(schedule)`: 添加调度任务
- `removeSchedule(scheduleId)`: 移除调度任务
- `loadSchedules()`: 加载所有启用的调度任务

**特性**:
- 使用 `node-schedule` 库
- 支持 CRON / INTERVAL / ONCE 三种调度类型
- 自动更新 `nextRunAt`
- 调用 `WorkflowExecutionService` 执行工作流

### 8. `WorkflowExecutionService`

**职责**: 工作流执行管理

**核心方法**:
- `execute(workflowId, inputs)`: 执行工作流

## 使用示例

### 1. 添加新的 Visitor

**步骤**:

1. 在 `packages/workflow-ast/src/` 定义 AST 类：

```typescript
// packages/workflow-ast/src/MyCustomAst.ts
import { Ast } from '@sker/workflow';
import { Node, Input, Output } from '@sker/workflow';

@Node({ title: '我的自定义节点' })
export class MyCustomAst extends Ast {
    @Input()
    inputValue: string = '';

    @Output({ title: '处理结果' })
    result: string = '';
}
```

2. 在 `packages/workflow-run/src/` 实现 Visitor：

```typescript
// packages/workflow-run/src/MyCustomAstVisitor.ts
import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { MyCustomAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';

@Injectable()
export class MyCustomAstVisitor {
    @Handler(MyCustomAst)
    visit(ast: MyCustomAst, input$: Observable<any>, ctx: any): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            input$.subscribe({
                next: (inputData) => {
                    ast.emitCount += 1;
                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as any)[key] = inputData[key];
                        });
                    }
                },
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, data: ast });
                    obs.complete();
                },
                complete: () => {
                    try {
                        // 业务逻辑
                        ast.result = `处理完成: ${ast.inputValue}`;
                        obs.next({ type: 'node_emit', id: ast.id, property: 'result', value: ast.result });

                        ast.state = 'success';
                        obs.next({ type: 'node_success', id: ast.id, data: ast });
                        obs.complete();
                    } catch (error) {
                        ast.state = 'fail';
                        setAstError(ast, error);
                        obs.next({ type: 'node_fail', id: ast.id, data: ast });
                        obs.complete();
                    }
                }
            });

            return () => {
                abortController.abort();
                obs.complete();
            };
        });
    }
}
```

3. 在 `packages/workflow-run/src/index.ts` 导出：

```typescript
export { MyCustomAstVisitor } from './MyCustomAstVisitor';
```

### 2. 继承 WeiboApiClient

如果是微博 API 节点：

```typescript
import { WeiboApiClient } from './services/weibo-api-client.base';

@Injectable()
export class MyWeiboApiVisitor extends WeiboApiClient {
    constructor(
        @Inject(WeiboAccountService) accountService: WeiboAccountService,
        @Inject(DelayService) delayService: DelayService,
        @Inject(RateLimiterService) rateLimiter: RateLimiterService
    ) {
        super(accountService, delayService, rateLimiter);
    }

    @Handler(MyWeiboApiAst)
    visit(ast: MyWeiboApiAst, ctx: any): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const handler = async () => {
                try {
                    const url = `https://weibo.com/ajax/my-api?id=${ast.id}`;
                    const data = await this.fetchApi({ url, refererOptions: { uid: ast.uid } });

                    // 处理数据
                    ast.result = data;
                    obs.next({ type: 'node_emit', id: ast.id, property: 'result', value: ast.result });

                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id, data: ast });
                    obs.complete();
                } catch (error) {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, data: ast });
                    obs.complete();
                }
            };
            handler();
        });
    }
}
```

## 依赖关系

```
@sker/workflow-run
├── @sker/core           # DI 容器
├── @sker/workflow       # 工作流引擎（Handler、NodeEvent、setAstError）
├── @sker/workflow-ast   # AST 节点定义
├── @sker/entities       # 数据库实体（TypeORM）
├── @sker/mq             # 消息队列（RabbitMQ + RxJS）
├── @sker/redis          # Redis 缓存
├── @sker/nlp            # NLP 分析器
├── playwright           # 浏览器自动化
├── cheerio              # HTML 解析
├── langchain            # LangChain Agent
├── rxjs                 # 响应式编程
└── zod                  # Schema 验证
```

## 构建和开发

```bash
# 开发模式（监听文件变化）
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm check-types

# 代码检查
pnpm lint

# 运行测试
pnpm test
```

## 代码艺术家哲学

### 存在即合理

- 每个 Visitor 对应唯一的 AST 节点，职责明确
- `WeiboApiClient` 基类消除 550 行重复代码
- 所有服务单一职责：账号管理、延迟控制、速率限制、错误处理各司其职

### 优雅即简约

- Observable 数据流：统一的节点通信协议
- AbortController 取消机制：优雅的资源清理
- 分页生成器模式：内存高效的大数据处理
- 快照增量法：准确追踪数据变化

### 性能即艺术

- 速率限制：保护 API 不过载
- 指数退避：失败后智能降速
- 连接池管理：复用数据库连接
- 批量保存：减少数据库往返

### 错误处理如为人处世的哲学

- `WeiboErrorHandler`：统一错误分类（LOGIN_EXPIRED / PERMISSION_DENIED / RATE_LIMITED）
- `NoRetryError`：明确标记不可重试错误
- 账号健康分数：自动降级失败账号
- 工作流取消：响应式中止信号传播
