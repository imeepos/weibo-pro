import { TimeRange } from '@sker/entities'

export interface ChartData {
  categories: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}

export interface AgeDistributionData extends ChartData { }

export interface GenderDistributionData extends ChartData { }

export interface SentimentTrendData extends ChartData { }

export interface GeographicData extends ChartData { }

export interface EventTypeData extends ChartData { }

export interface WordCloudItem {
  keyword: string
  count: number
  sentiment: 'positive' | 'negative' | 'neutral'
  weight: number
}

export interface TimeSeriesData extends ChartData { }

export interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
}
export interface EventListItem {
  id: string;
  title: string;
  description: string;
  postCount: number;
  userCount: number;
  sentiment: SentimentScore;
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  keywords: string[];
  createdAt: string;
  lastUpdate: string;
  trendData: number[];
}


export interface EventCategoryData {
  category: string
  count: number
  percentage: number
}

export interface EventCategoryStats {
  categories: string[]
  counts: number[]
}

export interface TrendData {
  timestamp: string
  eventCount: number
  postCount: number
  userCount: number
}

export interface TrendDataSeries {
  categories: string[]
  series: Array<{
    name: string
    data: number[]
  }>
}

export interface TrendAnalysis {
  timeline: string[]
  postVolume: number[]
  sentimentScores: number[]
  userEngagement: number[]
  hotnessData: number[]
}

export interface HotListItem {
  id: string
  title: string
  heat: number
  posts: number
  users: number
  sentiment: 'positive' | 'negative' | 'neutral'
  trend: 'rising' | 'stable' | 'falling'
}
export type { HotEvent } from '@sker/entities'

export interface GeographicDistribution {
  region: string
  count: number
  percentage: number
  posts: number
  sentiment: number
}

export interface EventTimelineNode {
  time: string;
  event: string;
  type: 'start' | 'peak' | 'decline' | 'key_event' | 'milestone';
  impact: number;
  description: string;
  metrics: {
    posts: number;
    users: number;
    sentiment: number;
  };
}

export interface EventPropagationPath {
  userType: string;
  userCount: number;
  postCount: number;
  influence: number;
}

export interface EventKeyNode {
  time: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  metrics: {
    posts: number;
    users: number;
    sentiment: number;
  };
}

export interface EventDevelopmentPhase {
  phase: string;
  timeRange: string;
  description: string;
  keyEvents: string[];
  keyTasks: string[];
  keyMeasures: string[];
  metrics: {
    hotness: number;
    posts: number;
    users: number;
    sentiment: number;
  };
  status: 'completed' | 'ongoing' | 'planned';
}

export interface EventDevelopmentPattern {
  outbreakSpeed: string;
  propagationScope: string;
  duration: string;
  impactDepth: string;
}

export interface EventSuccessFactor {
  title: string;
  description: string;
}

export interface EventDetail {
  id: string;
  title: string;
  description: string;
  postCount: number;
  userCount: number;
  sentiment: SentimentScore;
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  keywords: string[];
  createdAt: string;
  lastUpdate: string;
  timeline: EventTimelineNode[];
  propagationPath: EventPropagationPath[];
  keyNodes: EventKeyNode[];
  developmentPhases: EventDevelopmentPhase[];
  developmentPattern: EventDevelopmentPattern;
  successFactors: EventSuccessFactor[];
}

export interface InfluenceUser {
  userId: string;
  username: string;
  influence: number;
  postCount: number;
  followers: number;
  interactionCount: number;
  sentimentScore: number;
}

// 关键词相关类型
export interface KeywordWordCloudItem {
  keyword: string
  weight: number
  sentiment?: 'positive' | 'negative' | 'neutral'
}

// 布局相关类型
export interface LayoutConfiguration {
  id: string
  name: string
  type: 'bigscreen' | 'frontend' | 'admin'
  layout: Record<string, any>
  metadata: Record<string, any> | null
  isDefault: boolean
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateLayoutPayload {
  name: string
  type: 'bigscreen' | 'frontend' | 'admin'
  layout: Record<string, any>
  metadata?: Record<string, any>
  description?: string
}

export interface UpdateLayoutPayload {
  name?: string
  layout?: Record<string, any>
  metadata?: Record<string, any>
  description?: string
}

// 概览相关类型
export interface OverviewStatisticsData {
  eventCount: number
  eventCountChange: number
  postCount: number
  postCountChange: number
  userCount: number
  userCountChange: number
  interactionCount: number
  interactionCountChange: number
}

export interface OverviewSentiment {
  positive: number
  negative: number
  neutral: number
  total: number
  positivePercentage: number
  negativePercentage: number
  neutralPercentage: number
  trend: 'rising' | 'stable' | 'falling'
  avgScore: number
}

export interface OverviewLocation {
  region: string;
  province?: string;
  city?: string;
  count: number;
  percentage: number;
  coordinates?: [number, number];
  trend: 'up' | 'down' | 'stable';
}

// 情感分析相关类型
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

// 系统相关类型
export interface ComponentStatus {
  name: string
  status: string
  uptime: string
}

export interface SystemStatus {
  status: string
  uptime: string
  lastUpdate: string
  components: ComponentStatus[]
}

export interface SystemPerformance {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkTraffic: number
  responseTime: number
  requestsPerSecond: number
  errorRate: number
}

export interface HealthCheck {
  name: string
  status: string
  message: string
}

export interface SystemHealth {
  overall: string
  checks: HealthCheck[]
  timestamp: string
}

// 用户相关类型
export type RiskLevel = 'low' | 'medium' | 'high'

export interface UserListItem {
  id: string
  username: string
  nickname: string
  followers: number
  following: number
  posts: number
  verified: boolean
  location: string
  riskLevel: RiskLevel
  activities: {
    posts: number
    comments: number
  }
  sentiment: {
    positive: number
    negative: number
    neutral: number
  }
  tags: string[]
  lastActive: string
  avatar?: string
}

export interface RiskLevelConfig {
  level: RiskLevel
  name: string
  description: string
  color: string
  minScore: number
  maxScore: number
  actionRequired: boolean
  autoActions: string[]
  count?: number
}

export interface UserStatistics {
  total: number
  active: number
  suspended: number
  banned: number
  monitoring: number
  riskDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
  newUsers: {
    today: number
    week: number
    month: number
  }
  activeUsers: {
    today: number
    week: number
    month: number
  }
  averageRiskScore: number
  trends: {
    totalGrowthRate: number
    riskScoreChange: number
    newUsersGrowthRate: number
  }
}

export interface UserListResponse {
  users: UserListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

// 工作流相关类型
export interface WorkflowStatus {
  nlpQueue: string
  workflowEngine: string
  lastExecution: string
}

export interface SearchWeiboResult {
  message: string
  keyword: string
  startDate: string
  endDate: string
  page: number
  searchResult: any
}

export interface BatchNlpResult {
  message: string
  total: number
  results: Array<{
    postId: string
    status: string
  }>
}

export interface CrawlPostResult {
  message: string
  postId: string
  mid?: string
  uid?: string
  commentsCount: number
  commentsCrawled: boolean
  repostsCrawled: boolean
}