import type { SentimentTimePoint, TransitionMatrix } from '@sker/sdk';

type SentimentType = 'positive' | 'negative' | 'neutral';

/**
 * 计算情感转变矩阵（按主导情感相邻转移，归一化）
 */
export function calculateTransitionMatrix(timeline: SentimentTimePoint[]): TransitionMatrix {
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
    const from = timeline[i - 1]!.dominantSentiment;
    const to = timeline[i]!.dominantSentiment;
    const key = `${from}To${to.charAt(0).toUpperCase() + to.slice(1)}`;
    transitions.set(key, (transitions.get(key) || 0) + 1);
  }

  // 归一化
  const fromMap = new Map<SentimentType, number>();
  for (const [key, count] of transitions) {
    const from = key.split('To')[0]!.toLowerCase() as SentimentType;
    fromMap.set(from, (fromMap.get(from) || 0) + count);
  }

  for (const [key, count] of transitions) {
    const from = key.split('To')[0]!.toLowerCase() as SentimentType;
    const total = fromMap.get(from) || 1;
    matrix[key as keyof TransitionMatrix] = count / total;
  }

  return matrix;
}

/**
 * 计算稳定性指数（1 - 主导情感变化率）
 */
export function calculateStabilityIndex(timeline: SentimentTimePoint[]): number {
  if (timeline.length < 2) return 1;

  let totalChanges = 0;
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i]!.dominantSentiment !== timeline[i - 1]!.dominantSentiment) {
      totalChanges++;
    }
  }

  const stabilityIndex = 1 - (totalChanges / (timeline.length - 1));
  return Math.max(0, Math.min(1, stabilityIndex));
}

/**
 * 计算极化指数（正负情感占比的平均值）
 */
export function calculatePolarizationIndex(timeline: SentimentTimePoint[]): number {
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
