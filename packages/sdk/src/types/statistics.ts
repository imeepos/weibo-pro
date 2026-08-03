/**
 * 事件统计数据汇总与用户参与度分层类型
 */

// 小时级统计数据汇总（用于顶部指标卡）
export interface EventHourlySummary {
  totalHours: number
  avgPostCount: number
  avgUserCount: number
  avgHotness: number
  peakHour: string
  peakHotness: number
}

// 多指标趋势数据
export interface MultiMetricTrendData {
  timestamp: string
  metrics: {
    posts: number
    users: number
    hotness: number
    engagement: number
  }
  sentiment: {
    positive: number
    negative: number
    neutral: number
  }
}

// 互动指标分解数据
export interface EngagementBreakdown {
  timestamp: string
  comments: number
  reposts: number
  likes: number
  total: number
  rate: number
}

// KOL 影响力分布数据
export interface KOLData {
  userId: string
  screenName: string
  influenceScore: number
  followers: number
  engagementRate: number
  sentimentImpact: number
}

export interface KOLAnalysisResult {
  topKOLs: KOLData[]
  kolContributionRatio: number
  paretoIndex: number
}

// 用户参与度分层数据
export interface UserStratificationLayer {
  name: 'core' | 'active' | 'casual' | 'lurker'
  count: number
  percentage: number
  avgEngagement: number
  color: string
}

export interface UserStratificationSummary {
  coreRatio: number
  activeRatio: number
  paretoIndex: number
}

export interface UserStratification {
  layers: UserStratificationLayer[]
  engagementGini: number
  totalUsers: number
  summary: UserStratificationSummary
}
