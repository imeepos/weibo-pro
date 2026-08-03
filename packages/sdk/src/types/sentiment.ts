/**
 * 情感分析相关类型
 */

export interface SentimentRealTimeData {
  timestamp: string
  positive: number
  negative: number
  neutral: number
  total: number
  trend: {
    positive: 'up' | 'down' | 'stable'
    negative: 'up' | 'down' | 'stable'
    neutral: 'up' | 'down' | 'stable'
  }
}

export interface SentimentStatistics {
  totalAnalyzed: number
  positive: {
    count: number
    percentage: number
    avgScore: number
  }
  negative: {
    count: number
    percentage: number
    avgScore: number
  }
  neutral: {
    count: number
    percentage: number
    avgScore: number
  }
  overallScore: number
  confidenceLevel: number
}

export interface HotTopicItem {
  id: string
  topic: string
  sentiment: 'positive' | 'negative' | 'neutral'
  heat: number
  posts: number
  users: number
}

export interface SentimentTimeSeriesItem {
  timestamp: string
  positive: number
  negative: number
  neutral: number
  total: number
}

export interface SentimentLocationData {
  region: string
  positive: number
  negative: number
  neutral: number
  total: number
}

export interface RecentPost {
  id: string
  content: string
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
  author: string
  likes: number
  comments: number
  timestamp: string
}

export interface SearchResult {
  keyword: string
  totalResults: number
  sentimentDistribution: {
    positive: number
    negative: number
    neutral: number
  }
  posts: Array<{
    id: string
    content: string
    sentiment: 'positive' | 'negative' | 'neutral'
    confidence: number
    author: string
    timestamp: string
  }>
}

/**
 * 情感极化指数数据
 * 用于衡量舆论的分裂程度
 */
export interface SentimentPolarization {
  /** 极化指数 (0-1, 越高越极化) */
  polarizationIndex: number
  /** 双峰系数 */
  bimodalityCoefficient: number
  /** 极端情感占比 (0-1) */
  extremeRatio: number
  /** 中性情感占比 (0-1) */
  neutralRatio: number
  /** 情感方差 */
  sentimentVariance: number
  /** 情感标准差 */
  sentimentStdDev: number
  /** 情感分布 */
  distribution: {
    positive: number
    negative: number
    neutral: number
    total: number
  }
  /** 极化等级描述 */
  polarizationLevel: string
  /** 极化等级对应的颜色 */
  polarizationColor: string
}
