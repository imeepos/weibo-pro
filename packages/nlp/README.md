# @sker/nlp

社交媒体舆情 NLP 分析引擎。

## 核心理念

**一次调用，完整分析** - 单次 LLM 请求获取情感、关键词、事件、标签的完整结果
**类型即契约** - 完整的 TypeScript 类型定义保障数据可靠性
**智能扩展** - 支持动态分类系统，LLM 可建议新分类

## 能力

单次分析输出：
- **情感分析** - 正/负/中立 + 置信度 + 概率分布
- **关键词提取** - 权重排序 + 情感标注 + 词性标注（最多 30 个）
- **事件分类** - 预设类别匹配 + 新分类建议
- **事件标题** - 10-30 字简洁标题
- **事件简介** - 50-200 字客观描述
- **事件标签** - 3-10 个分层标签（关键词/话题/实体）

## 快速开始

### 安装

```bash
pnpm add @sker/nlp
```

### 环境配置

```bash
# .env
OPENAI_BASE_URL=https://api.siliconflow.cn/v1
OPENAI_API_KEY=sk-xxxxx
```

### 基础使用

```typescript
import { NLPAnalyzer, PostContext } from '@sker/nlp';

// 依赖注入模式（推荐）
import { createRootInjector } from '@sker/core';

const injector = createRootInjector([NLPAnalyzer]);
const analyzer = injector.get(NLPAnalyzer);

// 构建上下文
const context: PostContext = {
  postId: 'weibo-123456',
  content: '今天的 AI 大会太精彩了，学到很多...',
  comments: ['确实不错', '期待下次'],
  subComments: ['我也想去'],
  reposts: ['转发微博'],
};

// 执行分析
const result = await analyzer.analyze(
  context,
  ['社会热点', '科技创新', '政策法规'],  // 可选：可用分类
  ['人工智能', '技术创新']                // 可选：可用标签
);

console.log(result.sentiment.overall);     // 'positive'
console.log(result.keywords[0].keyword);   // '人工智能'
console.log(result.event.type);            // '科技创新'
console.log(result.eventTitle);            // 'AI 大会成功举办'
```

## API 参考

### NLPAnalyzer

```typescript
@Injectable({ providedIn: 'root' })
class NLPAnalyzer {
  async analyze(
    context: PostContext,
    availableCategories?: string[],  // 可选：已有分类列表
    availableTags?: string[]         // 可选：已有标签列表
  ): Promise<CompleteAnalysisResult>
}
```

### PostContext

```typescript
interface PostContext {
  postId: string;
  content: string;        // 帖子内容
  comments: string[];     // 评论列表
  subComments: string[];  // 子评论列表
  reposts: string[];      // 转发内容列表
}
```

### CompleteAnalysisResult

```typescript
interface CompleteAnalysisResult {
  // 情感分析
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    confidence: number;        // 置信度 (0-1)
    positive_prob: number;     // 正面概率
    negative_prob: number;     // 负面概率
    neutral_prob: number;      // 中立概率
  };

  // 关键词提取（最多 30 个）
  keywords: Array<{
    keyword: string;
    weight: number;            // 重要性权重 (0-1)
    sentiment: 'positive' | 'negative' | 'neutral';
    pos: string;               // 词性：noun/verb/adj
    count: number;             // 出现频次
  }>;

  // 事件分类
  event: {
    type: string;              // 事件类型
    confidence: number;        // 分类置信度 (0-1)
    isNewCategory?: boolean;   // 是否为新建议分类
  };

  // 事件标题和简介
  eventTitle: string;          // 10-30 字标题
  eventDescription: string;    // 50-200 字简介

  // 事件标签（3-10 个）
  tags: Array<{
    name: string;
    type: 'keyword' | 'topic' | 'entity';
    isNew?: boolean;           // 是否为新建议标签
  }>;
}
```

## OpenAI 客户端

### 配置管理

```typescript
import { useOpenAi, getOpenAiConfig } from '@sker/nlp';

// 获取配置好的 OpenAI 客户端
const client = useOpenAi();

// 获取配置对象
const config = getOpenAiConfig();
console.log(config.baseURL);  // https://api.siliconflow.cn/v1
```

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `OPENAI_BASE_URL` | API 端点地址 | `https://api.siliconflow.cn/v1` |
| `OPENAI_API_KEY` | API 密钥 | `sk-xxxxxxxxxxxxx` |

缺少任一配置将抛出明确的错误提示。

## 技术特点

### LLM 模型

- **默认模型**: `deepseek-ai/DeepSeek-V3`
- **响应格式**: 强制 JSON 输出
- **温度设置**: 0.2（低随机性，结果稳定）
- **兼容性**: 支持 OpenAI-compatible API

### 默认分类系统

| 分类 | 适用场景 |
|------|--------|
| 社会热点 | 社会事件、民生话题 |
| 科技创新 | 技术发布、科研突破 |
| 政策法规 | 政府政策、法律动态 |
| 经济财经 | 市场动态、财经新闻 |
| 文体娱乐 | 娱乐活动、体育赛事 |
| 教育 | 教育改革、学术活动 |

支持传入自定义分类列表，LLM 会优先匹配已有分类或建议新分类。

### 性能优化

- **上下文合并**: 自动整合帖子、评论、子评论、转发为结构化文本
- **缓存友好**: 分析结果可持久化存储，避免重复调用
- **错误处理**: 详细的日志记录和错误提示

## 使用场景

### 1. 工作流自动分析

```typescript
// 集成到工作流节点
import { PostNLPAnalyzerVisitor } from '@sker/workflow-run';

// Visitor 内部自动调用 NLPAnalyzer
```

### 2. AI Agent 辅助决策

```typescript
// 为 AI Agent 提供 NLP 分析能力
import { ResearchAgent } from '@sker/agent';

const agent = new ResearchAgent(analyzer);
```

### 3. 批量舆情分析

```typescript
const posts = await fetchPostsFromDB();

for (const post of posts) {
  const result = await analyzer.analyze({
    postId: post.id,
    content: post.content,
    comments: post.comments.map(c => c.content),
    subComments: post.subComments.map(c => c.content),
    reposts: post.reposts.map(r => r.content),
  });

  await saveAnalysisResult(result);
}
```

## 设计哲学

### 一次性完整分析

对比多次调用方案：

**传统方案**（需 5 次 API 调用）：
```typescript
const sentiment = await analyzeSentiment(text);
const keywords = await extractKeywords(text);
const category = await classifyEvent(text);
const title = await generateTitle(text);
const tags = await generateTags(text);
```

**@sker/nlp 方案**（仅 1 次 API 调用）：
```typescript
const result = await analyzer.analyze(context);
// 获取所有结果
```

**优势**：
- 降低 API 成本（80% ↓）
- 减少网络延迟（80% ↓）
- 保证结果一致性（单次 LLM 推理）

### 智能分类系统

- **闭环设计**: 支持自定义分类列表
- **演进能力**: LLM 可建议新分类（标记为 `isNewCategory: true`）
- **人工审核**: 新分类由系统管理员审批后加入分类库

## 开发

```bash
# 构建
pnpm build

# 开发模式（带热重载）
pnpm dev

# 类型检查
pnpm check-types

# 代码检查
pnpm lint
```

## 依赖

- **@sker/core** - 依赖注入框架
- **openai** - OpenAI SDK（^4.73.1）

## 反向依赖

被以下包使用：
- **@sker/workflow-run** - `PostNLPAnalyzerVisitor` 工作流节点
- **@sker/workflow-ast** - NLP 分析节点类型定义
- **@sker/agent** - AI Agent 舆情分析能力

---

**代码即文档，一次调用，完整分析。**
