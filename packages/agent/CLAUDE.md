# @sker/agent - 舆情分析智能体

基于 LangChain + LangGraph 的自主研究与舆情分析 Agent 包。

## 目录结构

```
packages/agent/
├── src/
│   ├── types.ts                           # 类型定义（任务、报告、步骤）
│   ├── ResearchAgent.ts                   # 自主研究 Agent
│   ├── OpinionAgent.ts                    # 舆情分析 Agent
│   ├── tools/                             # 工具库
│   │   ├── index.ts                       # 工具导出
│   │   ├── post-query.tool.ts             # 微博帖子查询
│   │   ├── event-query.tool.ts            # 舆情事件查询
│   │   ├── event-analysis.tool.ts         # 事件时间线与关键节点分析
│   │   ├── nlp-analysis.tool.ts           # NLP 分析（情感+关键词）
│   │   ├── influencer-analysis.tool.ts    # 影响力人物分析
│   │   ├── key-opinion.tool.ts            # 关键言论提取
│   │   ├── user-profile.tool.ts           # 用户行为分析与异常检测
│   │   └── batch-detection.tool.ts        # 批量异常账号检测
│   └── readme.md                          # LangChain 使用示例
├── package.json
└── tsconfig.json
```

## 核心 Agent 类

### 1. ResearchAgent - 自主研究型智能体

**职责**：根据用户查询自动生成舆情研究报告。

**核心特性**：
- 基于 LangChain `createAgent()` + DeepSeek 模型
- 自动规划研究步骤、调用工具、生成报告
- 支持事件来龙去脉分析（时间线 + 关键节点 + 代表性内容）
- 内存管理：`InMemoryStore` + `MemorySaver`（支持多轮对话）

**核心约束**：
- **仅使用数据库已有数据，严禁实时采集**
- 所有结论必须基于实际数据，不可臆断

**系统提示词包含**：
- 可用工具说明（9 类工具）
- 标准舆情分析流程
- 事件来龙去脉分析流程（重点）
- 报告格式要求

**使用示例**：
```typescript
import { ResearchAgent } from '@sker/agent';
import { root } from '@sker/core';

const agent = root.get(ResearchAgent);

const report = await agent.research({
  id: 'task-001',
  query: '分析"华为Mate60发布"事件的来龙去脉',
  timeRange: '最近7天',
  sampleSize: 200,
});

console.log(report.report); // Markdown 格式研究报告
```

**报告类型**：

1. **标准舆情报告**：
   - 数据概览（样本量、时间范围）
   - 情感分析（分布 + 趋势）
   - 热点话题（高频关键词）
   - 风险评估（负面舆情）
   - 行动建议

2. **事件来龙去脉报告**（深度分析）：
   - 事件概述（标题、类别、起止时间）
   - 时间线图表（热度/情感/互动量变化）
   - 关键节点分析（突增点、转折点、峰值点）
   - 演化过程叙述（时间顺序讲故事）
   - 影响力评估（传播范围、用户参与）

### 2. OpinionAgent - 舆情分析智能体

**职责**：单帖舆情实时分析（轻量级 NLP 分析）。

**核心功能**：
- NLP 情感分析（正/负/中性）
- 情感趋势计算（基于历史数据）
- 风险评估（三级：low/medium/high）
- 敏感关键词检测

**风险评估逻辑**：
```typescript
// 风险评分规则（满分 100）
if (负面情感 > 60%) → +40 分
if (情感持续下滑 && 幅度 > 20%) → +30 分
if (包含敏感关键词) → +30 分

// 风险等级
score > 70 → high
score > 40 → medium
其他 → low
```

**使用示例**：
```typescript
import { OpinionAgent } from '@sker/agent';
import { root } from '@sker/core';

const agent = root.get(OpinionAgent);

const report = await agent.analyze({
  id: 'op-001',
  context: {
    postId: '123456',
    content: '产品质量太差了...',
    comments: [...],
    subComments: [...],
    reposts: [...],
  },
  history: [
    { sentiment: { positive_prob: 0.8 }, timestamp: 1234567890 },
    // 历史情感数据
  ],
});

console.log(report.risk.level); // 'high' | 'medium' | 'low'
console.log(report.trend.direction); // 'rising' | 'falling' | 'stable'
```

## 工具库（Tools）

### 基础查询工具

#### 1. `query_posts` - 查询微博帖子
**文件**：`post-query.tool.ts`

**功能**：
- 查询数据库中已采集的微博帖子
- 自动关联 NLP 分析结果（情感、关键词）
- 支持关键词、时间范围过滤
- 支持按时间/互动量排序

**参数**：
```typescript
{
  keyword?: string,       // 搜索关键词
  startDate?: string,     // ISO 8601 格式
  endDate?: string,
  orderBy?: 'time_desc' | 'time_asc' | 'interactions',
  limit?: number          // 默认 100
}
```

**返回**：
```json
[
  {
    "id": "post-123",
    "text": "微博内容...",
    "createdAt": "2024-01-01T00:00:00Z",
    "userId": "user-456",
    "userName": "用户昵称",
    "interactions": {
      "reposts": 100,
      "comments": 50,
      "likes": 200,
      "total": 350
    },
    "nlp": {
      "sentiment": { "overall": "positive", ... },
      "keywords": [...],
      "eventType": "社会"
    }
  }
]
```

#### 2. `query_events` - 查询舆情事件
**文件**：`event-query.tool.ts`

**功能**：
- 查询数据库中已记录的舆情事件
- 自动关联统计信息（帖子数、用户数、互动数、情感分布、热度）
- 支持关键词、分类、时间过滤

**参数**：
```typescript
{
  keyword?: string,
  category?: string,      // 政治、经济、社会、科技
  startDate?: string,
  limit?: number
}
```

**返回**：事件列表 + 完整统计数据（热度、趋势、情感分布）

### 事件深度分析工具（核心）

#### 3. `query_posts_by_event` - 查询事件相关帖子
**文件**：`post-query.tool.ts`

**核心价值**：通过 `event_id` 直接获取事件所有帖子，是分析事件演化的关键。

**参数**：
```typescript
{
  eventId: string,        // 必填
  orderBy?: 'time' | 'interactions' | 'latest',
  limit?: number
}
```

**典型用法**：
- `orderBy: 'time'` → 按时间升序，看事件发展过程
- `orderBy: 'interactions'` → 按互动量，找热门内容

#### 4. `query_event_timeline` - 查询事件时间线
**文件**：`event-analysis.tool.ts`

**核心价值**：获取事件随时间变化的完整数据（热度/情感/互动量趋势）。

**参数**：
```typescript
{
  eventId: string,
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly'  // 默认 daily
}
```

**返回**：
```json
{
  "eventId": "evt-123",
  "granularity": "daily",
  "dataPoints": 7,
  "timeline": [
    {
      "time": "2024-01-01",
      "hotness": 85.5,
      "sentiment": { "positive": 0.6, "negative": 0.2, "neutral": 0.2 },
      "postCount": 1200,
      "userCount": 800,
      "interactions": { "comments": 500, "reposts": 300, "likes": 1000 }
    }
  ]
}
```

#### 5. `analyze_event_milestones` - 识别事件关键节点
**文件**：`event-analysis.tool.ts`

**核心价值**：智能识别事件发展的关键转折点。

**识别类型**：
- **热度突增点**（hotness_surge）：热度暴增 > 50%
- **情感转折点**（sentiment_reversal）：正负情感反转
- **病毒传播点**（viral_spread）：转发量激增 > 100%
- **峰值点**（peak）：事件最高热度时刻

**参数**：
```typescript
{
  eventId: string,
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly'
}
```

**返回**：
```json
{
  "eventId": "evt-123",
  "totalMilestones": 5,
  "milestones": [
    {
      "type": "hotness_surge",
      "time": "2024-01-02T10:00:00Z",
      "description": "热度暴增 85.3%",
      "metrics": { "prevHotness": 50, "currHotness": 92.6, "growth": 0.853 }
    },
    {
      "type": "sentiment_reversal",
      "time": "2024-01-03T14:00:00Z",
      "description": "情感反转：正面转负面"
    }
  ]
}
```

#### 6. `nlp_analyze` - NLP 批量分析
**文件**：`nlp-analysis.tool.ts`

**核心特性**：
- **智能缓存**：优先使用数据库已有 NLP 结果
- 仅对未分析帖子进行实时分析
- 批量处理（最多 100 条）

**参数**：
```typescript
{
  posts: string  // query_posts 返回的 JSON 字符串
}
```

**返回**：
```json
{
  "total": 100,
  "analyzed": 20,       // 新分析
  "fromCache": 80,      // 缓存命中
  "sentimentDistribution": {
    "positive": "60.0%",
    "negative": "20.0%",
    "neutral": "20.0%"
  },
  "topKeywords": [
    { "keyword": "质量", "weight": 150 }
  ],
  "details": [...]      // 前 5 条详细结果
}
```

### 影响力分析工具

#### 7. `analyze_event_influencers` - 分析影响力人物（KOL）
**文件**：`influencer-analysis.tool.ts`

**核心价值**：识别事件中最有影响力的用户。

**评分算法**：
```typescript
影响力分数 = 平均互动量 * 0.6 + 粉丝数 * 0.0001 + 发帖数 * 10
```

**参数**：
```typescript
{
  eventId: string,
  limit?: number,         // 返回 Top N，默认 20
  minPosts?: number       // 最少发帖数，默认 2
}
```

**返回**：
```json
{
  "totalUsers": 1500,
  "influencerCount": 20,
  "influencers": [
    {
      "userId": "user-123",
      "userName": "科技博主",
      "verified": true,
      "verifiedType": 1,
      "followersCount": 500000,
      "influence": {
        "postCount": 15,
        "totalInteractions": 50000,
        "avgInteractions": 3333
      },
      "topPosts": [...]   // Top 3 热门帖子
    }
  ]
}
```

#### 8. `query_user_posts_in_event` - 查询用户在事件中的言论
**文件**：`influencer-analysis.tool.ts`

**典型用法**：配合 `analyze_event_influencers` 使用。

**参数**：
```typescript
{
  eventId: string,
  userId: string,
  orderBy?: 'time' | 'interactions' | 'latest'
}
```

### 关键言论工具

#### 9. `extract_key_opinions` - 提取关键时间点言论
**文件**：`key-opinion.tool.ts`

**核心价值**：自动识别关键转折点，并提取每个时间点最具代表性的言论。

**工作流程**：
1. 识别关键时间点（热度突增、情感反转、峰值）
2. 为每个时间点提取高互动量帖子（Top N）
3. 关联发言者信息

**参数**：
```typescript
{
  eventId: string,
  granularity?: 'hourly' | 'daily' | 'weekly',
  topN?: number           // 每个时间点提取 N 条，默认 5
}
```

**返回**：
```json
{
  "totalMilestones": 3,
  "keyOpinions": [
    {
      "milestone": {
        "type": "hotness_surge",
        "time": "2024-01-02T10:00:00Z",
        "description": "热度暴增 85.3%"
      },
      "opinions": [
        {
          "postId": "post-123",
          "text": "这个产品真的不错...",
          "user": { "userId": "...", "userName": "...", "verified": true },
          "interactions": { "total": 5000 },
          "nlp": { "sentiment": "positive", "keywords": [...] }
        }
      ]
    }
  ]
}
```

#### 10. `query_top_opinions_by_time` - 查询时间段高影响力言论
**文件**：`key-opinion.tool.ts`

**参数**：
```typescript
{
  eventId: string,
  startTime?: string,
  endTime?: string,
  limit?: number,
  minInteractions?: number  // 最低互动量，默认 100
}
```

### 用户行为分析工具

#### 11. `analyze_user_behavior` - 分析用户行为模式
**文件**：`user-profile.tool.ts`

**核心价值**：多维度行为特征提取，为异常检测提供基础。

**分析维度**：
- **时间行为**：发帖时间分布、间隔规律性
- **内容特征**：文本长度、相似度、机械性
- **互动特征**：平均转评赞
- **设备来源**：发帖设备分布

**关键评分**：
- `regularityScore`（时间规律性）：0-1，越高越规律
- `mechanicalScore`（内容机械性）：0-1，越高越机械

**参数**：
```typescript
{
  userId: string,
  limit?: number          // 分析最近 N 条，默认 200
}
```

#### 12. `detect_abnormal_user` - 检测异常账号
**文件**：`user-profile.tool.ts`

**核心价值**：综合多维度异常信号，自动化识别 AI 账号/水军/机器人。

**检测信号**（6 类）：
1. **时间异常**：
   - 凌晨活跃（0-6 点 > 30%）
   - 发帖间隔高度规律（标准差 < 平均值 * 0.3）
2. **行为异常**：
   - 短时爆发（1 小时 > 20 条）
   - 单一设备（> 95%）
3. **内容异常**：
   - 文本相似度 > 70%
4. **情感异常**：
   - 极端化（> 85% 同一情感）
5. **互动异常**：
   - 极低互动量（< 1）

**账号类型推断**：
- **bot**（机器人）：规律间隔 + 高相似度
- **troll**（水军）：爆发式发帖 + 情感极端化
- **zombie**（僵尸号）：低互动量
- **suspicious**（可疑）
- **normal**（正常）

**参数**：
```typescript
{
  userId: string,
  limit?: number,
  sensitivity?: 'low' | 'medium' | 'high'  // 默认 medium
}
```

**敏感度阈值**：
- `low`: 20%（宽松）
- `medium`: 35%（平衡）
- `high`: 50%（严格）

**返回**：
```json
{
  "isAbnormal": true,
  "accountType": "bot",
  "confidence": 0.85,
  "abnormalityScore": 0.67,
  "abnormalSignals": [
    {
      "type": "regular_interval",
      "severity": "high",
      "description": "发帖间隔高度规律（标准差 5.2分钟，平均间隔 30.5分钟），疑似定时任务"
    }
  ],
  "recommendation": "检测到 3 个异常信号，建议进一步人工审核"
}
```

#### 13. `batch_detect_abnormal_users` - 批量检测异常账号
**文件**：`batch-detection.tool.ts`

**核心价值**：对事件中所有活跃用户进行异常检测，快速定位问题账号群体。

**参数**：
```typescript
{
  eventId: string,
  minPosts?: number,      // 默认 3
  sensitivity?: 'low' | 'medium' | 'high',
  limit?: number          // 分析用户数上限，默认 100
}
```

**返回**：
```json
{
  "totalUsers": 1500,
  "analyzedUsers": 100,
  "abnormalCount": 25,
  "abnormalRatio": "25.0%",
  "abnormalUsers": [...],   // 按异常分数排序
  "summary": {
    "bots": 10,
    "trolls": 8,
    "suspicious": 7
  }
}
```

## LangChain + LangGraph 技术栈

### 核心依赖
```json
{
  "@langchain/core": "^1.0.4",
  "@langchain/langgraph": "^1.0.1",
  "@langchain/openai": "^1.1.0",
  "langchain": "^1.0.4",
  "zod": "^3.23.8"
}
```

### 工具定义模式
```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const createQueryPostsTool = () =>
  tool(
    async ({ keyword, limit }) => {
      // 工具逻辑
      return JSON.stringify(results);
    },
    {
      name: 'query_posts',
      description: '工具描述（Agent 会根据此选择工具）',
      schema: z.object({
        keyword: z.string().optional().describe('参数说明'),
        limit: z.number().default(100),
      }),
    }
  );
```

### Agent 创建模式
```typescript
import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { InMemoryStore, MemorySaver } from '@langchain/langgraph';

const agent = createAgent({
  model: new ChatOpenAI({
    modelName: 'deepseek-ai/DeepSeek-V3.2',
    temperature: 0.3,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
    },
  }),
  tools: [tool1, tool2, ...],
  store: new InMemoryStore(),      // 跨会话数据存储
  checkpointer: new MemorySaver(),  // 对话历史
});

// 调用
const result = await agent.invoke(
  {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
    ],
  },
  {
    configurable: { thread_id: 'task-001' },
  }
);
```

## 典型工作流

### 工作流 1：一般舆情分析
```
1. query_events → 检查是否已有相关事件
2. 如果事件存在 → 直接基于统计信息生成报告
3. 如果需要细节 → query_posts 获取帖子
4. 如果帖子无 NLP 结果 → nlp_analyze 分析
```

### 工作流 2：事件来龙去脉分析（重要）
```
1. query_events → 找到目标事件（获取 event_id）
   ↓
2. query_event_timeline → 获取时间线数据（建议 daily 粒度）
   ↓
3. analyze_event_milestones → 自动识别关键节点
   ↓
4. query_posts_by_event → 按时间顺序获取帖子（看演化）
   ↓
5. extract_key_opinions → 为每个关键节点提取代表性言论
   ↓
6. 生成完整报告：
   - 时间线图表
   - 关键节点分析
   - 代表性内容
   - 演化过程叙述
```

### 工作流 3：水军检测
```
1. analyze_event_influencers → 识别影响力人物
   ↓
2. batch_detect_abnormal_users → 批量检测异常账号
   ↓
3. 对高分异常用户 → detect_abnormal_user 深度分析
   ↓
4. 生成报告：异常账号占比、类型分布、风险评估
```

## 环境变量

```bash
# 必需
OPENAI_API_KEY=sk-xxxxx
OPENAI_BASE_URL=https://api.deepseek.com/v1

# 数据库（由 @sker/entities 提供）
DATABASE_URL=postgresql://...
```

## 使用示例

### 示例 1：生成事件分析报告
```typescript
import { ResearchAgent } from '@sker/agent';
import { root } from '@sker/core';

const agent = root.get(ResearchAgent);

const report = await agent.research({
  id: 'task-001',
  query: '分析"华为Mate60发布"事件的来龙去脉，包括时间线、关键节点、代表性言论',
  timeRange: '2024-08-01 至 2024-08-31',
  sampleSize: 500,
});

console.log(report.report);
// 输出 Markdown 格式报告
```

### 示例 2：检测异常账号
```typescript
import { createDetectAbnormalUserTool } from '@sker/agent';

const tool = createDetectAbnormalUserTool();

const result = await tool.invoke({
  userId: '123456',
  limit: 200,
  sensitivity: 'medium',
});

const analysis = JSON.parse(result);
if (analysis.isAbnormal) {
  console.log(`检测到异常账号：${analysis.accountType}`);
  console.log(`置信度：${analysis.confidence}`);
  console.log(`异常信号：`, analysis.abnormalSignals);
}
```

### 示例 3：提取事件关键言论
```typescript
import { createExtractKeyOpinionsTool } from '@sker/agent';

const tool = createExtractKeyOpinionsTool();

const result = await tool.invoke({
  eventId: 'evt-123',
  granularity: 'daily',
  topN: 5,
});

const keyOpinions = JSON.parse(result);
keyOpinions.keyOpinions.forEach(ko => {
  console.log(`\n${ko.milestone.description} (${ko.milestone.time})`);
  ko.opinions.forEach(op => {
    console.log(`  - ${op.user.userName}: ${op.text.slice(0, 50)}...`);
  });
});
```

## 与其他包的集成

### 依赖关系
```
@sker/agent
  ├── @sker/core          # DI 容器（注入 NLPAnalyzer）
  ├── @sker/entities      # 数据库实体 + useEntityManager
  ├── @sker/nlp           # NLP 分析服务
  └── @sker/workflow-run  # （可选）工作流执行器可调用 Agent
```

### 在 NestJS 中使用
```typescript
// apps/api/src/app.module.ts
import { ResearchAgent } from '@sker/agent';
import { root } from '@sker/core';

@Module({
  providers: [
    {
      provide: ResearchAgent,
      useFactory: () => root.get(ResearchAgent),
    },
  ],
})
export class AppModule {}

// apps/api/src/research/research.controller.ts
@Controller('research')
export class ResearchController {
  constructor(private agent: ResearchAgent) {}

  @Post('analyze')
  async analyze(@Body() dto: ResearchDto) {
    return this.agent.research({
      id: crypto.randomUUID(),
      query: dto.query,
      timeRange: dto.timeRange,
    });
  }
}
```

## 设计原则

### 1. 数据优先原则
- **所有工具仅查询数据库已有数据**
- 不进行任何实时采集（避免 Agent 失控）
- 数据不足时明确告知样本量限制

### 2. 智能缓存原则
- `nlp_analyze` 优先使用已有分析结果
- 减少重复 AI 调用，降低成本
- 缓存命中率透明化

### 3. 可解释性原则
- 所有检测工具返回详细信号列表
- 异常检测不是黑箱，提供置信度 + 原因
- 便于人工审核和调试

### 4. 组合优于复杂
- 每个工具职责单一
- 通过工具组合实现复杂分析
- Agent 自主规划步骤

## 性能优化建议

### 1. 批量操作
- 使用 `batch_detect_abnormal_users` 替代单用户循环检测
- NLP 分析最多 100 条/批

### 2. 合理设置 limit
- `query_posts`: 根据分析需求设置（100-500）
- `analyze_user_behavior`: 建议 200 条足够
- `extract_key_opinions`: topN=3-5 避免信息过载

### 3. 选择合适粒度
- 短期事件（< 7 天）：hourly 或 daily
- 中期事件（7-30 天）：daily
- 长期事件（> 30 天）：weekly

## 扩展指南

### 添加新工具
```typescript
// 1. 定义工具
export const createMyNewTool = () =>
  tool(
    async ({ param1 }) => {
      return useEntityManager(async (m) => {
        // 数据库查询
        return JSON.stringify(results);
      });
    },
    {
      name: 'my_new_tool',
      description: '详细描述工具功能、用途、参数',
      schema: z.object({
        param1: z.string().describe('参数说明'),
      }),
    }
  );

// 2. 在 tools/index.ts 导出
export { createMyNewTool } from './my-new-tool.tool';

// 3. 在 ResearchAgent 中注册
const tools = [
  createQueryPostsTool(),
  createMyNewTool(),  // 新增
];

// 4. 更新系统提示词（描述工具用途）
```

### 自定义 Agent
```typescript
import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class MyCustomAgent {
  private agent: ReturnType<typeof createAgent>;

  constructor() {
    this.agent = createAgent({
      model: new ChatOpenAI({ ... }),
      tools: [
        // 选择需要的工具
      ],
    });
  }

  async execute(task: MyTask) {
    const systemPrompt = this.buildPrompt(task);
    return this.agent.invoke({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: task.query },
      ],
    });
  }
}
```

## 常见问题

### Q: Agent 为什么不返回结果？
**A**: 检查以下几点：
1. 环境变量 `OPENAI_API_KEY` 是否设置
2. 数据库是否有相关数据（Agent 仅查询已有数据）
3. 查看日志中的工具调用情况

### Q: 如何提高 Agent 响应速度？
**A**:
1. 减少 `limit` 参数（默认 100 → 50）
2. 使用 `temperature: 0.1`（更确定性，减少思考时间）
3. 预先调用 `query_events` 检查是否已有统计结果

### Q: 异常检测误报率高怎么办？
**A**:
1. 调整 `sensitivity` 为 `high`（提高阈值到 50%）
2. 增加 `minPosts` 参数（需要更多样本）
3. 人工审核高置信度（> 0.8）结果

### Q: 如何理解"事件来龙去脉"分析？
**A**: 核心是三步走：
1. `query_event_timeline` → 宏观趋势（热度曲线）
2. `analyze_event_milestones` → 关键转折点
3. `query_posts_by_event` + `extract_key_opinions` → 每个节点的代表性内容

三者结合，即可讲清"事件从何而起、如何发展、何时转折、如何收尾"。

---

**最后更新**：2024-12-16
**维护者**：@sker/agent 开发团队
