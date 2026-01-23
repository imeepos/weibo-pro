import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type { SentimentTransitionAnalysis, SentimentTimePoint, TransitionMatrix, TurningPoint } from '@sker/sdk';
import { PostNLPResultEntity } from '@sker/entities';
import { SentimentTransitionLLMAnalyzerService } from './sentiment-transition-llm-analyzer.service';
import { SENTIMENT_TRANSITION_CONFIG } from './events/sentiment-transition-constants';

type SentimentType = 'positive' | 'negative' | 'neutral';

@Injectable({ providedIn: 'root' })
export class SentimentTransitionService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService,
    @Inject(SentimentTransitionLLMAnalyzerService) private readonly llmAnalyzer: SentimentTransitionLLMAnalyzerService
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
          timestamp: hour.hour instanceof Date ? hour.hour.toISOString() : String(hour.hour),
          positive,
          negative,
          neutral,
          dominantSentiment,
          volatility,
        };
      });

      // 计算转变矩阵
      const transitionMatrix = this.calculateTransitionMatrix(timeline);

      // 检测转折点（使用增强版本）
      const turningPoints = await this.detectTurningPointsEnhanced(timeline, hourlyData, eventId);

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
        metadata: {
          totalTimePoints: timeline.length,
          analyzedTimePoints: this.getAnalyzedPointsCount(timeline),
          skippedBoundaryPoints: this.getSkippedPointsCount(timeline),
          calculationMethod: SENTIMENT_TRANSITION_CONFIG.CALCULATION_METHOD,
        },
      };
    });
  }

  private getDominantSentiment(positive: number, negative: number, neutral: number): SentimentType {
    const max = Math.max(positive, negative, neutral);
    if (max === positive) return 'positive';
    if (max === negative) return 'negative';
    return 'neutral';
  }

  /**
   * 改进的情感判断（支持中性情感）
   */
  private getDominantSentimentInWindow(
    positive: number,
    negative: number,
    neutral: number
  ): SentimentType {
    const max = Math.max(positive, negative, neutral);
    if (max === positive) return 'positive';
    if (max === negative) return 'negative';
    return 'neutral';
  }

  /**
   * 获取窗口数据（支持不同边界策略）
   */
  private getWindow(
    timeline: SentimentTimePoint[],
    index: number,
    windowSize: number
  ): {
    before: SentimentTimePoint[];
    after: SentimentTimePoint[];
    shouldSkip: boolean;
  } {
    const strategy = SENTIMENT_TRANSITION_CONFIG.BOUNDARY_STRATEGY;

    if (strategy === 'skip') {
      // 原有逻辑：跳过边界
      if (index < windowSize || index >= timeline.length - windowSize) {
        return { before: [], after: [], shouldSkip: true };
      }
      return {
        before: timeline.slice(index - windowSize, index),
        after: timeline.slice(index + 1, index + 1 + windowSize),
        shouldSkip: false,
      };
    }

    // partial 策略：使用可用的数据点
    const before = timeline.slice(Math.max(0, index - windowSize), index);
    const after = timeline.slice(
      index + 1,
      Math.min(timeline.length, index + 1 + windowSize)
    );

    return {
      before,
      after,
      shouldSkip: before.length === 0 || after.length === 0,
    };
  }

  /**
   * 计算窗口平均值
   */
  private calculateWindowAverage(window: SentimentTimePoint[]): {
    positive: number;
    negative: number;
    neutral: number;
  } {
    if (window.length === 0) {
      return { positive: 0, negative: 0, neutral: 0 };
    }

    const sum = window.reduce(
      (acc, point) => ({
        positive: acc.positive + point.positive,
        negative: acc.negative + point.negative,
        neutral: acc.neutral + point.neutral,
      }),
      { positive: 0, negative: 0, neutral: 0 }
    );

    return {
      positive: sum.positive / window.length,
      negative: sum.negative / window.length,
      neutral: sum.neutral / window.length,
    };
  }

  /**
   * 计算情感变化率（支持多种计算方法）
   */
  private calculateChangeRate(
    before: { positive: number; negative: number; neutral: number },
    after: { positive: number; negative: number; neutral: number }
  ): number {
    const method = SENTIMENT_TRANSITION_CONFIG.CALCULATION_METHOD;

    if (method === 'positive_only') {
      // 原有逻辑：仅基于正面情感（向后兼容）
      return Math.abs(after.positive - before.positive) / (before.positive || 1);
    }

    // comprehensive 方法：欧氏距离
    const totalBefore = before.positive + before.negative + before.neutral;
    const totalAfter = after.positive + after.negative + after.neutral;

    if (totalBefore === 0 || totalAfter === 0) return 0;

    const beforeRatio = {
      positive: before.positive / totalBefore,
      negative: before.negative / totalBefore,
      neutral: before.neutral / totalBefore,
    };

    const afterRatio = {
      positive: after.positive / totalAfter,
      negative: after.negative / totalAfter,
      neutral: after.neutral / totalAfter,
    };

    // 欧氏距离
    return Math.sqrt(
      Math.pow(afterRatio.positive - beforeRatio.positive, 2) +
      Math.pow(afterRatio.negative - beforeRatio.negative, 2) +
      Math.pow(afterRatio.neutral - beforeRatio.neutral, 2)
    );
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(changeRate: number, threshold: number): number {
    // 变化率越大，置信度越高
    // 使用 sigmoid 函数映射到 0-1
    const normalized = (changeRate - threshold) / threshold;
    return 1 / (1 + Math.exp(-normalized));
  }

  /**
   * 增强的转折点检测算法
   */
  private async detectTurningPointsEnhanced(
    timeline: SentimentTimePoint[],
    rawData: any[],
    eventId: string
  ): Promise<TurningPoint[]> {
    const turningPoints: TurningPoint[] = [];
    const windowSize = SENTIMENT_TRANSITION_CONFIG.WINDOW_SIZE;
    const threshold = SENTIMENT_TRANSITION_CONFIG.CHANGE_RATE_THRESHOLD;

    for (let i = 0; i < timeline.length; i++) {
      const { before, after, shouldSkip } = this.getWindow(timeline, i, windowSize);
      if (shouldSkip) continue;

      const current = timeline[i];
      const avgBefore = this.calculateWindowAverage(before);
      const avgAfter = this.calculateWindowAverage(after);

      // 使用配置的计算方法
      const changeRate = this.calculateChangeRate(avgBefore, avgAfter);

      if (changeRate > threshold) {
        const fromSentiment = this.getDominantSentimentInWindow(
          avgBefore.positive,
          avgBefore.negative,
          avgBefore.neutral
        );
        const toSentiment = this.getDominantSentimentInWindow(
          avgAfter.positive,
          avgAfter.negative,
          avgAfter.neutral
        );

        // 只有情感类型改变时才记录
        if (fromSentiment !== toSentiment) {
          // 使用 LLM 提取关键词和触发帖子
          const analysis = await this.llmAnalyzer.analyzeTurningPoint(
            eventId,
            {
              timestamp: typeof current.timestamp === 'string' ? current.timestamp : String(current.timestamp),
              fromSentiment,
              toSentiment,
            },
            windowSize
          );

          turningPoints.push({
            timestamp: typeof current.timestamp === 'string' ? current.timestamp : String(current.timestamp),
            fromSentiment,
            toSentiment,
            magnitude: changeRate,
            triggerKeywords: analysis.triggerKeywords,
            triggerPosts: analysis.triggerPosts,
            confidence: this.calculateConfidence(changeRate, threshold),
            sentimentDistribution: {
              before: avgBefore,
              after: avgAfter,
            },
          });
        }
      }
    }

    return turningPoints;
  }

  /**
   * 获取分析的时间点数量
   */
  private getAnalyzedPointsCount(timeline: SentimentTimePoint[]): number {
    const windowSize = SENTIMENT_TRANSITION_CONFIG.WINDOW_SIZE;
    const strategy = SENTIMENT_TRANSITION_CONFIG.BOUNDARY_STRATEGY;

    if (strategy === 'skip') {
      return Math.max(0, timeline.length - 2 * windowSize);
    }

    // partial 策略分析所有点
    return timeline.length;
  }

  /**
   * 获取跳过的边界点数量
   */
  private getSkippedPointsCount(timeline: SentimentTimePoint[]): number {
    const windowSize = SENTIMENT_TRANSITION_CONFIG.WINDOW_SIZE;
    const strategy = SENTIMENT_TRANSITION_CONFIG.BOUNDARY_STRATEGY;

    if (strategy === 'skip') {
      return Math.min(2 * windowSize, timeline.length);
    }

    return 0;
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
    // 已被 detectTurningPointsEnhanced 替代，保留用于向后兼容
    console.warn('detectTurningPoints is deprecated, use detectTurningPointsEnhanced instead');
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
            timestamp: typeof current.timestamp === 'string' ? current.timestamp : String(current.timestamp),
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
