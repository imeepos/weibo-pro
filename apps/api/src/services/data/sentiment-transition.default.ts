import type { SentimentTransitionAnalysis } from '@sker/sdk';

/**
 * 无数据时的默认情感转变分析结构
 */
export function getDefaultSentimentTransitionAnalysis(): SentimentTransitionAnalysis {
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
