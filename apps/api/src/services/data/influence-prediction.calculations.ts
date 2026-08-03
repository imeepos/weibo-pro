import type { InfluenceFactor, SimilarCase } from '@sker/sdk';
import { normalizeFactorValue } from './influence-prediction.features';

/**
 * 预测触达人数：基础触达 × 加权特征和
 */
export function calculatePredictedReach(factors: InfluenceFactor[]): number {
  let weightedSum = 0;

  factors.forEach(factor => {
    const normalizedValue = normalizeFactorValue(factor);
    weightedSum += normalizedValue * factor.weight;
  });

  // 基础触达人数（假设每个粉丝有 10% 的概率看到）
  const baseReach = (factors[0]?.value ?? 0) * 0.1;

  return Math.round(baseReach * weightedSum * 10);
}

/**
 * 预测转发数（转发率通常为触达人数的 1-5%）
 */
export function calculatePredictedReposts(predictedReach: number, factors: InfluenceFactor[]): number {
  const repostRate = 0.01 + factors.find(f => f.name === '话题热度')!.value * 0.04;
  return Math.round(predictedReach * repostRate);
}

/**
 * 预测互动量（互动率通常为触达人数的 5-15%）
 */
export function calculatePredictedEngagement(predictedReach: number, factors: InfluenceFactor[]): number {
  const engagementRate = 0.05 + factors.find(f => f.name === '初始互动')!.value * 0.1;
  return Math.round(predictedReach * engagementRate);
}

/**
 * 计算预测置信度（数据完整度 40% + 历史数据充足度 30% + 用户权威度 30%）
 */
export function calculateConfidence(postsData: any[], historicalData: any[]): number {
  let confidence = 0;

  // 数据完整度（40%） - 至少有1条数据就算完整
  const dataCompleteness = Math.min(postsData.length / 1, 1);
  confidence += dataCompleteness * 0.4;

  // 历史数据充足度（30%） - 至少有10条历史数据就算充足
  const historicalSufficiency = Math.min(historicalData.length / 10, 1);
  confidence += historicalSufficiency * 0.3;

  // 用户权威度（30%） - 1万粉丝就算高权威
  const avgFollowers = postsData.reduce((sum, p) => sum + (parseInt(p.followers_count) || 0), 0) / postsData.length;
  const authorityScore = Math.min(avgFollowers / 10000, 1);
  confidence += authorityScore * 0.3;

  return Math.min(confidence, 1);
}

/**
 * 确定置信度等级
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

/**
 * 计算预测区间（置信度越低，方差越大）
 */
export function calculatePredictionRange(predictedReach: number, confidence: number) {
  const variance = (1 - confidence) * 0.5;
  const min = Math.round(predictedReach * (1 - variance));
  const max = Math.round(predictedReach * (1 + variance));

  return {
    min,
    max,
    expected: predictedReach,
  };
}

/**
 * 查找相似案例（按关键词完全匹配排序，取前5个）
 */
export function findSimilarCases(currentPost: any, historicalData: any[]): SimilarCase[] {
  if (!historicalData || historicalData.length === 0) {
    return [];
  }

  // 提取当前帖子的关键词
  const currentKeyword = currentPost.keyword || '';

  if (!currentKeyword) {
    return [];
  }

  const similarCases = historicalData
    .filter(p => p.post_id !== currentPost.post_id && p.keyword)
    .map(post => {
      const postKeyword = post.keyword;
      // 简单的字符串相似度：完全匹配为1，否则为0
      const similarity = currentKeyword === postKeyword ? 1 : 0;

      const repostsCount = parseInt(post.reposts_count) || 0;
      const commentsCount = parseInt(post.comments_count) || 0;
      const attitudesCount = parseInt(post.attitudes_count) || 0;

      return {
        postId: post.post_id,
        similarity,
        actualReach: repostsCount * 10, // 估算触达人数
        actualReposts: repostsCount,
        actualEngagement: repostsCount + commentsCount + attitudesCount,
      };
    })
    .filter(sc => sc.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return similarCases;
}

/**
 * 生成建议列表
 */
export function generateRecommendations(factors: InfluenceFactor[], confidence: number): string[] {
  const recommendations: string[] = [];

  // 基于置信度的建议
  if (confidence < 0.4) {
    recommendations.push('预测置信度较低，建议等待更多数据后再做决策');
  }

  // 基于粉丝数的建议
  const followersFactor = factors.find(f => f.name === '用户粉丝数');
  if (followersFactor && followersFactor.value < 1000) {
    recommendations.push('用户粉丝数较少，建议通过优质内容和互动提升影响力');
  }

  // 基于认证状态的建议
  const verifiedFactor = factors.find(f => f.name === '是否认证');
  if (verifiedFactor && verifiedFactor.value === 0) {
    recommendations.push('建议完成认证以提升可信度和影响力');
  }

  // 基于媒体内容的建议
  const mediaFactor = factors.find(f => f.name === '是否有媒体');
  if (mediaFactor && mediaFactor.value === 0) {
    recommendations.push('建议添加图片或视频内容以提升传播效果');
  }

  // 基于发布时间的建议
  const timeFactor = factors.find(f => f.name === '发布时间');
  if (timeFactor && timeFactor.value < 0.5) {
    recommendations.push('建议在用户活跃高峰时段（9-12点、18-22点）发布内容');
  }

  // 基于初始互动的建议
  const engagementFactor = factors.find(f => f.name === '初始互动');
  if (engagementFactor && engagementFactor.value < 10) {
    recommendations.push('初始互动较少，建议积极回复评论引导用户参与');
  }

  // 如果没有特殊情况
  if (recommendations.length === 0) {
    recommendations.push('当前内容特征良好，继续保持');
  }

  return recommendations;
}
