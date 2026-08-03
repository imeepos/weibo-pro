import type { InfluenceFactor } from '@sker/sdk';

/**
 * 特征权重配置
 */
export interface FeatureWeights {
  userFollowers: number;
  userVerified: number;
  contentLength: number;
  hasMedia: number;
  postingTime: number;
  topicHotness: number;
  initialEngagement: number;
}

/**
 * 提取当前帖子的影响力特征
 */
export function extractFactors(post: any, allPosts: any[], featureWeights: FeatureWeights): InfluenceFactor[] {
  const followersCount = parseInt(post.followers_count) || 0;
  const verified = post.verified === true;
  const textLength = parseInt(post.text_length) || 0;
  const picNum = parseInt(post.pic_num) || 0;
  const createdAt = new Date(post.created_at);
  const repostsCount = parseInt(post.reposts_count) || 0;
  const commentsCount = parseInt(post.comments_count) || 0;
  const attitudesCount = parseInt(post.attitudes_count) || 0;

  // 计算话题热度（基于关键词频率）
  const keywordFreq = calculateKeywordHotness(allPosts);

  // 计算发布时间评分
  const postingTimeScore = calculatePostingTimeScore(createdAt);

  // 计算初始互动
  const initialEngagement = repostsCount + commentsCount + attitudesCount;

  return [
    {
      name: '用户粉丝数',
      weight: featureWeights.userFollowers,
      value: followersCount,
      impact: followersCount > 10000 ? 'positive' : followersCount > 1000 ? 'neutral' : 'negative',
      description: `用户拥有 ${followersCount.toLocaleString()} 个粉丝`,
    },
    {
      name: '是否认证',
      weight: featureWeights.userVerified,
      value: verified ? 1 : 0,
      impact: verified ? 'positive' : 'neutral',
      description: verified ? '已认证用户，可信度更高' : '未认证用户',
    },
    {
      name: '内容长度',
      weight: featureWeights.contentLength,
      value: textLength,
      impact: textLength > 50 && textLength < 200 ? 'positive' : 'neutral',
      description: `内容长度为 ${textLength} 字`,
    },
    {
      name: '是否有媒体',
      weight: featureWeights.hasMedia,
      value: picNum,
      impact: picNum > 0 ? 'positive' : 'neutral',
      description: picNum > 0 ? `包含 ${picNum} 个媒体文件` : '无媒体内容',
    },
    {
      name: '发布时间',
      weight: featureWeights.postingTime,
      value: postingTimeScore,
      impact: postingTimeScore > 0.6 ? 'positive' : postingTimeScore > 0.3 ? 'neutral' : 'negative',
      description: getPostingTimeDescription(createdAt),
    },
    {
      name: '话题热度',
      weight: featureWeights.topicHotness,
      value: keywordFreq,
      impact: keywordFreq > 0.5 ? 'positive' : 'neutral',
      description: `话题热度评分为 ${(keywordFreq * 100).toFixed(1)}%`,
    },
    {
      name: '初始互动',
      weight: featureWeights.initialEngagement,
      value: initialEngagement,
      impact: initialEngagement > 50 ? 'positive' : initialEngagement > 10 ? 'neutral' : 'negative',
      description: `初始互动量为 ${initialEngagement}`,
    },
  ];
}

/**
 * 基于关键词出现频率计算话题热度
 */
export function calculateKeywordHotness(posts: any[]): number {
  const keywordCounts = new Map<string, number>();
  let totalKeywords = 0;

  posts.forEach(post => {
    const keyword = post.keyword;
    if (keyword) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      totalKeywords++;
    }
  });

  if (totalKeywords === 0) return 0;

  const maxCount = Math.max(...keywordCounts.values());
  return maxCount / totalKeywords;
}

/**
 * 计算发布时间评分（按活跃时段）
 */
export function calculatePostingTimeScore(createdAt: Date): number {
  const hour = createdAt.getHours();

  // 高峰时段：9-12点，18-22点
  if ((hour >= 9 && hour <= 12) || (hour >= 18 && hour <= 22)) {
    return 1.0;
  }
  // 次高峰时段：7-9点，12-14点，16-18点
  else if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 16 && hour <= 18)) {
    return 0.6;
  }
  // 低谷时段：0-6点，22-24点
  else {
    return 0.3;
  }
}

/**
 * 获取发布时间描述
 */
export function getPostingTimeDescription(createdAt: Date): string {
  const hour = createdAt.getHours();
  const hourStr = `${hour.toString().padStart(2, '0')}:00`;

  if ((hour >= 9 && hour <= 12) || (hour >= 18 && hour <= 22)) {
    return `发布于 ${hourStr}（高峰时段）`;
  } else if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 16 && hour <= 18)) {
    return `发布于 ${hourStr}（次高峰时段）`;
  } else {
    return `发布于 ${hourStr}（低谷时段）`;
  }
}

/**
 * 根据因素类型归一化特征值到 0-1
 */
export function normalizeFactorValue(factor: InfluenceFactor): number {
  if (factor.name === '用户粉丝数') {
    return Math.min(factor.value / 100000, 1);
  } else if (factor.name === '是否有媒体' || factor.name === '是否认证') {
    return factor.value;
  } else if (factor.name === '发布时间' || factor.name === '话题热度') {
    return factor.value;
  } else if (factor.name === '初始互动') {
    return Math.min(factor.value / 100, 1);
  } else {
    return Math.min(factor.value / 200, 1);
  }
}
