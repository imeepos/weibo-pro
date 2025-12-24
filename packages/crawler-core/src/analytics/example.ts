import { EnvironmentInjector } from '@sker/core';
import { NLPAnalyzer } from '@sker/nlp';
import { SentimentAnalyzer, Statistics } from './index';

async function main() {
  const injector = EnvironmentInjector.createWithAutoProviders([
    NLPAnalyzer,
    SentimentAnalyzer,
    Statistics,
  ]);

  const sentimentAnalyzer = injector.get(SentimentAnalyzer);
  const statistics = injector.get(Statistics);

  // 示例 1: 情感分析
  const postContext = {
    postId: 'post-123',
    content: '今天天气真好，心情愉快！',
    comments: ['我也觉得很开心', '确实不错'],
    subComments: [],
    reposts: [],
  };

  const sentiment = await sentimentAnalyzer.analyzeSentiment(postContext);
  console.log('情感分析结果:', sentiment);

  // 示例 2: 情感分析 + 关键词提取
  const withKeywords = await sentimentAnalyzer.analyzeWithKeywords(postContext);
  console.log('情感 + 关键词:', {
    sentiment: withKeywords.sentiment.overall,
    topKeywords: withKeywords.keywords.slice(0, 5).map((k) => k.keyword),
  });

  // 示例 3: 完整分析（包含事件分类、标题、标签）
  const complete = await sentimentAnalyzer.analyzeComplete(postContext, {
    availableCategories: ['社会热点', '科技创新', '文体娱乐'],
    availableTags: ['天气', '心情', '生活'],
  });
  console.log('完整分析:', {
    sentiment: complete.sentiment.overall,
    eventType: complete.event.type,
    eventTitle: complete.eventTitle,
    tags: complete.tags.map((t) => t.name),
  });

  // 示例 4: 热度趋势分析
  const posts = [
    {
      id: '1',
      userId: 'user1',
      username: '用户1',
      timestamp: new Date('2025-01-01'),
      likeCount: 100,
      commentCount: 20,
      repostCount: 10,
    },
    {
      id: '2',
      userId: 'user1',
      username: '用户1',
      timestamp: new Date('2025-01-02'),
      likeCount: 150,
      commentCount: 30,
      repostCount: 15,
    },
  ];

  const trend = statistics.calculateTrend(posts, 'like');
  console.log('热度趋势:', trend);

  // 示例 5: 用户画像
  const profile = statistics.buildUserProfile(posts, [], []);
  console.log('用户画像:', profile);

  // 示例 6: 传播路径
  const propagation = statistics.buildPropagationTree(
    posts[0],
    [{ id: 'r1', postId: '1', userId: 'user2', username: '用户2', timestamp: new Date() }],
    [{ id: 'c1', postId: '1', userId: 'user3', username: '用户3', timestamp: new Date() }]
  );
  console.log('传播路径:', JSON.stringify(propagation, null, 2));
}

main().catch(console.error);
