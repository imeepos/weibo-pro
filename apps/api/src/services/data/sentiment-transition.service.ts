import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type { SentimentTransitionAnalysis, SentimentTimePoint, TransitionMatrix, TurningPoint } from '@sker/sdk';
import { PostNLPResultEntity } from '@sker/entities';

type SentimentType = 'positive' | 'negative' | 'neutral';

@Injectable({ providedIn: 'root' })
export class SentimentTransitionService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

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
        return this.getDefaultSentimentTransitionAnalysis();
      }

      // 构建时间线数据
      const timeline: SentimentTimePoint[] = hourlyData.map((hour) => {
        const positive = parseInt(hour.positive) || 0;
        const negative = parseInt(hour.negative) || 0;
        const neutral = parseInt(hour.neutral) || 0;
        const total = positive + negative + neutral;

        const dominantSentiment = this.getDominantSentiment(positive, negative, neutral);
        const volatility = total > 0 ? Math.max(positive, negative, neutral) / total : 0;

        return {
          timestamp: hour.hour,
          positive,
          negative,
          neutral,
          dominantSentiment,
          volatility,
        };
      });

      // 计算转变矩阵
      const transitionMatrix = this.calculateTransitionMatrix(timeline);

      // 检测转折点
      const turningPoints = this.detectTurningPoints(timeline, hourlyData);

      // 计算稳定性指数
      const stabilityIndex = this.calculateStabilityIndex(timeline);

      // 计算极化指数
      const polarizationIndex = this.calculatePolarizationIndex(timeline);

      return {
        timeline,
        transitionMatrix,
        turningPoints,
        stabilityIndex,
        polarizationIndex,
      };
    });
  }

  private getDominantSentiment(positive: number, negative: number, neutral: number): SentimentType {
    const max = Math.max(positive, negative, neutral);
    if (max === positive) return 'positive';
    if (max === negative) return 'negative';
    return 'neutral';
  }

  private calculateTransitionMatrix(timeline: SentimentTimePoint[]): TransitionMatrix {
    const matrix: TransitionMatrix = {
      positiveToPositive: 0,
      positiveToNegative: 0,
      positiveToNeutral: 0,
      negativeToPositive: 0,
      negativeToNegative: 0,
      negativeToNeutral: 0,
      neutralToPositive: 0,
      neutralToNegative: 0,
      neutralToNeutral: 0,
    };

    if (timeline.length < 2) return matrix;

    const transitions: Map<string, number> = new Map();

    for (let i = 1; i < timeline.length; i++) {
      const from = timeline[i - 1].dominantSentiment;
      const to = timeline[i].dominantSentiment;
      const key = `${from}To${to.charAt(0).toUpperCase() + to.slice(1)}`;
      transitions.set(key, (transitions.get(key) || 0) + 1);
    }

    // 归一化
    const fromMap = new Map<SentimentType, number>();
    for (const [key, count] of transitions) {
      const from = key.split('To')[0].toLowerCase() as SentimentType;
      fromMap.set(from, (fromMap.get(from) || 0) + count);
    }

    for (const [key, count] of transitions) {
      const from = key.split('To')[0].toLowerCase() as SentimentType;
      const total = fromMap.get(from) || 1;
      matrix[key as keyof TransitionMatrix] = count / total;
    }

    return matrix;
  }

  private detectTurningPoints(timeline: SentimentTimePoint[], rawData: any[]): TurningPoint[] {
    const turningPoints: TurningPoint[] = [];
    const windowSize = 3;

    for (let i = windowSize; i < timeline.length - windowSize; i++) {
      const current = timeline[i];
      const before = timeline.slice(i - windowSize, i);
      const after = timeline.slice(i + 1, i + 1 + windowSize);

      const avgBeforePositive = before.reduce((sum, t) => sum + t.positive, 0) / windowSize;
      const avgAfterPositive = after.reduce((sum, t) => sum + t.positive, 0) / windowSize;

      const avgBeforeNegative = before.reduce((sum, t) => sum + t.negative, 0) / windowSize;
      const avgAfterNegative = after.reduce((sum, t) => sum + t.negative, 0) / windowSize;

      const changeRate = Math.abs(avgAfterPositive - avgBeforePositive) / (avgBeforePositive || 1);

      if (changeRate > 0.5) {
        const fromSentiment = avgBeforePositive > avgBeforeNegative ? 'positive' : 'negative';
        const toSentiment = avgAfterPositive > avgAfterNegative ? 'positive' : 'negative';

        if (fromSentiment !== toSentiment) {
          turningPoints.push({
            timestamp: current.timestamp,
            fromSentiment,
            toSentiment,
            magnitude: changeRate,
            triggerKeywords: [],
            triggerPosts: [],
          });
        }
      }
    }

    return turningPoints;
  }

  private calculateStabilityIndex(timeline: SentimentTimePoint[]): number {
    if (timeline.length < 2) return 1;

    let totalChanges = 0;
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i].dominantSentiment !== timeline[i - 1].dominantSentiment) {
        totalChanges++;
      }
    }

    const stabilityIndex = 1 - (totalChanges / (timeline.length - 1));
    return Math.max(0, Math.min(1, stabilityIndex));
  }

  private calculatePolarizationIndex(timeline: SentimentTimePoint[]): number {
    if (timeline.length === 0) return 0;

    let totalPolarization = 0;
    for (const point of timeline) {
      const total = point.positive + point.negative + point.neutral;
      if (total > 0) {
        const extremeRatio = (point.positive + point.negative) / total;
        totalPolarization += extremeRatio;
      }
    }

    return totalPolarization / timeline.length;
  }

  private getDefaultSentimentTransitionAnalysis(): SentimentTransitionAnalysis {
    return {
      timeline: [],
      transitionMatrix: {
        positiveToPositive: 0,
        positiveToNegative: 0,
        positiveToNeutral: 0,
        negativeToPositive: 0,
        negativeToNegative: 0,
        negativeToNeutral: 0,
        neutralToPositive: 0,
        neutralToNegative: 0,
        neutralToNeutral: 0,
      },
      turningPoints: [],
      stabilityIndex: 0,
      polarizationIndex: 0,
    };
  }
}
