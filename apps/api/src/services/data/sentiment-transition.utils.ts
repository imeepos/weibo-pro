import type { SentimentTimePoint } from '@sker/sdk';
import { SENTIMENT_TRANSITION_CONFIG } from './events/sentiment-transition-constants';

type SentimentType = 'positive' | 'negative' | 'neutral';

/**
 * 判断主导情感（支持中性情感）
 */
export function getDominantSentiment(positive: number, negative: number, neutral: number): SentimentType {
  const max = Math.max(positive, negative, neutral);
  if (max === positive) return 'positive';
  if (max === negative) return 'negative';
  return 'neutral';
}

/**
 * 获取窗口数据（支持不同边界策略）
 */
export function getWindow(
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
export function calculateWindowAverage(window: SentimentTimePoint[]): {
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
export function calculateChangeRate(
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
 * 计算置信度（sigmoid 函数映射到 0-1，变化率越大置信度越高）
 */
export function calculateConfidence(changeRate: number, threshold: number): number {
  const normalized = (changeRate - threshold) / threshold;
  return 1 / (1 + Math.exp(-normalized));
}

/**
 * 获取分析的时间点数量
 */
export function getAnalyzedPointsCount(timeline: SentimentTimePoint[]): number {
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
export function getSkippedPointsCount(timeline: SentimentTimePoint[]): number {
  const windowSize = SENTIMENT_TRANSITION_CONFIG.WINDOW_SIZE;
  const strategy = SENTIMENT_TRANSITION_CONFIG.BOUNDARY_STRATEGY;

  if (strategy === 'skip') {
    return Math.min(2 * windowSize, timeline.length);
  }

  return 0;
}
