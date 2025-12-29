# Workflow AST 节点优化 - 元节点设计

## 优化概述

根据 `docs/workflow-ast-optimizer-prompt.md` 的指导原则，我们实现了**元节点（Meta Nodes）**架构，通过最小化的节点集合实现无限可能的业务场景。

### 核心哲学

> **"不要创建 100 个具体节点，而是创建 10 个元节点，让它们组合出 1000 种可能"**

### 优化成果

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 节点总数 | 60+ | ~20 | -67% |
| 微博 API 节点 | 9 | 1 (HttpRequestAst) | -89% |
| LLM 节点 | 10 | 2 (LlmInferenceAst + MediaGenerateAst) | -80% |
| 循环节点 | 2 | 1 (LoopAst) | -50% |
| 新增 API 成本 | 创建新节点 | 添加配置模板 | 0 代码 |

## 元节点列表

### 1. HttpRequestAst - HTTP 请求元节点

**替代节点**：9 个微博 API 节点
- WeiboKeywordSearchAst
- WeiboAjaxStatusesShowAst
- WeiboAjaxStatusesCommentAst
- WeiboAjaxProfileInfoAst
- WeiboAjaxFriendshipsAst
- WeiboAjaxStatusesRepostTimelineAst
- WeiboAjaxStatusesMymblogAst
- WeiboAjaxStatusesLikeShowAst
- WeiboAjaxFeedHotTimelineAst

**核心能力**：
- 支持 GET/POST/PUT/DELETE/PATCH 方法
- URL 模板支持变量替换（如 `{{keyword}}`）
- 配置请求头、查询参数、请求体
- 自动重试机制（3次，指数退避）

**使用示例**：
```typescript
// 微博关键词搜索
HttpRequestAst {
  method: 'GET',
  urlTemplate: 'https://weibo.com/ajax/side/search',
  queryParams: { q: '{{keyword}}', page: '{{page}}' },
  headers: { Cookie: '{{cookie}}' }
}
```

### 2. LlmInferenceAst - LLM 推理元节点

**替代节点**：
- LlmTextAgentAst
- LlmStructuredOutputAst
- LlmCategoryAst
- LlmImageToTextAst
- LlmVideoToTextAst

**核心能力**：
- 支持系统提示词和用户提示词（多输入聚合）
- 可配置模型和温度参数
- 输出文本结果
- 自动重试机制（3次）

**使用示例**：
```typescript
// 文本对话
LlmInferenceAst {
  system: ['你是一个有帮助的AI助手'],
  prompt: ['{{userMessage}}'],
  model: 'deepseek-ai/DeepSeek-V3.2',
  temperature: 0.7
}
```

### 3. MediaGenerateAst - 媒体生成元节点

**替代节点**：
- LlmTextToImageAst
- LlmTextToVideoAst
- LlmTextToAudioAst
- LlmTextImageToVideoAst
- LlmTextImage2ToVideoAst

**核心能力**：
- 支持图片/视频/音频生成
- 接受文本提示词和参考图片
- 输出媒体 URL
- 自动重试机制

### 4. LoopAst - 通用循环元节点

**替代节点**：
- GroupChatLoopAst
- StoryQualityLoopAst

**核心能力**：
- 支持数组迭代和条件循环
- 输出当前项、索引和完成状态
- 最大迭代次数保护
- 使用路由输出控制循环结束

### 5. TransformAst - 数据转换元节点

**核心能力**：
- 基于表达式的数据转换
- 输入任意数据，输出转换结果

### 6. AggregateAst - 数据聚合元节点

**替代节点**：
- PostContextCollectorAst（部分功能）

**核心能力**：
- 支持 7 种聚合操作：sum/avg/min/max/count/concat/merge
- 多输入多次发射全聚合（IS_MULTI | IS_BUFFER）

### 7. RouteAst - 条件路由元节点

**核心能力**：
- 基于规则的条件分支
- 支持动态添加输出端口
- 默认输出作为兜底路由

## 配置模板库

位置：`packages/workflow-ast/src/templates/`

### 可用模板

1. **weibo-keyword-search.json** - 微博关键词搜索
2. **weibo-post-detail.json** - 微博博文详情
3. **llm-text-chat.json** - LLM 文本对话
4. **llm-structured-output.json** - LLM 结构化输出

### 使用方式

```typescript
import template from '@sker/workflow-ast/templates/weibo-keyword-search.json';

// 在工作流中使用模板配置
const node = new HttpRequestAst();
Object.assign(node, template.config);
```

## 迁移指南

### 旧节点迁移

所有被替代的节点已标记为 `@deprecated`，并在 JSDoc 中提供迁移示例。

**示例：WeiboKeywordSearchAst → HttpRequestAst**

```typescript
// 旧节点
WeiboKeywordSearchAst {
  keyword: '热搜',
  startDate: new Date()
}

// 新节点
HttpRequestAst {
  method: 'GET',
  urlTemplate: 'https://weibo.com/ajax/side/search',
  queryParams: {
    q: '{{keyword}}',
    page: '{{page}}'
  },
  headers: {
    Cookie: '{{cookie}}'
  }
}
```

### 组合模式示例

#### 模式 1: HTTP 请求 + 数据转换
```
[HttpRequestAst] → [TransformAst] → 下游节点
```

#### 模式 2: 批量数据采集
```
[LoopAst] → [HttpRequestAst] → [AggregateAst] → 输出
```

#### 模式 3: LLM 推理 + 质量检查循环
```
[LlmInferenceAst] → [RouteAst]
                      ├─ quality >= 0.8 → 输出
                      └─ quality < 0.8 → [LoopAst] → [LlmInferenceAst]
```

## 设计原则

1. **正交性（Orthogonality）**：每个元节点只做一件事，且职责不重叠
2. **可组合性（Composability）**：元节点之间可以任意组合，产生新能力
3. **最小完备性（Minimal Completeness）**：用最少的元节点覆盖最多的场景
4. **零冗余（Zero Redundancy）**：如果两个节点有 50% 相似代码，它们应该被拆解为元节点

## 向后兼容

- 所有旧节点保留，标记为 `@deprecated`
- `index.ts` 保持所有导出，现有代码无需修改
- 提供 6 个月过渡期
- 未来版本将逐步移除旧节点

## 参考资源

- **优化指南**：`docs/workflow-ast-optimizer-prompt.md`
- **元节点源码**：`packages/workflow-ast/src/meta/`
- **配置模板**：`packages/workflow-ast/src/templates/`
