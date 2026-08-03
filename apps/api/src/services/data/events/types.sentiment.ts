// NLP 深度分析类型

export interface EventSentimentHotness {
  postId: string
  sentimentScore: number
  hotness: number
  timestamp: string
}

export interface EventSentimentDistribution {
  positive: { count: number; percentage: number }
  negative: { count: number; percentage: number }
  neutral: { count: number; percentage: number }
}

export interface EventSentimentIntensity {
  intensity: number
  count: number
}

export interface EventKeywordTimeSeries {
  keyword: string
  timeData: Array<{
    timestamp: string
    weight: number
  }>
}

export interface EventKeywordBySentiment {
  keyword: string
  weight: number
  sentiment: 'positive' | 'negative' | 'neutral'
  count: number
}

export interface EventNegativeKeywordAlert {
  keyword: string
  weight: number
  count: number
  trend: 'rising' | 'stable' | 'falling'
}

export interface EventEventTypeDistribution {
  eventType: string
  count: number
  confidence: number
  avgSentiment: number
}

export interface EventSentimentTrendDetailedPoint {
  timestamp: string
  positive: number
  negative: number
  neutral: number
}
