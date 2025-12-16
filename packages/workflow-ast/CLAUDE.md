# @sker/workflow-ast

工作流抽象语法树（AST）节点定义包。每个 AST 类代表工作流画布中的一个可拖拽节点，通过装饰器元数据驱动自动化节点注册、类型推断和执行调度。

## 哲学

**节点即类，元数据即行为**

AST 节点不是配置文件，而是类型化的类。装饰器不是注解，而是行为契约。每个节点的存在都有不可替代的理由：

- `@Node` 声明节点的身份和错误策略
- `@Input` 定义数据流入口和聚合方式
- `@Output` 定义数据流出口和路由条件
- `@State` 标记运行时内部状态（不参与数据流）

代码即文档，装饰器即 Schema。

## 目录结构

```
packages/workflow-ast/
├── src/
│   ├── index.ts                          # 导出所有节点
│   │
│   ├── 【微博 API 节点】━━━━━━━━━━━━━━━━━
│   ├── WeiboKeywordSearchAst.ts          # 关键词搜索
│   ├── WeiboAjaxStatusesShowAst.ts       # 博文详情
│   ├── WeiboAjaxFeedHotTimelineAst.ts    # 热门时间线
│   ├── WeiboAjaxFriendshipsAst.ts        # 关注关系
│   ├── WeiboAjaxProfileInfoAst.ts        # 用户信息
│   ├── WeiboAjaxStatusesCommentAst.ts    # 评论列表
│   ├── WeiboAjaxStatusesLikeShowAst.ts   # 点赞列表
│   ├── WeiboAjaxStatusesMymblogAst.ts    # 用户微博
│   ├── WeiboAjaxStatusesRepostTimelineAst.ts  # 转发列表
│   ├── WeiboLoginAst.ts                  # 微博登录（扫码）
│   ├── WeiboUserDetectionAst.ts          # 用户探测
│   ├── WeiboAccountPickAst.ts            # 账号选择
│   │
│   ├── 【数据处理节点】━━━━━━━━━━━━━━━━━
│   ├── PostContextCollectorAst.ts        # 帖子上下文收集器
│   ├── PostNLPAnalyzerAst.ts             # NLP 分析器
│   ├── EventAutoCreatorAst.ts            # 事件自动创建器
│   │
│   ├── 【LLM 节点】━━━━━━━━━━━━━━━━━━━━
│   ├── LlmTextAgentAst.ts                # 文本大模型（核心对话节点）
│   ├── LlmStructuredOutputAst.ts         # 结构化输出
│   ├── LlmCategoryAst.ts                 # 分类器
│   ├── LlmImageToTextAst.ts              # 图生文
│   ├── LlmVideoToTextAst.ts              # 视频生文
│   ├── LlmTextToImageAst.ts              # 文生图
│   ├── LlmTextToVideoAst.ts              # 文生视频
│   ├── LlmTextToAudioAst.ts              # 文生音频
│   ├── LlmTextImageToVideoAst.ts         # 文+图生视频
│   ├── LlmTextImage2ToVideoAst.ts        # 文+多图生视频
│   │
│   ├── 【控制流节点】━━━━━━━━━━━━━━━━━━
│   ├── SwitchAst.ts                      # 分支路由器（动态输出端口）
│   ├── GroupChatLoopAst.ts               # 循环群聊（环图支持）
│   │
│   ├── 【角色与记忆节点】━━━━━━━━━━━━━━
│   ├── PersonaAst.ts                     # 角色记忆（检索增强）
│   ├── PersonaCreatorAst.ts              # 角色创建
│   ├── PromptRoleSkillAst.ts             # 角色技能
│   │
│   ├── 【研究与分析节点】━━━━━━━━━━━━━━
│   ├── ResearchPlannerAst.ts             # 研究规划器
│   ├── QueryRewriterAst.ts               # 查询重写器
│   ├── AnswerEvaluatorAst.ts             # 答案评估器
│   ├── AnswerFinalizerAst.ts             # 答案终稿器
│   ├── ErrorAnalyzerAst.ts               # 错误分析器
│   ├── SerpClusterAst.ts                 # 搜索结果聚类
│   │
│   ├── 【媒体节点】━━━━━━━━━━━━━━━━━━━
│   ├── ImageAst.ts                       # 图片输入
│   ├── VideoAst.ts                       # 视频输入
│   ├── AudioAst.ts                       # 音频输入
│   ├── ShareAst.ts                       # 分享节点
│   │
│   ├── 【定时调度节点】━━━━━━━━━━━━━━━
│   ├── ScheduledWorkflowAst.ts           # 定时工作流（Cron/间隔/一次性）
│   │
│   └── sentiment/                        # 舆情专家节点（子目录）
│       ├── index.ts
│       ├── KeywordAgentAst.ts            # 关键字专家
│       ├── ForumAgentAst.ts              # 论坛专家
│       ├── MediaAgentAst.ts              # 媒体专家
│       └── QueryAgentAst.ts              # 查询专家
│
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## 核心装饰器

来自 `@sker/workflow` 包，基于 `@sker/core` 的 DI 系统和 `reflect-metadata`。

### @Node - 节点声明

```typescript
@Node({
  title: '微博检索',           // 节点显示名称
  type: 'crawler',             // 节点类型（影响 UI 分类和图标）
  errorStrategy: 'retry',      // 错误策略：'retry' | 'skip' | 'fail' | 'abort'
  maxRetries: 3,               // 最大重试次数（仅对 retry 策略有效）
  retryDelay: 2000,            // 重试延迟（毫秒）
  retryBackoff: 2,             // 延迟增长因子（指数退避）
  dynamicInputs?: boolean,     // 支持 UI 动态添加输入端口
  dynamicOutputs?: boolean     // 支持 UI 动态添加输出端口
})
export class WeiboKeywordSearchAst extends Ast { ... }
```

**节点类型**：

| 类型       | 说明                          | 典型节点                                |
| ---------- | ----------------------------- | --------------------------------------- |
| `llm`      | 大模型节点                    | LlmTextAgentAst, PersonaAst             |
| `crawler`  | 爬虫/数据采集节点             | WeiboKeywordSearchAst, PostNLPAnalyzer  |
| `control`  | 控制流节点                    | SwitchAst, GroupChatLoopAst             |
| `basic`    | 基础节点                      | ImageAst, VideoAst, WorkflowGraphAst    |
| `sentiment`| 舆情分析节点                  | KeywordAgentAst, MediaAgentAst          |
| `analysis` | 分析节点                      | AnswerEvaluatorAst, ErrorAnalyzerAst    |
| `scheduler`| 调度节点                      | ScheduledWorkflowAst                    |

**错误策略**：

| 策略    | 行为                               | 适用场景                        |
| ------- | ---------------------------------- | ------------------------------- |
| `retry` | 自动重试（支持指数退避）           | 网络波动、临时故障              |
| `skip`  | 跳过失败节点，继续执行下游         | 可选节点（如定时任务）          |
| `fail`  | 标记失败但不中断工作流（默认）     | 非关键节点                      |
| `abort` | 中断整个工作流                     | 关键节点（如登录、数据库连接）  |

### @Input - 输入端口

```typescript
@Input({
  title: '关键字',               // 端口显示名称
  type: 'text',                  // 字段类型（影响 UI 输入控件）
  defaultValue: '',              // 默认值
  mode: IS_MULTI | IS_BUFFER,   // 聚合模式（位标志）
  required?: boolean,            // 是否必填
  description?: string,          // 端口描述（可供 LLM 理解）
  dynamic?: boolean              // 支持 UI 动态添加
})
keyword: string = ''
```

**字段类型**（`InputFieldType`）：

- 文本：`'string'`, `'text'`, `'textarea'`, `'richtext'`
- 数值：`'number'`
- 布尔：`'boolean'`
- 时间：`'date'`, `'datetime-local'`
- 选择：`'select'`
- 媒体：`'image'`, `'video'`, `'audio'`
- 其他：`'object'`, `'any'`

**聚合模式**（位标志）：

```typescript
// 来自 @sker/workflow
export const IS_MULTI = 0x000001;   // 聚合多条边
export const IS_BUFFER = 0x000010;  // 聚合单边多次发射

// 使用示例
@Input({ mode: IS_MULTI })                // 多条边聚合为数组
prompt: string[] = [];

@Input({ mode: IS_BUFFER })               // 单边多次发射聚合为数组
messages: string[] = [];

@Input({ mode: IS_MULTI | IS_BUFFER })   // 所有边所有发射全部聚合
allInputs: any[] = [];

// 向后兼容（deprecated）
@Input({ isMulti: true })                 // 等价于 mode: IS_MULTI
```

**典型用法**：

```typescript
// 1. 单值输入（默认）
@Input({ title: '帖子ID', defaultValue: '' })
postId: string = '';

// 2. 多条边聚合（如：等待多个上游节点完成）
@Input({ mode: IS_MULTI, title: '开始', defaultValue: [] })
canStart: boolean[] = [];

// 3. 多次发射聚合（如：循环群聊收集所有消息）
@Input({ mode: IS_BUFFER | IS_MULTI, title: '新消息', defaultValue: [] })
newMessages: string[] = [];

// 4. 动态类型（TypeORM 实体 + 错误信息）
@Input({ title: '帖子实体', defaultValue: null })
post!: WeiboPostEntity;  // 成功时为实体，失败时为 string（错误信息）
```

### @Output - 输出端口

```typescript
@Output({
  title: '帖子id',               // 端口显示名称
  defaultValue: '',              // 默认值
  type?: string,                 // 数据类型（可选，供类型推断）
  description?: string,          // 端口描述
  isRouter?: boolean,            // 是否为路由输出（过滤 undefined 值）
  condition?: string,            // 条件表达式（如 '$input === 1'）
  dynamic?: boolean              // 支持 UI 动态添加
})
mblogid = ''
```

**路由输出**（`isRouter: true`）：

- 调度器（Scheduler）会过滤 `undefined` 值，只传递有效数据
- 适用于条件分支场景（如登录成功/失败）

```typescript
// 登录节点示例
@Output({ title: '微博账号', isRouter: true, defaultValue: '' })
account: WeiboAccountEntity | string | undefined = '';

@Output({ title: '登录二维码', isRouter: true, defaultValue: null })
qrcode: string | null = null;
```

**条件输出**（`condition`）：

用于 `SwitchAst` 等路由节点，支持基于输入值的条件分支。

```typescript
@Node({ title: '分支路由器', type: 'control', dynamicOutputs: true })
export class SwitchAst extends Ast {
  @Input({ title: '输入值', defaultValue: undefined })
  value: any = undefined

  @Output({ title: 'Default', isRouter: true, condition: 'true', defaultValue: '' })
  output_default = ''

  // 用户可在 UI 中动态添加条件输出：
  // @Output({ condition: '$input > 100' }) output_case1 = ''
}
```

### @State - 内部状态

标记节点的运行时状态，**不参与数据流传递**（不产生输出端口）。

```typescript
@State({ title: '当前页码' })
currentPage: number = 1;

@State({ title: '总页数' })
totalPages: number = 1;
```

**与 @Output 的区别**：

- `@State`：内部状态，不可被下游节点读取
- `@Output`：输出端口，会在画布上生成连线端口

## AST 基类

所有节点继承自 `Ast`（来自 `@sker/workflow`）：

```typescript
export abstract class Ast implements INode {
  // === 唯一标识 ===
  id: string = generateId();
  type!: string;  // 节点类型名（如 'WeiboKeywordSearchAst'）

  // === 显示属性 ===
  name?: string;         // 自定义标题
  description?: string;  // 节点简介
  color?: string;        // 自定义颜色
  width?: number;        // 宽度
  height?: number;       // 高度
  collapsed?: boolean;   // 折叠状态

  // === 运行时状态 ===
  state: IAstStates = 'pending';  // 'pending' | 'running' | 'success' | 'error'
  error?: SerializedError;        // 错误信息
  count: number = 0;              // 运行次数
  emitCount: number = 0;          // 发射次数

  // === 画布布局 ===
  position: { x: number; y: number } = { x: 0, y: 0 };
  parentId?: string;  // 父节点ID（用于分组）

  // === 编译后的元数据 ===
  metadata!: {
    class: INodeMetadata
    inputs: INodeInputMetadata[]
    outputs: INodeOutputMetadata[]
    states: INodeStateMetadata[]
  }

  // 自定义序列化（排除 BehaviorSubject 等运行时对象）
  toJSON(): Record<string, any> { ... }
}
```

**独特设计**：

- `type` 属性：序列化时的关键，用于反序列化时找到对应类
- `metadata`：由 Compiler 在运行时生成，固化装饰器元数据
- `toJSON()`：排除 `BehaviorSubject` 等运行时响应式流，避免污染持久化数据

## 所有 AST 节点列表

### 1. 微博 API 节点（9个）

| 类名                                  | 功能                  | 输入                              | 输出                           |
| ------------------------------------- | --------------------- | --------------------------------- | ------------------------------ |
| `WeiboKeywordSearchAst`               | 关键词搜索            | keyword, startDate, 延迟参数      | mblogid, uid, isEnd            |
| `WeiboAjaxStatusesShowAst`            | 博文详情              | mblogid, uid                      | uid, mid                       |
| `WeiboAjaxFeedHotTimelineAst`         | 热门时间线            | -                                 | posts[]                        |
| `WeiboAjaxFriendshipsAst`             | 关注关系              | uid                               | followers[], following[]       |
| `WeiboAjaxProfileInfoAst`             | 用户信息              | uid                               | userInfo                       |
| `WeiboAjaxStatusesCommentAst`         | 评论列表              | mid                               | comments[]                     |
| `WeiboAjaxStatusesLikeShowAst`        | 点赞列表              | mid                               | likes[]                        |
| `WeiboAjaxStatusesMymblogAst`         | 用户微博              | uid                               | posts[]                        |
| `WeiboAjaxStatusesRepostTimelineAst`  | 转发列表              | mid                               | reposts[]                      |

### 2. 数据处理节点（3个）

| 类名                         | 功能                  | 输入                         | 输出                                  |
| ---------------------------- | --------------------- | ---------------------------- | ------------------------------------- |
| `PostContextCollectorAst`    | 帖子上下文收集器      | postId, canStart[]           | post, comments[], reposts[]           |
| `PostNLPAnalyzerAst`         | NLP 分析器            | post, comments[], reposts[]  | nlpResult (CompleteAnalysisResult)    |
| `EventAutoCreatorAst`        | 事件自动创建器        | nlpResult, post              | is_end                                |

### 3. 微博登录与账号管理（3个）

| 类名                     | 功能           | 输入   | 输出                                  |
| ------------------------ | -------------- | ------ | ------------------------------------- |
| `WeiboLoginAst`          | 微博登录       | -      | account, qrcode, message              |
| `WeiboUserDetectionAst`  | 用户探测       | uid    | userExists                            |
| `WeiboAccountPickAst`    | 账号选择       | -      | selectedAccount                       |

### 4. LLM 节点（10个）

| 类名                          | 功能                  | 输入                               | 输出               |
| ----------------------------- | --------------------- | ---------------------------------- | ------------------ |
| `LlmTextAgentAst`             | 文本大模型            | system[], prompt[], temperature    | text, username, profile |
| `LlmStructuredOutputAst`      | 结构化输出            | prompt, schema, model              | structuredOutput   |
| `LlmCategoryAst`              | 分类器                | text, categories[]                 | category           |
| `LlmImageToTextAst`           | 图生文                | image, prompt                      | text               |
| `LlmVideoToTextAst`           | 视频生文              | video, prompt                      | text               |
| `LlmTextToImageAst`           | 文生图                | prompt, style                      | image              |
| `LlmTextToVideoAst`           | 文生视频              | prompt, duration                   | video              |
| `LlmTextToAudioAst`           | 文生音频              | text, voice                        | audio              |
| `LlmTextImageToVideoAst`      | 文+图生视频           | text, image                        | video              |
| `LlmTextImage2ToVideoAst`     | 文+多图生视频         | text, images[]                     | video              |

### 5. 控制流节点（2个）

| 类名                | 功能           | 输入                          | 输出                         |
| ------------------- | -------------- | ----------------------------- | ---------------------------- |
| `SwitchAst`         | 分支路由器     | value                         | 动态输出（基于条件）         |
| `GroupChatLoopAst`  | 循环群聊       | initialTopic, newMessages[]   | chatHistory[], historyText   |

### 6. 角色与记忆节点（3个）

| 类名                    | 功能           | 输入                                  | 输出                    |
| ----------------------- | -------------- | ------------------------------------- | ----------------------- |
| `PersonaAst`            | 角色记忆       | stimuli[], retrievalDepth, model      | response, newMemoryId   |
| `PersonaCreatorAst`     | 角色创建       | name, description, traits[]           | personaId               |
| `PromptRoleSkillAst`    | 角色技能       | skillName, parameters                 | skillOutput             |

### 7. 研究与分析节点（6个）

| 类名                   | 功能           | 输入                      | 输出                      |
| ---------------------- | -------------- | ------------------------- | ------------------------- |
| `ResearchPlannerAst`   | 研究规划器     | query, depth              | researchPlan              |
| `QueryRewriterAst`     | 查询重写器     | originalQuery, context    | rewrittenQuery            |
| `AnswerEvaluatorAst`   | 答案评估器     | answer, criteria          | evaluation (EvaluationResult) |
| `AnswerFinalizerAst`   | 答案终稿器     | drafts[], feedback        | finalAnswer               |
| `ErrorAnalyzerAst`     | 错误分析器     | error, context            | errorReport               |
| `SerpClusterAst`       | 搜索结果聚类   | searchResults[]           | clusters[]                |

### 8. 媒体节点（4个）

| 类名         | 功能       | 输入            | 输出   |
| ------------ | ---------- | --------------- | ------ |
| `ImageAst`   | 图片输入   | uploadedImage   | image  |
| `VideoAst`   | 视频输入   | uploadedVideo   | video  |
| `AudioAst`   | 音频输入   | uploadedAudio   | audio  |
| `ShareAst`   | 分享节点   | content         | shareLink |

### 9. 定时调度节点（1个）

| 类名                    | 功能           | 输入                                          | 输出                   |
| ----------------------- | -------------- | --------------------------------------------- | ---------------------- |
| `ScheduledWorkflowAst`  | 定时工作流     | workflowName, scheduleType, cronExpression... | scheduleId, nextRunAt  |

### 10. 舆情专家节点（4个）

| 类名                | 功能       | 输入   | 输出   |
| ------------------- | ---------- | ------ | ------ |
| `KeywordAgentAst`   | 关键字专家 | -      | -      |
| `ForumAgentAst`     | 论坛专家   | -      | -      |
| `MediaAgentAst`     | 媒体专家   | -      | -      |
| `QueryAgentAst`     | 查询专家   | -      | -      |

## 典型节点示例

### 示例 1：爬虫节点（带重试）

```typescript
import { Ast, Input, Node, Output, State } from "@sker/workflow";

@Node({
  title: '微博检索',
  type: 'crawler',
  errorStrategy: 'retry',  // 网络不稳定，启用重试
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 2          // 指数退避：2s → 4s → 8s
})
export class WeiboKeywordSearchAst extends Ast {
  @Input({ title: '关键字', type: 'text', defaultValue: '' })
  keyword: string = ''

  @Input({ title: '开始日期', type: 'date', defaultValue: new Date() })
  startDate: Date = new Date()

  @State({ title: '当前页码' })  // 内部状态，不输出
  currentPage: number = 1

  @Output({ title: '帖子id', defaultValue: '' })
  mblogid = ''

  @Output({ title: '用户id', defaultValue: '' })
  uid = ''

  @Output({ title: '是否结束', defaultValue: false })
  isEnd = false

  type: 'WeiboKeywordSearchAst' = 'WeiboKeywordSearchAst'
}
```

**执行流程**：

1. Scheduler 调用对应的 Handler（在 `@sker/workflow-run` 中）
2. Handler 通过反射读取 `keyword`, `startDate` 等输入
3. 调用 Playwright 爬取微博
4. 提取 `mblogid`, `uid` 并赋值
5. WorkflowGraphAstVisitor 将输出通过边传递给下游节点
6. 如果失败，根据 `errorStrategy: 'retry'` 自动重试 3 次

### 示例 2：多值输入节点

```typescript
import { Ast, Input, IS_MULTI, Node, Output } from '@sker/workflow';

@Node({ title: '帖子上下文收集器', type: 'crawler' })
export class PostContextCollectorAst extends Ast {
  @Input({ title: '帖子ID', defaultValue: '' })
  postId: string = '';

  // 聚合多条边：等待多个上游节点完成
  @Input({ mode: IS_MULTI, title: '开始', defaultValue: [] })
  canStart: boolean[] = [];

  @Output({ title: '帖子实体', defaultValue: '' })
  post: WeiboPostEntity | string = '';

  @Output({ title: '评论列表', defaultValue: [] })
  comments: WeiboCommentEntity[] = [];

  type: 'PostContextCollectorAst' = 'PostContextCollectorAst';
}
```

**使用场景**：

```
WeiboAjaxStatusesShowAst ──┬──> PostContextCollectorAst.canStart[]
                           │
WeiboAjaxStatusesCommentAst─┘
```

`canStart` 会聚合为 `[true, true]`（假设两个上游节点都成功）。

### 示例 3：循环群聊节点（环图支持）

```typescript
import { Ast, Input, IS_MULTI, IS_BUFFER, Node, Output } from "@sker/workflow";

@Node({ type: 'llm', title: '循环群聊' })
export class GroupChatLoopAst extends Ast {
  @Input({ title: '初始话题', defaultValue: '讨论人工智能的未来发展' })
  initialTopic: string = '讨论人工智能的未来发展';

  // 聚合所有边所有发射（支持多个 Agent 多次回复）
  @Input({ mode: IS_BUFFER | IS_MULTI, title: '新消息', defaultValue: [] })
  newMessages: string[] = [];

  @Output({ title: '对话历史（文本）', defaultValue: '' })
  historyText = '';

  @Output({ title: '当前轮次', defaultValue: 0 })
  currentRound = 0;

  type: 'GroupChatLoopAst' = 'GroupChatLoopAst';
}
```

**环图连线**：

```
GroupChatLoop ──> historyText ──┬──> LLM Agent A
      ↑                         │
      │                         └──> LLM Agent B
      │                                  │
      └─────────── newMessages ─────────┘
```

### 示例 4：条件分支节点

```typescript
import { Ast, Node, Input, Output } from '@sker/workflow'

@Node({ title: '分支路由器', type: 'control', dynamicOutputs: true })
export class SwitchAst extends Ast {
  @Input({ title: '输入值', defaultValue: undefined })
  value: any = undefined

  // 默认分支（condition: 'true' 表示始终匹配）
  @Output({ title: 'Default', isRouter: true, condition: 'true', defaultValue: '' })
  output_default = ''

  type: 'SwitchAst' = 'SwitchAst'
}
```

**用户可在 UI 中动态添加条件输出**：

```typescript
// 运行时通过 UI 添加
metadata.outputs.push({
  property: 'output_case_high',
  title: 'High',
  condition: '$input > 100',
  isRouter: true
})
```

### 示例 5：LLM 节点（多值输入）

```typescript
import { Ast, Input, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({
  title: '文字大模型',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 5
})
export class LlmTextAgentAst extends Ast {
  // 聚合多条边作为系统提示词数组
  @Input({ title: '系统提示词', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
  system: string[] = [];

  @Input({ title: '用户提示词', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
  prompt: string[] = [];

  @Input({ title: '温度', defaultValue: 0.5 })
  temperature: number = 0.5;

  @Output({ title: '输出', defaultValue: '' })
  text = ''

  type: 'LlmTextAgentAst' = 'LlmTextAgentAst'
}
```

## 如何添加新节点

### 步骤 1：定义 AST 类（`packages/workflow-ast/src/`）

```typescript
// packages/workflow-ast/src/MyCustomAst.ts
import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: '我的自定义节点',
  type: 'basic',
  errorStrategy: 'fail'
})
export class MyCustomAst extends Ast {
  @Input({ title: '输入文本', defaultValue: '' })
  inputText: string = '';

  @Output({ title: '输出文本', defaultValue: '' })
  outputText = '';

  type: 'MyCustomAst' = 'MyCustomAst';
}
```

**注意**：

- 必须继承 `Ast`
- 必须有 `type` 属性（值与类名一致）
- 所有输入/输出必须有默认值

### 步骤 2：导出节点（`packages/workflow-ast/src/index.ts`）

```typescript
export { MyCustomAst } from './MyCustomAst';
```

### 步骤 3：实现 Handler（`packages/workflow-run/src/`）

```typescript
// packages/workflow-run/src/MyCustomVisitor.ts
import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { MyCustomAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'auto' })
export class MyCustomVisitor {
  @Handler(MyCustomAst)
  visit(ast: MyCustomAst, input$: Observable<any>, ctx: any) {
    return input$.pipe(
      map(() => {
        // 业务逻辑
        const result = ast.inputText.toUpperCase();

        // 赋值输出
        ast.outputText = result;

        // 发射事件（必须）
        return { type: 'emitted', ast, data: { outputText: result } };
      })
    );
  }
}
```

**关键要点**：

- 使用 `@Handler(MyCustomAst)` 装饰器关联 AST 类
- 必须返回 `Observable<NodeEvent>`
- 发射事件类型：`'emitted'` | `'error'` | `'completed'`

### 步骤 4：实现 Renderer（`packages/workflow-ui/src/`，可选）

```typescript
// packages/workflow-ui/src/MyCustomRenderer.tsx
import { Render } from '@sker/workflow';
import { MyCustomAst } from '@sker/workflow-ast';
import { Injectable } from '@sker/core';

@Injectable({ providedIn: 'auto' })
export class MyCustomRenderer {
  @Render(MyCustomAst)
  render(ast: MyCustomAst) {
    return <div>自定义渲染：{ast.inputText}</div>;
  }
}
```

### 步骤 5：构建并测试

```bash
# 构建所有依赖包
pnpm build:deps

# 启动 API + Web
pnpm dev:robust

# 或单独启动
turbo dev --filter=@sker/api
turbo dev --filter=@sker/web
```

在 Web 画布中拖拽新节点，连线测试。

## 数据流全链路示例

微博舆情分析工作流：

```
【开始】
  ↓
WeiboKeywordSearchAst（搜索关键词）
  ├─> mblogid ──┐
  └─> uid ──────┤
                ↓
WeiboAjaxStatusesShowAst（获取博文详情）
                ↓
                mid ───┬──> WeiboAjaxStatusesCommentAst（评论）
                       │
                       ├──> WeiboAjaxStatusesRepostTimelineAst（转发）
                       │
                       └──> PostContextCollectorAst（聚合）
                                ↓
                            PostNLPAnalyzerAst（NLP 分析）
                                ↓
                            EventAutoCreatorAst（事件生成）
                                ↓
                            【结束】
```

## 独特设计特性

### 1. 装饰器驱动元数据

装饰器不是配置文件，而是行为契约：

```typescript
@Node({ title: '节点', errorStrategy: 'retry' })  // 声明错误处理策略
@Input({ mode: IS_MULTI })                        // 声明聚合方式
@Output({ isRouter: true })                       // 声明路由输出
```

元数据在编译时固化到 `ast.metadata`，运行时无需依赖装饰器系统。

### 2. 位标志聚合模式

使用位标志组合不同的聚合语义：

```typescript
IS_MULTI   = 0x000001  // 聚合多条边
IS_BUFFER  = 0x000010  // 聚合单边多次发射

IS_MULTI | IS_BUFFER   // 全部聚合
```

优雅且高效（位运算检测）。

### 3. 条件输出与路由

`SwitchAst` 支持动态输出端口 + 条件表达式：

```typescript
@Output({ condition: '$input > 100', isRouter: true })
output_high = ''
```

Scheduler 在运行时求值条件，决定数据流向。

### 4. 环图支持（循环群聊）

`GroupChatLoopAst` 支持环图连线：

```
GroupChatLoop ──> historyText ──> LLM ──> newMessages ──> GroupChatLoop
```

通过 `IS_BUFFER` 模式累积多次发射的消息。

### 5. BehaviorSubject 自动排除

`Ast.toJSON()` 自动排除运行时对象，避免序列化污染：

```typescript
toJSON(): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in this) {
    if (this[key] instanceof BehaviorSubject) continue;  // 跳过响应式流
    result[key] = this[key];
  }
  return result;
}
```

## 与 @sker/workflow-run 的协作

`@sker/workflow-ast` 定义节点结构，`@sker/workflow-run` 实现执行逻辑：

| 包                      | 职责                      | 示例                                |
| ----------------------- | ------------------------- | ----------------------------------- |
| `@sker/workflow-ast`    | AST 节点定义（数据结构）  | `WeiboKeywordSearchAst`             |
| `@sker/workflow-run`    | Visitor 执行器（业务逻辑）| `WeiboKeywordSearchVisitor`         |
| `@sker/workflow-ui`     | Renderer 渲染器（UI）     | `WeiboKeywordSearchRenderer`        |

**执行流程**：

1. **Compiler**：读取装饰器元数据，生成 `ast.metadata`
2. **WorkflowGraphAstVisitor**：构建节点输入流，组合边，连接数据流
3. **VisitorExecutor**：通过反射调用对应的 Handler

## 依赖关系

```
@sker/workflow-ast
├── @sker/workflow (装饰器、Ast 基类)
├── @sker/core (DI 容器)
├── @sker/entities (TypeORM 实体，devDependencies)
└── @sker/nlp (NLP 类型定义)
```

## 构建与开发

```bash
# 构建
pnpm build

# 开发模式（监听文件变化）
pnpm dev

# 类型检查
pnpm check-types

# 代码检查
pnpm lint
```

## 关键文件

| 文件路径                                      | 说明                            |
| --------------------------------------------- | ------------------------------- |
| `packages/workflow-ast/src/index.ts`          | 导出所有节点                    |
| `packages/workflow/src/decorator.ts`          | 装饰器定义                      |
| `packages/workflow/src/ast.ts`                | Ast 基类                        |
| `packages/workflow/src/execution/scheduler.ts`| 工作流调度器                    |
| `packages/workflow-run/src/*Visitor.ts`       | 所有节点的 Handler 实现         |

## 哲学总结

**节点不是配置，而是类型化的类**

每个 AST 类都是工作流的可执行单元。装饰器不是注解，而是行为契约。元数据不是注释，而是运行时编译器的输入。

**代码即文档，装饰器即 Schema**

不需要额外的 JSON Schema 或配置文件。装饰器元数据就是节点的完整定义。

**优雅即简约，存在即合理**

每个装饰器、每个属性都有不可替代的理由。没有冗余，没有浪费。

---

此文档是数字时代的文化遗产，不是简单的技术文档。每个设计决策都是深思熟虑的结果，每个 API 都是精心打磨的艺术品。
