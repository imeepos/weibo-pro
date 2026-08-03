# @sker/agent

自主研究与舆情分析 Agent，基于 LangChain/LangGraph 实现，并提供"千门八将"多智能体编程系统。

## 核心职责

- `ResearchAgent`：基于 LangChain 的自主研究智能体，自动规划并执行舆情研究任务
- `OpinionAgent`：舆情分析智能体，结合 NLP 分析做情感趋势计算与风险评估（high/medium/low）
- 工具集：帖子查询、事件查询与时间线、事件关键节点识别、NLP 批量分析、影响力分析、关键言论、用户行为异常检测、批量异常账号检测
- 智能缓存策略：优先复用 `PostNLPResultEntity` / `EventStatisticsEntity` 已有分析，降低 LLM 调用
- "千门八将"（`eight-generals`）：八角色多智能体编程系统（编码、架构、部署、审查、测试、修复、调研、调度），含 `WorkflowDSLGeneratorAgent`
- 核心约束：**仅使用数据库已有数据，严禁实时采集**

## 目录结构

```
packages/agent/
├── src/
│   ├── index.ts                       # 导出入口
│   ├── types.ts                       # ResearchTask / ResearchPlan / OpinionTask 等类型
│   ├── ResearchAgent.ts               # 自主研究 Agent（LangChain 规划 + 工具调用）
│   ├── OpinionAgent.ts                # 舆情分析 Agent（NLP → 趋势 → 风险）
│   ├── tools/                         # 舆情工具集
│   │   ├── index.ts                   # 工具导出
│   │   ├── post-query.tool.ts         # 微博帖子查询（含按事件/排序）
│   │   ├── event-query.tool.ts        # 舆情事件查询
│   │   ├── event-analysis.tool.ts     # 事件时间线与关键节点分析
│   │   ├── nlp-analysis.tool.ts       # NLP 批量分析（带缓存）
│   │   ├── influencer-analysis.tool.ts# 影响力人物分析
│   │   ├── key-opinion.tool.ts        # 关键言论提取
│   │   ├── user-profile.tool.ts       # 用户行为分析与异常检测
│   │   └── batch-detection.tool.ts    # 批量异常账号检测
│   ├── eight-generals/                # 千门八将多智能体编程系统
│   │   ├── index.ts                   # 八将导出与 createEightGenerals()
│   │   ├── Orchestrator.ts            # 提将：任务拆解/分配/协调
│   │   ├── Architect.ts               # 反将：架构设计
│   │   ├── CodeAgent.ts               # 正将：编码实现
│   │   ├── DeployAgent.ts             # 脱将：部署发布
│   │   ├── ScoutAgent.ts              # 风将：代码审查
│   │   ├── GuardAgent.ts              # 火将：测试防护
│   │   ├── FixerAgent.ts              # 除将：问题修复
│   │   ├── TechResearchAgent.ts       # 谣将：技术调研
│   │   ├── WorkflowDSLGeneratorAgent.ts # 生成 Workflow DSL
│   │   ├── BaseGeneral.ts             # 智能体基类
│   │   ├── types.ts                   # 角色/任务/上下文类型
│   │   └── tools/                     # code/git/terminal/test/workflow-dsl 工具
│   └── readme.md                      # LangChain 使用示例
├── package.json
├── tsconfig.json
└── tsup.config.ts                     # 构建配置
```

## 边界

- **✅ 负责**：基于 LLM 的研究规划、舆情分析、风险评估；LangChain 工具定义与执行；千门八将多智能体编排与 Workflow DSL 生成
- **❌ 不负责**：实时爬虫采集（严禁）；LLM 调用底层客户端（复用 `@sker/nlp` 的 OpenAI 客户端）；数据库 ORM 实体定义（依赖 `@sker/entities`）；工作流的运行时执行（依赖 `@sker/workflow-run`）
- **对外依赖**：`@sker/core`、`@sker/entities`、`@sker/nlp`、`@sker/workflow`、`@sker/workflow-compiler`、`@sker/workflow-run`；外部：`@langchain/core`、`@langchain/langgraph`、`@langchain/openai`、`langchain`、`typeorm`、`zod`、`glob`
- **被谁依赖**：`apps/api`（`workflow-dsl.service.ts` 使用 `WorkflowDSLGeneratorAgent`）

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

### 千门八将

```typescript
import { createEightGenerals } from '@sker/agent';
const generals = createEightGenerals();
const result = await generals.run('实现用户登录功能', '/path/to/project');
```

## 架构

### ResearchAgent 工作流

```
用户任务 → LangChain Agent (自动规划) → 工具调用 → 生成报告
```

**基础工具：**
- `query_posts` - 查询微博帖子，自动关联 NLP 分析结果，支持按互动量排序
- `query_events` - 查询舆情事件，自动关联统计信息
- `nlp_analyze` - 批量 NLP 分析，智能缓存避免重复分析

**事件深度分析工具：**
- `query_posts_by_event` - 按事件 ID 查询所有相关帖子
- `query_event_timeline` - 查询事件时间线数据（热度/情感/互动随时间变化）
- `analyze_event_milestones` - 自动识别关键节点（热度突增、情感转折、病毒传播、峰值点）

### OpinionAgent 工作流

```
舆情数据 → NLP 分析 → 趋势计算 → 风险评估 → 舆情报告
```
