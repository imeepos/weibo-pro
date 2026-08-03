// 基于 EventHourlyStatisticsEntity 的互动指标类型

export interface EventEngagementTrend {
  timestamp: string
  post_count: number
  comment_count: number
  repost_count: number
  like_count: number
  user_count: number
  hotness: number
  engagement_rate: number
}

export interface EventAnomaly {
  timestamp: string
  type: 'spike' | 'drop' | 'sentiment_shift'
  metric: string
  value: number
  expected: number
  confidence: number
}

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
