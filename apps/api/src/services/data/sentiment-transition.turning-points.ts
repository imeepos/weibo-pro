import type { SentimentTimePoint, TurningPoint } from '@sker/sdk';
import { SENTIMENT_TRANSITION_CONFIG } from './events/sentiment-transition-constants';
import {
  getDominantSentiment,
  getWindow,
  calculateWindowAverage,
  calculateChangeRate,
  calculateConfidence,
} from './sentiment-transition.utils';

type SentimentType = 'positive' | 'negative' | 'neutral';

export interface TurningPointAnalyzer {
  analyzeTurningPoint(
    eventId: string,
    context: { timestamp: string; fromSentiment: SentimentType; toSentiment: SentimentType },
    windowSize: number
  ): Promise<{ triggerKeywords: string[]; triggerPosts: string[] }>;
}

/**
 * 增强的转折点检测算法（使用 LLM 提取关键词和触发帖子）
 */
export async function detectTurningPointsEnhanced(
  timeline: SentimentTimePoint[],
  rawData: any[],
  eventId: string,
  llmAnalyzer: TurningPointAnalyzer
): Promise<TurningPoint[]> {
  const turningPoints: TurningPoint[] = [];
  const windowSize = SENTIMENT_TRANSITION_CONFIG.WINDOW_SIZE;
  const threshold = SENTIMENT_TRANSITION_CONFIG.CHANGE_RATE_THRESHOLD;

  for (let i = 0; i < timeline.length; i++) {
    const { before, after, shouldSkip } = getWindow(timeline, i, windowSize);
    if (shouldSkip) continue;

    const current = timeline[i]!;
    const avgBefore = calculateWindowAverage(before);
    const avgAfter = calculateWindowAverage(after);

    // 使用配置的计算方法
    const changeRate = calculateChangeRate(avgBefore, avgAfter);

    if (changeRate > threshold) {
      const fromSentiment = getDominantSentiment(
        avgBefore.positive,
        avgBefore.negative,
        avgBefore.neutral
      );
      const toSentiment = getDominantSentiment(
        avgAfter.positive,
        avgAfter.negative,
        avgAfter.neutral
      );

      // 只有情感类型改变时才记录
      if (fromSentiment !== toSentiment) {
        // 使用 LLM 提取关键词和触发帖子
        const analysis = await llmAnalyzer.analyzeTurningPoint(
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
          confidence: calculateConfidence(changeRate, threshold),
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
 * 旧版转折点检测（已被 detectTurningPointsEnhanced 替代，保留用于向后兼容）
 */
export function detectTurningPoints(timeline: SentimentTimePoint[], _rawData: any[]): TurningPoint[] {
  console.warn('detectTurningPoints is deprecated, use detectTurningPointsEnhanced instead');
  const turningPoints: TurningPoint[] = [];
  const windowSize = 3;

  for (let i = windowSize; i < timeline.length - windowSize; i++) {
    const current = timeline[i]!;
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
