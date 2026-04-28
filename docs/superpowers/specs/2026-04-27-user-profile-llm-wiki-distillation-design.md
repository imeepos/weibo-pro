# 用户画像蒸馏接入 LLM Wiki 组织法设计

- 日期：2026-04-27
- 状态：Approved for planning
- 范围：`apps/api`、`apps/bigscreen`

## 背景

当前“用户画像知识蒸馏 -> Persona -> 记忆图谱”的链路已经能跑通，但它本质上仍是一个“把 dossier 压缩成一份结构化 JSON”的流程：

- `UserInvestigationDossier` 作为输入事实包
- `UserProfileDistillationService` 生成 `DistilledUserProfile`
- `PersonaProjectionService` 把蒸馏结果投影成 `Persona + Memory + Relation + Evidence`
- `MemoryGraph` 以前端星状图方式展示

这条链路缺少一个明确的“知识整理层”。

用户当前要求是：

> 进行用户画像知识蒸馏记忆图谱生成时，应该参考 LLM Wiki 相关知识进行整理。

根据本机 wiki 中的 `LLM Wiki` 与 `LLM Wiki Methodology Overview`，这里最重要的不是“把 wiki 文本直接喂给模型”，而是引入一套整理原则：

1. `raw source layer` 保留原始证据
2. `wiki layer` 生成可维护、可复用、可连边的中间知识结构
3. `convention layer` 明确模型和系统如何总结、分组、链接、记录不确定性

本次设计的目标，就是让用户画像蒸馏和记忆图谱生成显式采用这套三层组织法。

## 目标

本次改造完成后，系统需要满足：

1. 蒸馏阶段把 `UserInvestigationDossier` 明确视为 `raw source layer`
2. 蒸馏输出不再只是扁平画像结论，而是按 LLM Wiki 方式整理为“可维护的知识条目集合”
3. Persona / Memory Graph 不再只体现“有几条 memory”，而要体现“这些 memory 属于哪类知识分区、如何相互关联”
4. 每条结论都要保持 `evidence-first`，不能脱离原始证据凭空生成
5. 某一条知识提炼失败，不应阻断整个画像；允许部分成功、部分降级

## 非目标

本次不做以下内容：

1. 不接入外部 wiki 仓库或全文检索系统
2. 不把本机知识库页面原文动态注入每次蒸馏请求
3. 不新增数据库 migration 来扩展 `memories` 表结构
4. 不重做前端整张图的可视化引擎
5. 不改变既有 dossier 抓取与爬取链路

## 当前系统边界

### 1. 输入边界

`UserProfileDistillationService` 当前把以下信息直接打包给模型：

- `accountSnapshot`
- `eventRiskContext`
- `historyCoverage`
- `behaviorTimeline`
- `topicAndSentimentProfile`
- `relationSummary`
- `evidenceSamples`
- `preDistillationSummary`

这已经具备 `raw source layer` 的条件，因此不需要另造一套源数据结构。

### 2. 输出边界

当前 `DistilledUserProfile` 主要由以下部分组成：

- `summary`
- `identity`
- `behavior`
- `content`
- `risk`
- `relations`
- `memoryDrafts`
- `metadata`

其中 `memoryDrafts` 已经最接近 wiki layer，但缺少：

- 分区归属
- 整理规则
- 条目之间的层级组织
- 冲突或不确定性标记

### 3. 图谱边界

前端 `MemoryGraph` 会默认把 persona 直接连接到每一条 memory，因此即使后端整理出更好的结构，图上仍会呈现为扁平星状。

这意味着如果只改 prompt，不改投影和展示规则，LLM Wiki 的组织效果会被前端抹平。

## 设计原则

### 1. 三层映射原则

在本项目内，LLM Wiki 三层应映射为：

- `raw source layer`
  - `UserInvestigationDossier`
  - 原始帖子、评论、转发、关系、NLP 样本
- `wiki layer`
  - 结构化画像中的“知识条目”和“知识分区”
  - Persona 下的 Memory 节点与它们之间的关系
- `convention layer`
  - prompt 中对模型的整理规则
  - 后端对 memory 命名、归类、连边、降级的规则

### 2. Evidence-first 原则

所有 memory 都必须能追溯到 `evidenceRefs`。

不允许生成：

- 没有证据支持的抽象标签
- 纯修辞性总结
- 只对风险下结论、却没有事实落点的节点

### 3. 组织优先原则

本次蒸馏输出应优先形成“可维护的知识结构”，而不是追求一段更华丽的长摘要。

换句话说：

- `summary` 是入口
- `memoryDrafts` 才是核心资产

### 4. 部分成功原则

某些 memory、relation 或 wiki section 失败时：

- 保留可用部分
- 记录降级信息
- 不让整次任务失败

## 方案选择

### 方案 A：只修改 prompt

做法：

- 在蒸馏 system prompt 中加入 LLM Wiki 方法论
- 约束模型把 dossier 当作 raw source，把 `memoryDrafts` 当作知识条目

优点：

- 改动最小
- 风险最低

缺点：

- 后端和前端仍按旧模型消费数据
- 图谱最终形态变化有限

### 方案 B：修改 prompt + 后端投影

做法：

- prompt 按 LLM Wiki 组织输出
- 后端按固定知识分区生成 hub memory，并重写 relation

优点：

- 数据层真正体现 wiki 结构
- 不需要大改前端协议

缺点：

- 前端仍有默认 persona 到所有 memory 的星状连线噪音

### 方案 C：修改 prompt + 后端投影 + 前端呈现

这是本次采用方案。

做法：

1. prompt 明确采用 LLM Wiki 三层组织法
2. schema 扩展 memory draft 的组织语义
3. projection 把 memory 重组为“分区 hub + 叶子知识项”
4. 前端识别 hub 后改用分区化图谱展示

优点：

- 组织法贯穿生成、落库、展示
- 图谱层能直接体现 wiki 结构
- 后续更容易演进到更复杂的知识维护逻辑

缺点：

- 改动面更大
- 需要补更多测试

## 1. 蒸馏输出升级为 LLM Wiki 风格

`promptVersion` 从 `v1` 升为 `v2`。

新的 prompt 规则需要显式说明：

1. 输入 dossier 是 `raw source layer`
2. 输出要形成 `wiki layer`
3. 每个 memory 都必须：
   - 来自可定位证据
   - 尽量去重
   - 归入一个明确分区
   - 与其他 memory 建立可解释的 relation
4. 若证据不足，应降级为低置信度条目，而不是编造
5. 若不同证据相互冲突，应在条目描述中注明“待复核”或“不稳定”

## 2. Memory 分区模型

第一版不改数据库表结构，而是在蒸馏输出和投影规则中引入固定 section。

固定 section 为：

1. `identity`
2. `behavior`
3. `content`
4. `risk`
5. `relations`

这些 section 不直接作为数据库新字段，而通过“约定的 hub memory”表达。

建议的 hub 形式：

- `身份画像`
- `行为模式`
- `内容倾向`
- `风险研判`
- `关系线索`

每个 hub 节点本质上仍是 `MemoryEntity`，类型统一使用 `concept`。

## 3. Schema 扩展

`memoryDrafts` 需要扩展组织语义，但仍保持兼容旧数据。

新增字段建议：

```ts
section: 'identity' | 'behavior' | 'content' | 'risk' | 'relations'
isSectionHub?: boolean
stability?: 'stable' | 'tentative' | 'conflicted'
```

语义如下：

- `section`
  - 指定该 memory 属于哪个 wiki 分区
- `isSectionHub`
  - 标记该条目是否是分区总节点
- `stability`
  - 标记条目稳定性，体现“待复核/证据冲突/暂定”

兼容规则：

- 老数据没有这些字段时，projection 根据 `type` 和内容推断 section
- 新模型生成时优先输出完整字段

## 4. Projection 重组规则

`PersonaProjectionService` 不再简单把 `memoryDrafts` 原样落库，而是按以下步骤处理：

1. 创建或复用 5 个固定 hub memory
2. 将普通 memory 归类到对应 hub 下
3. 自动补 `contains` 关系：`hub -> leaf`
4. 保留模型给出的横向关系：
   - `related`
   - `causes`
   - `follows`
5. 如果 relation 指向 persona，仍沿用当前“合成人物 memory”逻辑

这样得到的图谱不再是：

- `persona -> 所有 memory`

而是：

- `persona -> 各分区 hub`
- `hub -> 分区内知识条目`
- `条目 <-> 条目` 的真实关系

## 5. Persona 元数据扩展

Persona 元数据中新增组织方法标记：

```ts
metadata: {
  organizationMethod: 'llm_wiki_v1'
  sectionOrder: ['identity', 'behavior', 'content', 'risk', 'relations']
  ...
}
```

目的不是给前端直接展示，而是给后续投影、重建、调试和版本兼容提供依据。

## 6. 前端图谱展示规则

`MemoryGraph` 需要做一条关键调整：

- 如果发现存在 section hub，则只连接：
  - `persona -> hub`
  - `hub -> leaf`
  - 叶子之间的真实 relation
- 不再无条件添加 `persona -> 每条 memory`

兼容规则：

- 旧 Persona 没有 hub 时，保留当前星状图逻辑
- 新 Persona 有 hub 时，进入分区布局逻辑

第一版不要求重做 React Flow 引擎，只需要：

1. 识别 hub 节点
2. 调整默认布局半径与分组位置
3. 区分 hub 与 leaf 的视觉样式

## 7. 失败与降级策略

本次改造需要保持“能抓多少是多少”的总体方向，因此蒸馏与投影必须允许部分成功：

### 蒸馏阶段

- 某个 memory 条目解析失败：
  - 丢弃该条
  - 保留其他条目
- 某个 section 为空：
  - 允许缺省
  - 不阻断整份画像

### 投影阶段

- 某个 relation 找不到 target：
  - 跳过该 relation
  - 不阻断整个 persona 发布
- 某个 section 没有叶子节点：
  - 不强制创建空 hub

### 展示阶段

- 识别不到 hub：
  - 回退到旧图逻辑

## 8. 实现边界与约束

### 不做 migration

当前 `MemoryEntity` 没有 `metadata` 字段。

为避免把这次工作扩大成数据库演进，本次不新增 `memories.metadata`，而使用：

- 扩展的蒸馏 schema
- 固定 hub naming
- Persona metadata

来承载组织规则。

### 保持接口兼容

已有接口：

- 用户发起蒸馏任务
- 查询 persona
- 查询 memory graph

都应保持 URL 和主响应结构不变，只在返回内容中增加更细的组织语义。

## 9. 测试策略

至少补以下测试：

### 1. `UserProfileDistillationService` 测试

验证：

- `v2` prompt 明确包含 LLM Wiki 整理规则
- 新格式 memoryDraft 可通过 schema
- 缺少 section 时仍能兼容旧格式
- 冲突或不稳定条目可被规范化

### 2. `PersonaProjectionService` 测试

验证：

- 自动生成 section hub
- 普通 memory 正确挂到 hub 下
- 自动生成 `contains` 关系
- 无 hub 的旧数据仍能正常发布

### 3. `PersonaService / MemoryGraph` 相关测试

验证：

- 新 persona graph 返回 hub + leaf 结构
- 前端对有 hub / 无 hub 两种数据都能正确渲染

## 10. 验收标准

完成后应能满足：

1. 新蒸馏任务生成的画像带有明确的 LLM Wiki 组织语义
2. 新生成的 memory graph 体现“分区 hub + 叶子知识项”，而不是纯星状图
3. 每个知识条目都保留 evidence 追溯
4. 旧 persona 数据仍可继续展示
5. 单条知识提炼失败不会让整次画像任务失败

## 11. 预期交付

本次交付不是“让模型回答得更像知识库”，而是把用户画像蒸馏链路正式升级为：

- `dossier` 作为证据输入层
- `DistilledUserProfile` 作为知识整理层
- `Persona / Memory Graph` 作为可维护知识资产层

这样后续无论继续做风险复核、跨用户对比、关系网络扩展，还是做长期知识维护，都将建立在统一的 LLM Wiki 组织法之上，而不是继续堆叠扁平摘要。
