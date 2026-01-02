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

**组织原则：按 @Node 装饰器的 type 字段分类**

用户通过节点类型快速定位，与 UI 中的节点分类保持一致。

```
packages/workflow-ast/
├── src/
│   ├── index.ts                    # 统一导出（保持向后兼容）
│   │
│   ├── llm/                        # 【LLM 节点】大模型相关 (26个)
│   │   ├── LlmTextAgentAst.ts      # 文本大模型
│   │   ├── PersonaAst.ts           # 角色记忆
│   │   ├── GroupChatLoopAst.ts     # 循环群聊
│   │   ├── LlmImageToTextAst.ts    # 图生文
│   │   ├── LlmTextToImageAst.ts    # 文生图
│   │   ├── CodeGeneratorAst.ts     # 代码生成器
│   │   └── ...                     # 其他 LLM 节点
│   │
│   ├── crawler/                    # 【爬虫节点】数据采集 (16个)
│   │   ├── WeiboLoginAst.ts        # 微博登录
│   │   ├── WeiboKeywordSearchAst.ts # 关键词搜索
│   │   ├── HttpAst.ts              # HTTP 请求
│   │   └── ...                     # 其他爬虫节点
│   │
│   ├── basic/                      # 【基础节点】通用功能 (8个)
│   │   ├── SqlExecuteAst.ts        # SQL 执行
│   │   ├── ExcelUploadAst.ts       # Excel 上传
│   │   ├── ShareAst.ts             # 分享
│   │   └── ...                     # 其他基础节点
│   │
│   ├── sentiment/                  # 【舆情节点】舆情分析专家 (6个)
│   │   ├── KeywordAgentAst.ts      # 关键词专家
│   │   ├── MediaAgentAst.ts        # 媒体专家
│   │   ├── ForumAgentAst.ts        # 论坛主持人
│   │   └── ...                     # 其他舆情节点
│   │
│   ├── control/                    # 【控制节点】流程控制 (2个)
│   │   ├── LlmCategoryAst.ts       # 分类器
│   │   └── StoryQualityLoopAst.ts  # 质量循环
│   │
│   ├── analysis/                   # 【分析节点】数据分析 (1个)
│   │   └── SerpClusterAst.ts       # 搜索结果聚类
│   │
│   ├── scheduler/                  # 【调度节点】定时任务 (1个)
│   │   └── ScheduledWorkflowAst.ts # 定时工作流
│   │
│   ├── meta/                       # Meta 节点（元编程）
│   │   ├── LlmInferenceAst.ts      # LLM 推理
│   │   ├── TransformAst.ts         # 数据转换
│   │   └── ...
│   │
│   ├── types/                      # 类型定义
│   └── templates/                  # 节点模板
│
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

**设计理念：**

1. **按 type 分类**：与 `@Node({ type: 'xxx' })` 装饰器保持一致
2. **快速定位**：用户可以直接按节点类型找到对应文件
3. **扩展性好**：新增节点只需放入对应 type 文件夹
4. **与 UI 一致**：文件夹结构与 UI 中的节点分类保持一致
5. **向后兼容**：`index.ts` 保持所有导出，现有代码无需修改

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
