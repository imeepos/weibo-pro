/**
 * 影响力预测相关类型
 */
export interface InfluenceFactor {
  name: string
  weight: number
  value: number
  impact: 'positive' | 'negative' | 'neutral'
  description: string
}

export interface PredictionRange {
  min: number
  max: number
  expected: number
}

export interface SimilarCase {
  postId: string
  similarity: number
  actualReach: number
  actualReposts: number
  actualEngagement: number
}

export interface InfluencePredictionAnalysis {
  predictedReach: number
  predictedReposts: number
  predictedEngagement: number
  confidence: number
  confidenceLevel: 'high' | 'medium' | 'low'
  factors: InfluenceFactor[]
  predictionRange: PredictionRange
  similarCases: SimilarCase[]
  recommendations: string[]
}
