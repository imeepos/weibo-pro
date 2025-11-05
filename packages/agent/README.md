# @sker/agent

自主研究与舆情分析 Agent

## 概述

提供两类智能体：

- **ResearchAgent** - 基于 LangChain 的自主研究智能体，AI 自动规划并执行舆情研究任务
- **OpinionAgent** - 舆情分析智能体，评估舆情风险和趋势

## 安装

```bash
pnpm add @sker/agent
```

## 快速开始

### ResearchAgent

```typescript
import { ResearchAgent } from '@sker/agent';
import { NLPAnalyzer } from '@sker/nlp';

const agent = new ResearchAgent(new NLPAnalyzer());

const report = await agent.research({
  id: 'task-001',
  query: '分析最近一周关于"人工智能"的舆情趋势',
  timeRange: '7d',
  sampleSize: 100,
});

console.log(report.report);
```

### OpinionAgent

```typescript
import { OpinionAgent } from '@sker/agent';
import { NLPAnalyzer } from '@sker/nlp';

const agent = new OpinionAgent(new NLPAnalyzer());

const report = await agent.analyze({
  id: 'opinion-001',
  context: {
    postId: 'weibo-12345',
    content: '某品牌产品质量太差...',
    comments: ['我也遇到了', '已投诉'],
    subComments: [],
    reposts: [],
  },
  history: [],
});

console.log(report.risk.level); // 'high' | 'medium' | 'low'
```

## 架构

### ResearchAgent 工作流

```
用户任务 → LangChain Agent (自动规划) → 工具调用 → 生成报告
```

**基础工具：**
- `query_posts` - 查询微博帖子，**自动关联 NLP 分析结果**，支持按互动量排序
- `query_events` - 查询舆情事件，**自动关联统计信息**
- `nlp_analyze` - 批量 NLP 分析，**智能缓存，避免重复分析**

**事件深度分析工具（新增）：**
- `query_posts_by_event` - **按事件 ID 查询所有相关帖子**，支持时间序或互动量排序
- `query_event_timeline` - **查询事件时间线数据**，获取热度/情感/互动随时间变化
- `analyze_event_milestones` - **自动识别关键节点**，包括热度突增、情感转折、病毒传播、峰值点

### 性能优化

**智能缓存策略：**
- 帖子查询自动关联 `PostNLPResultEntity`，优先使用已有分析
- 事件查询自动关联 `EventStatisticsEntity`，包含完整聚合数据
- NLP 分析工具识别已缓存结果，仅分析新帖子
- 大幅降低 API 调用，提升响应速度

### OpinionAgent 工作流

```
舆情数据 → NLP 分析 → 趋势计算 → 风险评估 → 舆情报告
```

## 核心能力

### 标准舆情分析
- 关键词搜索与情感分析
- 热点话题识别
- 风险评估

### 事件来龙去脉分析 ✨ **新增**
- 查询事件完整时间线
- 自动识别关键节点（热度突增、情感转折、病毒传播）
- 按时间顺序展示事件演化
- 提取每个节点的代表性内容
- 生成完整的事件发展叙述

## 核心约束

**仅使用数据库已有数据，严禁任何实时采集行为**

## 示例

查看 `examples/` 目录：
- `research-example.ts` - ResearchAgent 完整示例
- `opinion-example.ts` - OpinionAgent 完整示例

## 依赖

- `@sker/core` - 依赖注入框架
- `@sker/nlp` - NLP 分析工具
- `@sker/entities` - 数据模型
- `@langchain/langgraph` - LangChain Agent 框架
