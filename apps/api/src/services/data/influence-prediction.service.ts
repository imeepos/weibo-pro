import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type { InfluencePredictionAnalysis } from '@sker/sdk';
import { extractFactors, type FeatureWeights } from './influence-prediction.features';
import {
  calculatePredictedReach,
  calculatePredictedReposts,
  calculatePredictedEngagement,
  calculateConfidence,
  getConfidenceLevel,
  calculatePredictionRange,
  findSimilarCases,
  generateRecommendations,
} from './influence-prediction.calculations';
import { getDefaultInfluencePredictionAnalysis } from './influence-prediction.default';

@Injectable({ providedIn: 'root' })
export class InfluencePredictionService {
  // 特征权重
  private readonly featureWeights: FeatureWeights = {
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
        return getDefaultInfluencePredictionAnalysis(this.featureWeights);
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
      return this.calculateInfluencePrediction(postsData, historicalData);
    });
  }

  private calculateInfluencePrediction(
    postsData: any[],
    historicalData: any[] = []
  ): InfluencePredictionAnalysis {
    // 提取当前帖子的特征
    const currentPost = postsData[0];

    // 计算特征值
    const factors = extractFactors(currentPost, postsData, this.featureWeights);

    // 计算预测触达人数
    const predictedReach = calculatePredictedReach(factors);

    // 计算预测转发数
    const predictedReposts = calculatePredictedReposts(predictedReach, factors);

    // 计算预测互动量
    const predictedEngagement = calculatePredictedEngagement(predictedReach, factors);

    // 计算置信度
    const confidence = calculateConfidence(postsData, historicalData);

    // 确定置信度等级
    const confidenceLevel = getConfidenceLevel(confidence);

    // 计算预测区间
    const predictionRange = calculatePredictionRange(predictedReach, confidence);

    // 查找相似案例
    const similarCases = findSimilarCases(currentPost, historicalData);

    // 生成建议
    const recommendations = generateRecommendations(factors, confidence);

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
}
