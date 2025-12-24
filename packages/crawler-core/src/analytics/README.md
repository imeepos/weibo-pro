# Analytics 数据分析模块

集成 @sker/nlp 的数据分析功能，提供情感分析、数据统计和传播路径分析。

## 功能

### 1. 情感分析 (SentimentAnalyzer)

集成 @sker/nlp 进行文本情感分析、关键词提取和事件分类。

```typescript
import { SentimentAnalyzer } from '@sker/crawler-core';
import { EnvironmentInjector } from '@sker/core';
import { NLPAnalyzer } from '@sker/nlp';

const injector = EnvironmentInjector.createWithAutoProviders([
  NLPAnalyzer,
  SentimentAnalyzer,
]);

const analyzer = injector.get(SentimentAnalyzer);

// 情感分析
const sentiment = await analyzer.analyzeSentiment({
  postId: 'post-123',
  content: '今天天气真好',
  comments: ['我也觉得很开心'],
  subComments: [],
  reposts: [],
});

// 情感 + 关键词
const result = await analyzer.analyzeWithKeywords(context);

// 完整分析（包含事件分类、标题、标签）
const complete = await analyzer.analyzeComplete(context, {
  availableCategories: ['社会热点', '科技创新'],
  availableTags: ['天气', '心情'],
});
```

### 2. 数据统计 (Statistics)

提供热度趋势、用户画像和传播路径分析。

```typescript
import { Statistics } from '@sker/crawler-core';

const statistics = injector.get(Statistics);

// 热度趋势分析
const trend = statistics.calculateTrend(posts, 'like');

// 用户画像
const profile = statistics.buildUserProfile(posts, comments, reposts);

// 传播路径
const propagation = statistics.buildPropagationTree(
  originalPost,
  reposts,
  comments
);
```

## 类型定义

```typescript
interface SentimentResult {
  overall: 'positive' | 'negative' | 'neutral';
  confidence: number;
  positive_prob: number;
  negative_prob: number;
  neutral_prob: number;
}

interface KeywordResult {
  keyword: string;
  weight: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  pos: string;
  count: number;
}

interface TrendPoint {
  timestamp: Date;
  value: number;
}

interface UserProfile {
  totalPosts: number;
  totalComments: number;
  totalReposts: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topKeywords: KeywordResult[];
}

interface PropagationNode {
  userId: string;
  username: string;
  timestamp: Date;
  type: 'original' | 'repost' | 'comment';
  children: PropagationNode[];
}
```

## 示例

参考 `src/analytics/example.ts` 查看完整使用示例。
