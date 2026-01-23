/**
 * 情感极化指数计算工具函数
 *
 * 用于衡量舆论的分裂程度，包括：
 * - 极化指数 (Polarization Index): 0-1，越高越极化
 * - 双峰系数 (Bimodality Coefficient): 衡量分布是否呈现双峰特征
 * - 极端情感占比 (Extreme Ratio): 极端情感（正面+负面）的比例
 * - 情感方差 (Sentiment Variance): 情感分布的方差
 */

/**
 * 情感极化指数结果
 */
export interface SentimentPolarizationResult {
  /** 极化指数 (0-1, 越高越极化) */
  polarizationIndex: number;
  /** 双峰系数 */
  bimodalityCoefficient: number;
  /** 极端情感占比 (0-1) */
  extremeRatio: number;
  /** 中性情感占比 (0-1) */
  neutralRatio: number;
  /** 情感方差 */
  sentimentVariance: number;
  /** 情感标准差 */
  sentimentStdDev: number;
  /** 情感分布 */
  distribution: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  };
}

/**
 * 计算情感极化指数
 *
 * 算法公式：
 * polarizationIndex = 1 - 4 * neutral * (positive + negative) / (positive + negative + neutral)^2
 *
 * 该公式的含义：
 * - 当中性情感为0时，完全极化，指数为1
 * - 当正负情感比例相等且中性为0时，指数为1
 * - 当所有情感都为中性时，完全不极化，指数为0
 * - 当正负情感比例不等时，极化程度会降低
 *
 * @param positiveCount 正面情感数量
 * @param negativeCount 负面情感数量
 * @param neutralCount 中性情感数量
 * @returns 情感极化指数结果
 */
export function calculateSentimentPolarization(
  positiveCount: number,
  negativeCount: number,
  neutralCount: number
): SentimentPolarizationResult {
  const total = positiveCount + negativeCount + neutralCount;

  // 处理边界情况：总数为0
  if (total === 0) {
    return {
      polarizationIndex: 0,
      bimodalityCoefficient: 0,
      extremeRatio: 0,
      neutralRatio: 0,
      sentimentVariance: 0,
      sentimentStdDev: 0,
      distribution: {
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0,
      },
    };
  }

  // 计算情感比例
  const positiveRatio = positiveCount / total;
  const negativeRatio = negativeCount / total;
  const neutralRatio = neutralCount / total;

  // 计算极化指数（改进的算法）
  // 核心思想：
  // 1. 当正负情感平衡时，极化程度最高
  // 2. 当中性情感占主导时，极化程度低
  // 3. 当正负情感不平衡时，极化程度降低
  //
  // 公式组成部分：
  // - balanceFactor: 衡量正负情感的平衡度 (0-1)，越接近0.5越平衡
  // - intensityFactor: 衡量极端情感的强度 (0-1)，中性越少强度越高
  // - polarizationIndex = balanceFactor * intensityFactor

  // 平衡因子：正负情感比例的平衡程度
  // 当 positive = negative 时，balance = 1
  // 当其中一个为0时，balance = 0
  const balanceFactor = 1 - Math.abs(positiveRatio - negativeRatio) / (positiveRatio + negativeRatio + 0.0001);

  // 强度因子：极端情感的占比
  // 当中性为0时，intensity = 1
  // 当中性占比很高时，intensity接近0
  const intensityFactor = 1 - neutralRatio;

  // 极化指数 = 平衡因子 * 强度因子
  const polarizationIndex = Math.max(0, Math.min(1, balanceFactor * intensityFactor));

  // 计算双峰系数
  // 使用 Pearson's 双峰系数公式的一个简化版本
  // 当分布呈现明显的双峰特征（正负情感都很高）时，系数接近1
  const skewness = Math.abs(positiveRatio - negativeRatio);
  const kurtosis = (positiveRatio * positiveRatio + negativeRatio * negativeRatio + neutralRatio * neutralRatio);
  const bimodalityCoefficient = (skewness * skewness + 1) / (kurtosis + 1); // 简化版本

  // 计算极端情感占比（正面 + 负面）
  const extremeRatio = positiveRatio + negativeRatio;

  // 计算情感方差
  // 将情感映射到数值：正面=1, 中性=0, 负面=-1
  const meanSentiment = positiveRatio * 1 + neutralRatio * 0 + negativeRatio * -1;
  const variance =
    positiveRatio * Math.pow(1 - meanSentiment, 2) +
    neutralRatio * Math.pow(0 - meanSentiment, 2) +
    negativeRatio * Math.pow(-1 - meanSentiment, 2);

  const sentimentVariance = variance;
  const sentimentStdDev = Math.sqrt(variance);

  return {
    polarizationIndex: Number(polarizationIndex.toFixed(4)),
    bimodalityCoefficient: Number(bimodalityCoefficient.toFixed(4)),
    extremeRatio: Number(extremeRatio.toFixed(4)),
    neutralRatio: Number(neutralRatio.toFixed(4)),
    sentimentVariance: Number(sentimentVariance.toFixed(4)),
    sentimentStdDev: Number(sentimentStdDev.toFixed(4)),
    distribution: {
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount,
      total,
    },
  };
}

/**
 * 判断极化程度等级
 * @param polarizationIndex 极化指数 (0-1)
 * @returns 极化等级描述
 */
export function getPolarizationLevel(polarizationIndex: number): string {
  if (polarizationIndex >= 0.8) return '严重极化';
  if (polarizationIndex >= 0.6) return '高度极化';
  if (polarizationIndex >= 0.4) return '中度极化';
  if (polarizationIndex >= 0.2) return '轻度极化';
  return '无明显极化';
}

/**
 * 获取极化等级对应的颜色
 * @param polarizationIndex 极化指数 (0-1)
 * @returns 颜色值（十六进制）
 */
export function getPolarizationColor(polarizationIndex: number): string {
  if (polarizationIndex >= 0.8) return '#dc2626'; // red-600
  if (polarizationIndex >= 0.6) return '#f97316'; // orange-500
  if (polarizationIndex >= 0.4) return '#eab308'; // yellow-500
  if (polarizationIndex >= 0.2) return '#84cc16'; // lime-500
  return '#22c55e'; // green-500
}
