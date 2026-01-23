/**
 * 情感转变分析配置常量
 *
 * 支持通过环境变量覆盖默认值：
 * - SENTIMENT_WINDOW_SIZE: 滑动窗口大小
 * - SENTIMENT_CHANGE_THRESHOLD: 变化率阈值
 * - SENTIMENT_CALC_METHOD: 计算方法
 * - SENTIMENT_BOUNDARY_STRATEGY: 边界策略
 * - LLM_MODEL: LLM 模型
 * - LLM_MAX_TOKENS: 最大 token 数
 */

export const SENTIMENT_TRANSITION_CONFIG = {
  // 滑动窗口大小（可通过环境变量覆盖）
  WINDOW_SIZE: parseInt(process.env.SENTIMENT_WINDOW_SIZE || '3', 10),

  // 变化率阈值（可通过环境变量覆盖）
  CHANGE_RATE_THRESHOLD: parseFloat(process.env.SENTIMENT_CHANGE_THRESHOLD || '0.5'),

  // 计算方法：'positive_only' | 'comprehensive'
  CALCULATION_METHOD: (process.env.SENTIMENT_CALC_METHOD || 'comprehensive') as 'positive_only' | 'comprehensive',

  // 边界策略：'skip' | 'partial'
  BOUNDARY_STRATEGY: (process.env.SENTIMENT_BOUNDARY_STRATEGY || 'partial') as 'skip' | 'partial',

  // LLM 配置
  LLM_MODEL: process.env.LLM_MODEL || 'claude-sonnet-4-5',
  LLM_MAX_TOKENS: parseInt(process.env.LLM_MAX_TOKENS || '1000', 10),

  // 提取数量限制
  MAX_TRIGGER_KEYWORDS: 10,
  MAX_TRIGGER_POSTS: 5,
} as const;

/**
 * 验证配置有效性
 */
export function validateSentimentTransitionConfig(): void {
  if (SENTIMENT_TRANSITION_CONFIG.WINDOW_SIZE < 1) {
    throw new Error('SENTIMENT_WINDOW_SIZE must be >= 1');
  }

  if (SENTIMENT_TRANSITION_CONFIG.CHANGE_RATE_THRESHOLD < 0 || SENTIMENT_TRANSITION_CONFIG.CHANGE_RATE_THRESHOLD > 1) {
    throw new Error('SENTIMENT_CHANGE_THRESHOLD must be between 0 and 1');
  }

  if (!['positive_only', 'comprehensive'].includes(SENTIMENT_TRANSITION_CONFIG.CALCULATION_METHOD)) {
    throw new Error('SENTIMENT_CALC_METHOD must be "positive_only" or "comprehensive"');
  }

  if (!['skip', 'partial'].includes(SENTIMENT_TRANSITION_CONFIG.BOUNDARY_STRATEGY)) {
    throw new Error('SENTIMENT_BOUNDARY_STRATEGY must be "skip" or "partial"');
  }
}

// 启动时验证配置
validateSentimentTransitionConfig();
