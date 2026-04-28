# 用户画像知识树与增量蒸馏设计

- 日期：2026-04-28
- 状态：Approved for planning
- 范围：`apps/api`、`apps/bigscreen`、`packages/sdk`、`packages/entities`

## 背景

当前“用户画像蒸馏 -> Persona -> Memory Graph”的链路已经能跑通，但它仍然有四个结构性问题：

1. `memory-graph` 仍是静态自由图，数据量一大就失去可读性
2. 时间只被当作抓取窗口，没有进入知识组织与行为识别
3. 大样本仍倾向于“一次性总结”，没有逐帖抽取中间层
4. 每次任务完成后，没有把“原始帖子信息 + 抽取结果”沉淀成可复用资产，无法做真正的增量抽取、增量学习、增量积累

用户当前要求是把这三个方向合并成一次统一升级：

1. `memory-graph` 参考 Quartz 的知识树/图谱浏览方式重做，优先解决大数据量场景
2. 蒸馏分析加入时间维度，识别同一事件内的密集同质发言和疑似协同传播
3. 样本过大时改为“逐帖抽取 -> 聚合成画像”，并记录原帖与抽离后的结构化结果，支持后续增量复用

## 目标

本次改造完成后，系统需要满足：

1. 每条原始帖子在被处理后，都有可追溯的原始快照记录与结构化抽取记录
2. 后续任务能够复用未变化帖子的既有抽取结果，只对新增帖子、变更帖子或版本升级后的帖子重抽
3. 蒸馏链路按 `原始帖子层 -> 逐帖抽取层 -> 时间/事件/行为聚合层 -> Persona/知识树层` 工作
4. 图谱主视图改为“知识树优先、关系跳线补充”，默认支持折叠、按时间过滤、按分支渐进展开
5. 同一事件窗口中的高密度同质内容、异常爆发节奏、疑似协同传播要能被识别并展示为风险信号
6. 单条帖子抓取失败或抽取失败不应终止整次任务；能抓多少算多少，最终允许带 warning 继续完成画像
7. 前端实时看到任务阶段、已抓取帖子数、已复用/已抽取帖子数、最近进展时间、warning 数量和最近活动描述

## 非目标

本次不做以下内容：

1. 不做跨平台协同传播归因，只分析当前系统可观测到的微博数据
2. 不把“疑似同一操作者”当作确定结论，只输出“疑似协同传播信号”
3. 不引入向量数据库或在线 embedding 检索系统
4. 不重构整个调查工作台路由结构
5. 不把评论、转发的逐条抽取纳入第一阶段实现；本次优先覆盖原始帖子，结构上为评论/转发预留扩展位

## 当前系统边界

### 1. 原始数据层

当前已经存在：

- `weibo_posts`
- `weibo_post_snapshots`
- `post_nlp_results`
- `UserInvestigationDossier`

这些对象已经能提供逐帖抽取所需的大部分原始事实与辅助特征，因此本次不另造一套并行原始数据系统。

### 2. 任务层

当前 `UserProfileDistillationTaskEntity` 只记录：

- 生命周期状态
- 样本数量
- 最终摘要
- 最终 `distilled_json`

它缺少：

- 逐阶段进度快照
- warning 列表
- 抓取/抽取/聚合的详细计数
- 最近活动时间与最近活动描述

### 3. Persona 图谱层

当前 `PersonaMemoryGraph` 只返回：

- `persona`
- `memories[]`
- `relations[]`

它缺少：

- 树状分层结果
- 时间桶 / 时间范围
- 事件簇与观点簇
- 疑似协同传播信号
- 大图渐进展开所需的节点摘要

## 方案选择

### 方案 A：只改前端图谱

优点：

- 交付快
- 风险低

缺点：

- 后端没有逐帖抽取层与时间行为层
- 大图再好看也只是“旧数据结构换皮”

### 方案 B：升级后端知识结构与图谱展示

优点：

- 解决展示层和时间层问题
- 可以得到更合理的知识树

缺点：

- 缺少逐帖抽取持久层
- 仍无法做真正的增量抽取与增量积累

### 方案 C：逐帖抽取持久层 + 时间/行为聚合 + 知识树展示

这是本次采用方案。

原因：

1. 它是唯一能同时覆盖“大样本逐帖抽取”“时间行为识别”“Quartz 风格知识树”“增量抽取/增量学习/增量积累”的路径
2. 它能把“单次蒸馏结果”升级成“持续积累的知识资产”
3. 它为后续评论/转发抽取、跨任务复盘、长期画像刷新保留了自然扩展位

## 总体架构

本次改造后，链路调整为四层：

1. `原始帖子层`
   - 来源于 `weibo_posts`、`weibo_post_snapshots`、`post_nlp_results`
   - 每次任务把参与分析的帖子固化为“任务处理时刻的原始快照”
2. `逐帖抽取层`
   - 每条帖子单独抽取主题、事件、观点、情绪、实体、风险信号、文本指纹、时间标签
   - 抽取结果版本化存储，可复用、可重算
3. `时间/行为聚合层`
   - 基于逐帖抽取结果聚合出事件窗、主题簇、观点簇、时间脉冲和协同传播疑似信号
4. `Persona/知识树层`
   - 生成 Persona 摘要、memory drafts、树状图谱、风险提示和可回溯 evidence

这四层对应 LLM Wiki 的组织原则：

- `raw source layer`：原始帖子层
- `wiki layer`：逐帖抽取层 + 聚合层
- `convention layer`：抽取 schema、聚合规则、知识树组织规则、疑似协同传播判定规则

## 数据模型设计

### 1. 新增 `user_profile_source_posts`

新增实体：`UserProfileSourcePostEntity`

用途：

- 为每条参与画像的原始帖子保留稳定引用
- 冻结“处理该帖时看到的原始信息”，避免原帖后续被删改导致抽取不可复现
- 为增量抽取提供去重主键与变更检测基准

建议字段：

```ts
id: uuid
weibo_user_id: string
post_id: string
source_kind: 'post'
post_created_at: string | null
content_fingerprint: string
normalized_text: string
source_snapshot: Record<string, unknown>
first_seen_at: string
last_seen_at: string
latest_task_id: string | null
created_at: string
updated_at: string
```

规则：

1. `source_snapshot` 至少包含当次用于抽取的原文、互动数、时间、主题结构、基础用户信息
2. `content_fingerprint` 用于判断帖子文本是否实质变化
3. 若同一 `post_id` 再次被任务命中，则只更新 `last_seen_at`、`latest_task_id` 和必要的快照字段

### 2. 新增 `user_profile_post_extractions`

新增实体：`UserProfilePostExtractionEntity`

用途：

- 存储逐帖 LLM 抽取结果
- 让抽取结果按版本复用
- 为后续聚合、证据追溯、增量学习提供稳定中间层

建议字段：

```ts
id: uuid
source_post_id: string
weibo_user_id: string
task_id: string | null
extractor_version: string
status: 'pending' | 'succeeded' | 'failed'
attempt_count: number
extracted_summary: string | null
extracted_json: Record<string, unknown> | null
error_message: string | null
last_extracted_at: string | null
created_at: string
updated_at: string
```

`extracted_json` 的第一版结构：

```ts
{
  topicLabels: string[]
  eventLabel: string | null
  eventKey: string | null
  viewpointLabels: string[]
  stance: string | null
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  emotionLabels: string[]
  entities: Array<{ type: string; value: string }>
  riskSignals: string[]
  coordinationMarkers: string[]
  temporalHints: {
    postCreatedAt: string | null
    inferredPhase: 'preheat' | 'burst' | 'aftermath' | 'unknown'
  }
  contentFingerprint: string
  excerpt: string
}
```

规则：

1. 唯一键使用 `(source_post_id, extractor_version)`
2. 同帖、同版本、同指纹命中时直接复用已有抽取结果
3. 只有以下情况才重抽：
   - 帖子是新增的
   - 指纹变化
   - `extractor_version` 升级
   - 旧记录状态为 `failed` 且允许重试

### 3. 扩展 `UserProfileDistillationTaskEntity`

新增字段建议：

```ts
progress_json: Record<string, unknown> | null
warnings_json: string[] | null
```

状态建议扩展为：

- `queued`
- `crawling`
- `extracting`
- `aggregating`
- `publishing`
- `review_pending`
- `published`
- `failed`

其中“部分成功”不单独作为状态，而是通过 `warnings_json` 和 `progress_json.partial = true` 表达。

### 4. 扩展 SDK 任务类型

`DistillationTaskSummary` 新增：

```ts
progress?: {
  stage: 'queued' | 'crawling' | 'extracting' | 'aggregating' | 'publishing'
  partial: boolean
  latestMessage: string
  lastProgressAt: string | null
  counters: {
    crawledPosts: number
    reusedExtractions: number
    extractedPosts: number
    failedPosts: number
    eventClusterCount: number
    coordinationSignalCount: number
    warningCount: number
  }
  coverage: {
    latestPostAt: string | null
    oldestPostAt: string | null
  }
  recentWarnings: string[]
}
```

前端实时展示依然先采用轮询，不强制切到 SSE；当前 3 秒轮询机制继续复用，只升级返回结构和 UI。

### 5. 扩展 Persona 图谱返回结构

保留现有 `memories` 与 `relations` 兼容字段，同时新增：

```ts
tree: MemoryTreeNode[]
timeline: Array<{
  bucketStart: string
  bucketEnd: string
  postCount: number
  sameContentCount: number
  eventCount: number
}>
coordinationSignals: Array<{
  id: string
  label: string
  level: 'low' | 'medium' | 'high'
  eventKey: string | null
  timeRange: { startAt: string | null; endAt: string | null }
  relatedPostCount: number
  description: string
}>
stats: {
  totalMemories: number
  totalEvents: number
  totalEvidencePosts: number
  totalWarnings: number
}
```

`MemoryTreeNode` 第一版支持：

```ts
type MemoryTreeNodeKind =
  | 'section'
  | 'event_cluster'
  | 'topic_cluster'
  | 'viewpoint_cluster'
  | 'behavior_signal'
  | 'memory'
  | 'post_evidence'
```

每个节点包含：

- `id`
- `kind`
- `label`
- `description`
- `count`
- `timeRange`
- `badge`
- `childrenCount`
- `children?: MemoryTreeNode[]`
- `memoryIds?: string[]`
- `postIds?: string[]`

## 蒸馏流水线设计

### 1. 抓取阶段：先持久化原帖，再进入抽取

`UserHistoryCollectionService` 产出进度后，任务层要做两件事：

1. 更新 `progress_json.counters.crawledPosts`
2. 把抓到的帖子登记到 `user_profile_source_posts`

原则：

- 先沉淀原始帖子资产，再做 LLM 抽取
- 即使后续抽取或聚合失败，这批原帖资产依然保留，供下一次任务复用

### 2. 抽取阶段：逐帖抽取，不再整体打包

新增 `UserProfilePostExtractionService`。

处理方式：

1. 从 `user_profile_source_posts` 中找出本次窗口内相关帖子
2. 判断哪些帖子需要新抽，哪些可以复用
3. 对需要处理的帖子逐条调用提取器
4. 每完成一条就立即落库并更新任务进度

输入来源：

- `source_snapshot`
- `post_nlp_results` 已有关键词、情绪、事件类型
- 必要时附带少量前后文，但单次抽取仍以单帖为核心单位

并发策略：

- 单条帖子单独 prompt
- 服务端可并发 3-5 条执行，但持久化以“每条完成即提交”为原则

### 3. 聚合阶段：从逐帖结果生成事件、主题、观点与行为模式

新增 `UserProfileAggregationService`。

它基于最新成功的逐帖抽取结果完成：

1. 事件窗聚合
2. 主题簇聚合
3. 观点簇聚合
4. 时间脉冲识别
5. 同质内容簇识别
6. 协同传播疑似信号生成
7. Persona 摘要与 memory drafts 生成

这一层才允许把多帖信息拼接起来交给聚合模型或规则系统。

### 4. 发布阶段：Persona 与知识树投影

`PersonaProjectionService` 不再只把 `memoryDrafts` 投影成 section hub + memory。

它还要：

1. 把事件簇、观点簇、行为信号转成树节点摘要
2. 把逐帖抽取结果映射为 evidence 节点和 `MemoryEvidenceEntity.metadata`
3. 在 Persona metadata 中记录本次使用的：
   - `extractorVersion`
   - `aggregationVersion`
   - 时间窗摘要
   - 事件统计
   - 协同传播信号统计

## 增量抽取与增量学习规则

### 1. 增量抽取

后续再次对同一用户发起蒸馏任务时：

1. 先抓取新窗口内帖子
2. 逐帖比对 `post_id + content_fingerprint + extractor_version`
3. 已存在且未变化的帖子直接复用旧抽取
4. 新帖、变更帖或版本失配的帖子重抽

这样可以把任务成本从“每次全量重做”降到“以新增与变化为主”。

### 2. 增量学习

这里的“学习”指系统知识资产的持续积累，不是在线训练模型。

具体表现为：

1. 每条帖子的抽取结果长期保留
2. Persona 的知识树与时间行为画像由这些长期累积的抽取结果重新聚合得到
3. 随着样本增加，事件簇、观点簇、协同传播信号会变得更稳定
4. 当抽取版本升级时，可以只重刷受影响的帖子和聚合结果，而不是清空全部历史

### 3. 增量积累

以下资产会持续保留并跨任务复用：

1. 原帖快照
2. 逐帖抽取结果
3. 聚合得到的事件键和话术簇标识
4. Persona metadata 中的长期统计摘要

## 时间维度与疑似协同传播识别

### 1. 时间窗聚合

同一事件聚合时，必须同时满足：

1. `eventKey` 相同或高度接近
2. 发帖时间落在可配置时间间隔内
3. 主题/观点相似度达到阈值

聚合后输出：

- `startAt`
- `endAt`
- `postCount`
- `sameContentRatio`
- `dominantViewpoints`
- `peakBucket`

### 2. 时间脉冲识别

按小时或更细粒度切桶。

当某个桶相对同用户基线出现明显抬升时，输出 `burst/spike` 信号。

信号要进入：

- Persona 摘要
- 行为 section
- 图谱的 `behavior_signal` 节点

### 3. 同质内容簇识别

基于以下特征综合聚类：

1. 归一化文本
2. `content_fingerprint`
3. 抽取后的 `topicLabels`
4. `viewpointLabels`
5. 关键实体重合度

输出的是“同质内容簇”，不是简单重复帖列表。

### 4. 疑似协同传播信号

只有在以下条件叠加时才生成疑似信号：

1. 同事件窗口
2. 短时间密集发帖
3. 高同质内容比例
4. 观点模板高度一致
5. 有现有关系图或 shared event 作为旁证时，风险等级上调

输出措辞统一使用：

- `疑似协同传播`
- `疑似批量同质发言`

禁止输出：

- “确定同一操作者”
- “确认水军控制”

## 知识树展示设计

### 1. 视觉原则

图谱主视图从“自由图”改为“知识树优先、关系跳线补充”。

第一屏默认只展示：

1. Persona 根节点
2. Section 节点
3. 事件簇 / 行为信号一级节点

只有在用户展开后，才继续展示主题簇、观点簇和证据帖子。

### 2. 节点层级

默认层级为：

1. `Persona`
2. `Section`
3. `Event Cluster` 或 `Behavior Signal`
4. `Topic Cluster`
5. `Viewpoint Cluster`
6. `Post Evidence`

### 3. 大数据量策略

为避免节点爆炸：

1. 默认折叠所有 `post_evidence`
2. 图谱预览只展示前两层摘要
3. 全量页面按分支展开，不一次性渲染全部叶子
4. 关系连线只在选中节点时增强显示，默认弱化
5. 用时间过滤器缩小视图范围：`7 天 / 30 天 / 90 天 / 全部`

### 4. 前端落点

涉及组件：

- `MemoryGraph.tsx`
- `memory-graph-layout.ts`
- `DistillationWorkspacePanel.tsx`
- `MemoryGraphPage.tsx`

设计要求：

1. 工作台预览显示紧凑知识树摘要和实时进度摘要
2. 全量页面显示完整知识树、时间桶概览和疑似协同传播信号
3. active task 期间显示明确 loading / progress / partial warning，不再出现“任务似乎瞬间成功但实际没做事”的体验

## 错误处理与重试

### 1. 抓取无进展

如果长时间没有新增帖子：

1. 对当前抓取游标自动重试
2. 超过次数后记入 warning
3. 结束抓取并继续进入抽取/聚合

只要存在可用历史帖子或可复用抽取结果，任务不应直接失败。

### 2. 单帖抽取失败

规则：

1. 每帖独立重试
2. 超过次数后将该帖标记为 `failed`
3. 任务总进度继续推进
4. 聚合阶段跳过失败帖，但在 warning 中记录数量和原因摘要

### 3. 聚合局部失败

如果某个事件簇或某个观点簇生成失败：

1. 保留其他簇
2. 对失败簇写 warning
3. 继续产出可用 Persona 结果

### 4. 全量失败条件

只有在以下条件之一出现时，任务才整体失败：

1. 本次窗口内没有任何可用帖子，且历史上也没有可复用的逐帖抽取结果
2. 聚合前全部帖子都抽取失败
3. Persona 发布落库失败，且无法保留可回放的中间结果

## 测试策略

### 1. 后端单元测试

新增或更新以下测试：

1. 同帖同版本命中时复用旧抽取
2. 指纹变化后触发重抽
3. 单帖失败不阻断整次任务
4. 抓取长时间无进展后进入 partial 并继续聚合
5. 时间脉冲识别与同质内容簇聚合
6. 疑似协同传播信号的阈值判定

### 2. 后端集成测试

覆盖：

1. 任务从 `queued -> crawling -> extracting -> aggregating -> published/review_pending`
2. `progress_json` 在轮询接口中逐步可见
3. 二次发起任务时复用既有抽取，新增计数正确
4. Persona 图谱接口返回知识树、时间桶和 signal 摘要

### 3. 前端测试

覆盖：

1. 工作台实时展示任务阶段与计数
2. partial warning 有明确提示
3. 图谱预览在 active task 时显示 loading 态
4. 全量图谱页面的折叠/展开和时间过滤

## 实施切片

为了降低风险，按两个实现切片推进：

### 切片 1：增量抽取与任务进度

范围：

1. 新增原帖快照持久层与逐帖抽取持久层
2. 升级任务状态、进度与 warning 返回
3. 改造蒸馏流水线为逐帖抽取 + 聚合
4. 工作台显示实时进度、warning 和 loading

完成标准：

- 能稳定看到帖子抓取、复用、抽取、失败计数
- 二次任务会复用既有抽取结果

### 切片 2：知识树展示与时间行为信号

范围：

1. 升级 Persona 图谱协议
2. 改造 `memory-graph` 为 Quartz 风格知识树浏览
3. 接入时间桶、事件簇和疑似协同传播信号展示

完成标准：

- 大数据量下图谱仍可浏览
- 用户能从图上直接看到事件时间范围、话术簇和疑似行为信号

## 成功标准

本次设计落地后，应满足以下可验证结果：

1. 新任务不会再把全部样本一次性塞进单次总结流程
2. 每条已处理帖子都能查到原始快照和抽取结果
3. 同一用户二次蒸馏时，未变化帖子能够被复用
4. 任务长时间无进展时不会直接卡死，而是以 partial warning 继续完成分析
5. 图谱在大数据量场景下仍然可读，并能按时间与事件展开
6. Persona 结果中能看到同质内容簇、时间脉冲和疑似协同传播信号
