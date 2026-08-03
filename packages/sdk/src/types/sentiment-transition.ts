/**
 * 情感转变追踪相关类型
 */
export type SentimentType = 'positive' | 'negative' | 'neutral'

export interface SentimentTimePoint {
  timestamp: string
  positive: number
  negative: number
  neutral: number
  dominantSentiment: SentimentType
  volatility: number
}

export interface TransitionMatrix {
  positiveToPositive: number
  positiveToNegative: number
  positiveToNeutral: number
  negativeToPositive: number
  negativeToNegative: number
  negativeToNeutral: number
  neutralToPositive: number
  neutralToNegative: number
  neutralToNeutral: number
}

export interface TurningPoint {
  timestamp: string
  fromSentiment: SentimentType
  toSentiment: SentimentType
  magnitude: number
  triggerKeywords: string[]
  triggerPosts: string[]
  confidence?: number
  sentimentDistribution?: {
    before: { positive: number; negative: number; neutral: number }
    after: { positive: number; negative: number; neutral: number }
  }
}

export interface SentimentTransitionAnalysis {
  timeline: SentimentTimePoint[]
  transitionMatrix: TransitionMatrix
  turningPoints: TurningPoint[]
  stabilityIndex: number
  polarizationIndex: number
  metadata?: {
    totalTimePoints: number
    analyzedTimePoints: number
    skippedBoundaryPoints: number
    calculationMethod: string
  }
}
