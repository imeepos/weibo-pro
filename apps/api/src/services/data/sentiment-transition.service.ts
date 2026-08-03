import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type { SentimentTransitionAnalysis, SentimentTimePoint, TurningPoint } from '@sker/sdk';
import { PostNLPResultEntity } from '@sker/entities';
import { SentimentTransitionLLMAnalyzerService } from './sentiment-transition-llm-analyzer.service';
import { SENTIMENT_TRANSITION_CONFIG } from './events/sentiment-transition-constants';
import { getDominantSentiment, getAnalyzedPointsCount, getSkippedPointsCount } from './sentiment-transition.utils';
import { calculateTransitionMatrix, calculateStabilityIndex, calculatePolarizationIndex } from './sentiment-transition.matrix';
import { detectTurningPointsEnhanced } from './sentiment-transition.turning-points';
import { getDefaultSentimentTransitionAnalysis } from './sentiment-transition.default';

@Injectable({ providedIn: 'root' })
export class SentimentTransitionService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService,
    @Inject(SentimentTransitionLLMAnalyzerService) private readonly llmAnalyzer: SentimentTransitionLLMAnalyzerService
  ) { }

  async getSentimentTransitionAnalysis(eventId: string): Promise<SentimentTransitionAnalysis> {
    const cacheKey = CacheService.buildKey('sentiment:transition', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchSentimentTransitionAnalysis(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchSentimentTransitionAnalysis(eventId: string): Promise<SentimentTransitionAnalysis> {
    return useEntityManager(async (manager) => {
      // 按小时聚合情感数据
      const hourlyData = await manager
        .getRepository(PostNLPResultEntity)
        .createQueryBuilder('nlp')
        .select("DATE_TRUNC('hour', post.created_at)", 'hour')
        .addSelect('SUM(CASE WHEN nlp.sentiment->>\'overall\' = \'positive\' THEN 1 ELSE 0 END)', 'positive')
        .addSelect('SUM(CASE WHEN nlp.sentiment->>\'overall\' = \'negative\' THEN 1 ELSE 0 END)', 'negative')
        .addSelect('SUM(CASE WHEN nlp.sentiment->>\'overall\' = \'neutral\' THEN 1 ELSE 0 END)', 'neutral')
        .innerJoin('nlp.post', 'post')
        .where('nlp.event_id = :eventId', { eventId })
        .groupBy("DATE_TRUNC('hour', post.created_at)")
        .orderBy('hour', 'ASC')
        .getRawMany();

      if (hourlyData.length === 0) {
        return getDefaultSentimentTransitionAnalysis();
      }

      // 构建时间线数据
      const timeline: SentimentTimePoint[] = hourlyData.map((hour) => {
        const positive = parseInt(hour.positive) || 0;
        const negative = parseInt(hour.negative) || 0;
        const neutral = parseInt(hour.neutral) || 0;
        const total = positive + negative + neutral;

        const dominantSentiment = getDominantSentiment(positive, negative, neutral);
        const volatility = total > 0 ? Math.max(positive, negative, neutral) / total : 0;

        return {
          timestamp: hour.hour instanceof Date ? hour.hour.toISOString() : String(hour.hour),
          positive,
          negative,
          neutral,
          dominantSentiment,
          volatility,
        };
      });

      // 计算转变矩阵
      const transitionMatrix = calculateTransitionMatrix(timeline);

      // 检测转折点（使用增强版本）
      const turningPoints: TurningPoint[] = await detectTurningPointsEnhanced(
        timeline,
        hourlyData,
        eventId,
        this.llmAnalyzer
      );

      // 计算稳定性指数
      const stabilityIndex = calculateStabilityIndex(timeline);

      // 计算极化指数
      const polarizationIndex = calculatePolarizationIndex(timeline);

      return {
        timeline,
        transitionMatrix,
        turningPoints,
        stabilityIndex,
        polarizationIndex,
        metadata: {
          totalTimePoints: timeline.length,
          analyzedTimePoints: getAnalyzedPointsCount(timeline),
          skippedBoundaryPoints: getSkippedPointsCount(timeline),
          calculationMethod: SENTIMENT_TRANSITION_CONFIG.CALCULATION_METHOD,
        },
      };
    });
  }
}
