/**
 * 事件 NLP 深度分析类型
 *
 * 事件的情感、关键词、异常检测、峰值识别、里程碑、机构账号、话题、观点、
 * 用户情感与异常用户风险等扩展分析类型。
 */

// 新增：事件 NLP 深度分析类型
export interface EventSentimentHotness {
  postId: string
  sentimentScore: number // -1 到 1，负数负面，正数正面
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

// 互动指标趋势数据（基于 EventHourlyStatisticsEntity）
export interface EventEngagementTrend {
  timestamp: string
  post_count: number
  comment_count: number
  repost_count: number
  like_count: number
  user_count: number
  hotness: number
  engagement_rate: number // 互动率：(comment + repost + like) / post
}

// 异常检测数据
export interface EventAnomaly {
  timestamp: string
  type: 'spike' | 'drop' | 'sentiment_shift'
  metric: string
  value: number
  expected: number
  confidence: number
}

// 峰值识别数据
export interface EventPeak {
  timestamp: string
  hotness: number
  peak_type: 'global' | 'local'
  metrics: {
    post_count: number
    user_count: number
    engagement_rate: number
  }
}

export interface EventMilestone {
  timestamp: string
  type: 'heat_spike' | 'sentiment_turn' | 'propagation_peak' | 'official_response' | 'discussion_shift'
  title: string
  summary: string
  confidence: number
  metrics: {
    hotness?: number
    postCount?: number
    userCount?: number
    sentimentShift?: number
  }
  representativePosts: Array<{
    postId: string
    author: string
    excerpt: string
    engagement: number
  }>
}

export interface EventInstitutionAccount {
  userId: string
  screenName: string
  avatar?: string
  institutionType: 'government' | 'state_media' | 'enterprise_org' | 'official_other'
  verified: boolean
  verifiedType?: string
  postCount: number
  interactionCount: number
  influenceScore: number
  sentimentTilt: 'positive' | 'negative' | 'neutral'
}

export interface EventTopicOverview {
  topTopics: Array<{
    title: string
    count: number
    sentiment: string
    trend: 'up' | 'down' | 'stable'
  }>
  timeSeries: EventKeywordTimeSeries[]
}

export interface EventOpinionRepresentativePost {
  postId: string
  author: string
  excerpt: string
  sentiment: 'positive' | 'negative' | 'neutral'
  engagement: number
}

export interface EventOpinionCluster {
  id: string
  label: string
  stance: 'supportive' | 'critical' | 'neutral'
  summary: string
  postCount: number
  userCount: number
  keywords: string[]
  representativePosts: EventOpinionRepresentativePost[]
}

export interface EventEmotionMapItem {
  label: string
  weight: number
}

export interface EventUserEmotionInsight {
  userId: string
  screenName: string
  postCount: number
  emotionTilt: 'positive' | 'negative' | 'neutral'
  summary: string
}

export interface EventSentimentTrendDetailedPoint {
  timestamp: string
  positive: number
  negative: number
  neutral: number
}

export interface EventUserAbnormalSignal {
  type:
    | 'night_activity'
    | 'regular_interval'
    | 'burst_posting'
    | 'high_similarity'
    | 'extreme_sentiment'
    | 'low_interaction'
    | 'single_device'
  severity: 'low' | 'medium' | 'high'
  description: string
  value: number | string | Record<string, unknown>
}

export interface EventAbnormalUser {
  userId: string
  screenName: string
  followers: number
  verified: boolean
  location: string
  postCount: number
  riskLevel: 'low' | 'medium' | 'high'
  riskScore: number
  confidence: number
  isAbnormal: boolean
  accountType: 'bot' | 'troll' | 'zombie' | 'suspicious' | 'normal'
  lastActive: string
  summary: string
  abnormalSignals: EventUserAbnormalSignal[]
}

export interface EventUserRiskProfile {
  totalUsers: number
  activeUsers: number
  abnormalUserCount: number
  averageRiskScore: number
  riskDistribution: {
    low: number
    medium: number
    high: number
  }
  topSignals: Array<{
    type: EventUserAbnormalSignal['type']
    label: string
    count: number
  }>
  topRiskUsers: Array<{
    userId: string
    screenName: string
    riskLevel: 'low' | 'medium' | 'high'
    riskScore: number
  }>
}
