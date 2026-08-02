import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type { InfluencePredictionAnalysis, InfluenceFactor, SimilarCase } from '@sker/sdk';

@Injectable({ providedIn: 'root' })
export class InfluencePredictionService {
  // 特征权重
  private readonly featureWeights = {
    userFollowers: 0.25,
    userVerified: 0.10,
    contentLength: 0.05,
    hasMedia: 0.15,
    postingTime: 0.10,
    topicHotness: 0.20,
    initialEngagement: 0.15,
  };

  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getInfluencePredictionAnalysis(eventId: string): Promise<InfluencePredictionAnalysis> {
    const cacheKey = CacheService.buildKey('influence:prediction', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchInfluencePredictionAnalysis(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchInfluencePredictionAnalysis(eventId: string): Promise<InfluencePredictionAnalysis> {
    return useEntityManager(async (manager) => {
      // 获取事件中的帖子数据
      const postsData = await manager
        .createQueryBuilder()
        .select('p.id', 'post_id')
        .addSelect('p.user_id', 'user_id')
        .addSelect('u.followers_count', 'followers_count')
        .addSelect('u.verified', 'verified')
        .addSelect('LENGTH(p.text)', 'text_length')
        .addSelect('p.pic_num', 'pic_num')
        .addSelect('p.created_at', 'created_at')
        .addSelect('p.reposts_count', 'reposts_count')
        .addSelect('p.comments_count', 'comments_count')
        .addSelect('p.attitudes_count', 'attitudes_count')
        .addSelect("jsonb_array_elements(nlp.keywords)->>'keyword'", 'keyword')
        .from('weibo_posts', 'p')
        .innerJoin('weibo_users', 'u', 'p.user_id = u.id')
        .innerJoin('post_nlp_results', 'nlp', 'p.id = nlp.post_id')
        .where('p.event_id = :eventId', { eventId })
        .orderBy('p.created_at', 'DESC')
        .limit(100)
        .getRawMany();

      if (postsData.length === 0) {
        return this.getDefaultInfluencePredictionAnalysis();
      }

      // 获取历史相似帖子数据
      const historicalData = await manager
        .createQueryBuilder()
        .select('p.id', 'post_id')
        .addSelect("jsonb_array_elements(nlp.keywords)->>'keyword'", 'keywords')
        .addSelect('p.reposts_count', 'reposts_count')
        .addSelect('p.comments_count', 'comments_count')
        .addSelect('p.attitudes_count', 'attitudes_count')
        .from('weibo_posts', 'p')
        .innerJoin('post_nlp_results', 'nlp', 'p.id = nlp.post_id')
        .where('p.event_id != :eventId', { eventId })
        .andWhere('p.created_at >= NOW() - INTERVAL \'30 days\'')
        .limit(500)
        .getRawMany();

      // 计算影响力预测
      const analysis = this.calculateInfluencePrediction(postsData, historicalData);

      return analysis;
    });
  }

  private calculateInfluencePrediction(
    postsData: any[],
    historicalData: any[] = []
  ): InfluencePredictionAnalysis {
    // 提取当前帖子的特征
    const currentPost = postsData[0];

    // 计算特征值
    const factors = this.extractFactors(currentPost, postsData);

    // 计算预测触达人数
    const predictedReach = this.calculatePredictedReach(factors);

    // 计算预测转发数
    const predictedReposts = this.calculatePredictedReposts(predictedReach, factors);

    // 计算预测互动量
    const predictedEngagement = this.calculatePredictedEngagement(predictedReach, factors);

    // 计算置信度
    const confidence = this.calculateConfidence(postsData, historicalData);

    // 确定置信度等级
    const confidenceLevel = this.getConfidenceLevel(confidence);

    // 计算预测区间
    const predictionRange = this.calculatePredictionRange(predictedReach, confidence);

    // 查找相似案例
    const similarCases = this.findSimilarCases(currentPost, historicalData);

    // 生成建议
    const recommendations = this.generateRecommendations(factors, confidence);

    return {
      predictedReach,
      predictedReposts,
      predictedEngagement,
      confidence,
      confidenceLevel,
      factors,
      predictionRange,
      similarCases,
      recommendations,
    };
  }

  private extractFactors(post: any, allPosts: any[]): InfluenceFactor[] {
    const followersCount = parseInt(post.followers_count) || 0;
    const verified = post.verified === true;
    const textLength = parseInt(post.text_length) || 0;
    const picNum = parseInt(post.pic_num) || 0;
    const createdAt = new Date(post.created_at);
    const repostsCount = parseInt(post.reposts_count) || 0;
    const commentsCount = parseInt(post.comments_count) || 0;
    const attitudesCount = parseInt(post.attitudes_count) || 0;

    // 计算话题热度（基于关键词频率）
    const keywordFreq = this.calculateKeywordHotness(allPosts);

    // 计算发布时间评分
    const postingTimeScore = this.calculatePostingTimeScore(createdAt);

    // 计算初始互动
    const initialEngagement = repostsCount + commentsCount + attitudesCount;

    // 归一化特征值（0-1）
    const _normalizedFollowers = Math.min(followersCount / 100000, 1); // 10万粉丝为满分
    const _normalizedLength = Math.min(textLength / 200, 1); // 200字为满分
    const _normalizedInitialEngagement = Math.min(initialEngagement / 100, 1); // 100互动为满分

    return [
      {
        name: '用户粉丝数',
        weight: this.featureWeights.userFollowers,
        value: followersCount,
        impact: followersCount > 10000 ? 'positive' : followersCount > 1000 ? 'neutral' : 'negative',
        description: `用户拥有 ${followersCount.toLocaleString()} 个粉丝`,
      },
      {
        name: '是否认证',
        weight: this.featureWeights.userVerified,
        value: verified ? 1 : 0,
        impact: verified ? 'positive' : 'neutral',
        description: verified ? '已认证用户，可信度更高' : '未认证用户',
      },
      {
        name: '内容长度',
        weight: this.featureWeights.contentLength,
        value: textLength,
        impact: textLength > 50 && textLength < 200 ? 'positive' : 'neutral',
        description: `内容长度为 ${textLength} 字`,
      },
      {
        name: '是否有媒体',
        weight: this.featureWeights.hasMedia,
        value: picNum,
        impact: picNum > 0 ? 'positive' : 'neutral',
        description: picNum > 0 ? `包含 ${picNum} 个媒体文件` : '无媒体内容',
      },
      {
        name: '发布时间',
        weight: this.featureWeights.postingTime,
        value: postingTimeScore,
        impact: postingTimeScore > 0.6 ? 'positive' : postingTimeScore > 0.3 ? 'neutral' : 'negative',
        description: this.getPostingTimeDescription(createdAt),
      },
      {
        name: '话题热度',
        weight: this.featureWeights.topicHotness,
        value: keywordFreq,
        impact: keywordFreq > 0.5 ? 'positive' : 'neutral',
        description: `话题热度评分为 ${(keywordFreq * 100).toFixed(1)}%`,
      },
      {
        name: '初始互动',
        weight: this.featureWeights.initialEngagement,
        value: initialEngagement,
        impact: initialEngagement > 50 ? 'positive' : initialEngagement > 10 ? 'neutral' : 'negative',
        description: `初始互动量为 ${initialEngagement}`,
      },
    ];
  }

  private calculateKeywordHotness(posts: any[]): number {
    // 统计关键词频率
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

    // 计算热度（基于关键词出现频率）
    const maxCount = Math.max(...keywordCounts.values());
    return maxCount / totalKeywords;
  }

  private calculatePostingTimeScore(createdAt: Date): number {
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

  private getPostingTimeDescription(createdAt: Date): string {
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

  private calculatePredictedReach(factors: InfluenceFactor[]): number {
    let weightedSum = 0;

    factors.forEach(factor => {
      const normalizedValue = this.normalizeFactorValue(factor);
      weightedSum += normalizedValue * factor.weight;
    });

    // 基础触达人数（假设每个粉丝有 10% 的概率看到）
    const baseReach = (factors[0]?.value ?? 0) * 0.1;

    // 预测触达 = 基础触达 × 加权特征和
    return Math.round(baseReach * weightedSum * 10);
  }

  private normalizeFactorValue(factor: InfluenceFactor): number {
    // 根据因素类型归一化
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

  private calculatePredictedReposts(predictedReach: number, factors: InfluenceFactor[]): number {
    // 转发率通常为触达人数的 1-5%
    const repostRate = 0.01 + factors.find(f => f.name === '话题热度')!.value * 0.04;
    return Math.round(predictedReach * repostRate);
  }

  private calculatePredictedEngagement(predictedReach: number, factors: InfluenceFactor[]): number {
    // 互动率通常为触达人数的 5-15%
    const engagementRate = 0.05 + factors.find(f => f.name === '初始互动')!.value * 0.1;
    return Math.round(predictedReach * engagementRate);
  }

  private calculateConfidence(postsData: any[], historicalData: any[]): number {
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

  private getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.4) return 'medium';
    return 'low';
  }

  private calculatePredictionRange(predictedReach: number, confidence: number) {
    const variance = (1 - confidence) * 0.5; // 置信度越低，方差越大
    const min = Math.round(predictedReach * (1 - variance));
    const max = Math.round(predictedReach * (1 + variance));

    return {
      min,
      max,
      expected: predictedReach,
    };
  }

  private findSimilarCases(currentPost: any, historicalData: any[]): SimilarCase[] {
    if (!historicalData || historicalData.length === 0) {
      return [];
    }

    // 提取当前帖子的关键词
    const currentKeyword = currentPost.keyword || '';

    if (!currentKeyword) {
      return [];
    }

    // 计算相似度并排序
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
      .slice(0, 5); // 取前5个最相似的案例

    return similarCases;
  }

  private generateRecommendations(factors: InfluenceFactor[], confidence: number): string[] {
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

  private getDefaultInfluencePredictionAnalysis(): InfluencePredictionAnalysis {
    return {
      predictedReach: 0,
      predictedReposts: 0,
      predictedEngagement: 0,
      confidence: 0,
      confidenceLevel: 'low',
      factors: [
        {
          name: '用户粉丝数',
          weight: this.featureWeights.userFollowers,
          value: 0,
          impact: 'neutral',
          description: '暂无数据',
        },
        {
          name: '是否认证',
          weight: this.featureWeights.userVerified,
          value: 0,
          impact: 'neutral',
          description: '暂无数据',
        },
        {
          name: '内容长度',
          weight: this.featureWeights.contentLength,
          value: 0,
          impact: 'neutral',
          description: '暂无数据',
        },
        {
          name: '是否有媒体',
          weight: this.featureWeights.hasMedia,
          value: 0,
          impact: 'neutral',
          description: '暂无数据',
        },
        {
          name: '发布时间',
          weight: this.featureWeights.postingTime,
          value: 0,
          impact: 'neutral',
          description: '暂无数据',
        },
        {
          name: '话题热度',
          weight: this.featureWeights.topicHotness,
          value: 0,
          impact: 'neutral',
          description: '暂无数据',
        },
        {
          name: '初始互动',
          weight: this.featureWeights.initialEngagement,
          value: 0,
          impact: 'neutral',
          description: '暂无数据',
        },
      ],
      predictionRange: {
        min: 0,
        max: 0,
        expected: 0,
      },
      similarCases: [],
      recommendations: [],
    };
  }
}
