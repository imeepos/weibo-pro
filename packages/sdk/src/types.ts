export type TimeRange = 'all' | '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d' | '180d' | '365d'

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

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
  occurredAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  totals: {
    totalEvents: number
    totalPosts: number
    totalUsers: number
    avgHotness: number
  }
}

export interface TrendAnalysis {
  timeline: string[]
  postVolume: number[]
  sentimentScores: number[]
  userEngagement: number[]
  hotnessData: number[]
  totalPosts?: number
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
export interface HotEvent {
  id: string
  title: string
  heat: number
  posts: number
  users: number
  sentiment: 'positive' | 'negative' | 'neutral'
  trend: 'rising' | 'stable' | 'falling'
}

export interface GeographicDistribution {
  region: string
  count: number
  percentage: number
  posts: number
  sentiment: number
}

// 地理分布统计数据
export interface GeographicStatistics {
  regionCount: number      // 地区总数
  userCount: number        // 发帖用户数
  postCount: number        // 帖子总数
  avgSentiment: number     // 平均情感 (0-1)
}

// 地理分布响应（包含统计数据和分布列表）
export interface GeographicResponse {
  statistics: GeographicStatistics
  distributions: GeographicDistribution[]
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
}

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
  trendData: {
    total: number[]
    highRisk: number[]
    mediumRisk: number[]
    lowRisk: number[]
  }
  changes: {
    total: number
    highRisk: number
    mediumRisk: number
    lowRisk: number
  }
}

export interface UserListQueryParams {
  timeRange?: TimeRange
  page?: number
  pageSize?: number
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

// 工作流管理相关类型
export interface SaveWorkflowPayload {
  id?: string
  name: string
  workflowData: {
    nodes: any[]
    edges: any[]
  }
}


export interface WorkflowData {
  id: string
  name: string
  data: {
    nodes: any[]
    edges: any[]
  }
  createdAt: string
  updatedAt: string
}

export interface WorkflowSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  tags?: string[]
  description?: string
}

export interface CreateShareResult {
  shareToken: string
  shareUrl: string
}

export interface ExecuteNodeResult {
  nodeId: string
  state: 'pending' | 'running' | 'success' | 'fail'
  result?: any
  error?: string
}

// 工作流运行状态枚举（前端专用）
export enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

// 工作流运行实例类型（前端专用）
export interface WorkflowRunEntity {
  id: string
  workflowId: string
  scheduleId?: string
  status: RunStatus
  graphSnapshot: unknown
  inputs: Record<string, unknown>
  outputs?: Record<string, unknown>
  nodeStates: Record<string, unknown>
  error?: {
    message: string
    stack?: string
    nodeId?: string
  }
  startedAt?: Date
  completedAt?: Date
  durationMs?: number
  createdAt: Date
  updatedAt: Date
}

// 工作流运行实例相关类型
export interface CreateRunResult {
  runId: string
  run: WorkflowRunEntity
}

export interface ListRunsResult {
  runs: WorkflowRunEntity[]
  total: number
  page: number
  pageSize: number
}

// 用户关系网络可视化相关类型
export type UserRelationType = 'like' | 'comment' | 'repost' | 'comprehensive'

export interface UserRelationNode {
  id: string
  name: string
  avatar?: string
  followers: number
  influence: number
  postCount: number
  verified: boolean
  userType: 'official' | 'media' | 'kol' | 'normal'
  location?: string
}

export interface UserRelationEdge {
  source: string
  target: string
  weight: number
  type: UserRelationType
  interactions: {
    likes?: number
    comments?: number
    reposts?: number
  }
}

export interface UserRelationNetwork {
  nodes: UserRelationNode[]
  edges: UserRelationEdge[]
  statistics: {
    totalUsers: number
    totalRelations: number
    avgDegree: number
    density: number
    communities?: number
  }
}

export interface UserRelationQueryParams {
  type?: UserRelationType
  timeRange?: TimeRange
  minWeight?: number
  limit?: number
}

// SSE相关类型
export interface SSEEvent {
  type: 'progress' | 'qr_code' | 'login_success' | 'login_failed' | 'error' | 'complete' | 'health'
  data?: any
  message?: string
}

export interface WeiboLoginSSEQuery {
  nodeId?: string
}

export interface WorkflowStatusSSEQuery {
  nodeId?: string
  runId?: string
}

export interface NodeExecutionSSEQuery {
  nodeId: string
}

export interface WeiboLoginSuccessData {
  accountId: string
  username: string
  cookie: string
}

export interface ProgressData {
  progress: number
  nodeId?: string
  runId?: string
  timestamp?: string
  step?: string
}

export interface QRCodeData {
  qrUrl: string
}

export interface LoginStatusResponse {
  status: 'pending' | 'success' | 'expired' | 'error'
  message?: string
  data?: {
    accountId?: string
    username?: string
    cookie?: string
  }
}

export interface CookieLoginRequest {
  platform: MediaPlatform
  cookies: string
}

export interface ExecutionCompleteData {
  nodeId: string
  result: {
    success: boolean
    message: string
  }
}

export interface HealthData {
  status: string
  timestamp: string
  services: {
    database: string
    redis: string
    rabbitmq: string
  }
}

// Persona 记忆图谱相关类型
export type MemoryType = 'fact' | 'concept' | 'event' | 'person' | 'insight'
export type RelationType = 'related' | 'causes' | 'follows' | 'contains'

export interface PersonaListItem {
  id: string
  name: string
  avatar: string | null
  description: string | null
  memoryCount: number
  createdAt: string
}

export interface MemoryNode {
  id: string
  name: string
  description: string | null
  content: string
  type: MemoryType
  createdAt: string
}

export interface MemoryEdge {
  id: string
  sourceId: string
  targetId: string
  relationType: RelationType
}

export interface PersonaMemoryGraph {
  persona: {
    id: string
    name: string
    avatar: string | null
    description: string | null
    traits: string[] | null
  }
  memories: MemoryNode[]
  relations: MemoryEdge[]
}

/** 记忆检索请求 */
export interface RetrieveMemoriesRequest {
  personaId: string
  stimuli: string[]
  depth?: number
  timeout?: number
}

/** 检索到的记忆（带深度） */
export interface RetrievedMemory {
  id: string
  name: string
  content: string
  type: MemoryType
  depth: number
}

/** 记忆检索响应 */
export interface RetrieveMemoriesResponse {
  memories: RetrievedMemory[]
  context: string
}

/** 创建记忆请求 */
export interface CreateMemoryRequest {
  personaId: string
  name: string
  content: string
  type: MemoryType
  relatedMemoryIds?: string[]
}

// 工作流调度相关类型
export enum ScheduleType {
  ONCE = 'once',
  CRON = 'cron',
  INTERVAL = 'interval',
  CONTINUOUS = 'continuous', // 持续模式：执行完毕后立即重新执行
  MANUAL = 'manual',
}

export enum ScheduleStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
}

export interface WorkflowScheduleEntity {
  id: string
  workflowId: string
  name: string
  scheduleType: ScheduleType
  cronExpression?: string
  intervalSeconds?: number
  inputs: Record<string, unknown>
  status: ScheduleStatus
  startTime: Date
  endTime?: Date
  lastRunAt?: Date
  nextRunAt?: Date
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// MediaCrawler 相关类型
export type MediaPlatform = 'xhs' | 'dy' | 'ks' | 'bili' | 'wb' | 'tieba' | 'zhihu'
export type LoginType = 'qrcode' | 'phone' | 'cookie'
export type CrawlerType = 'search' | 'detail' | 'creator'
export type SaveDataOption = 'csv' | 'db' | 'json' | 'sqlite' | 'mongodb' | 'excel'
export type CrawlerStatus = 'idle' | 'running' | 'stopping' | 'error'
export type LogLevel = 'info' | 'warning' | 'error' | 'success' | 'debug'

export interface CrawlerStartRequest {
  platform: MediaPlatform
  loginType?: LoginType
  crawlerType?: CrawlerType
  keywords?: string
  specifiedIds?: string
  creatorIds?: string
  startPage?: number
  enableComments?: boolean
  enableSubComments?: boolean
  saveOption?: SaveDataOption
  cookies?: string
  headless?: boolean
}

export interface CrawlerStatusResponse {
  status: CrawlerStatus
  platform?: string
  crawlerType?: string
  startedAt?: string
  errorMessage?: string
}

export interface CrawlerLogEntry {
  id: number
  timestamp: string
  level: LogLevel
  message: string
}

export interface PlatformInfo {
  value: MediaPlatform
  label: string
  icon: string
}

export interface ConfigOption {
  value: string
  label: string
}

export interface DataFileInfo {
  name: string
  path: string
  size: number
  modifiedAt: number
  recordCount?: number
  type: string
}

export interface DataFileListResponse {
  files: DataFileInfo[]
}

export interface DataFileContentResponse {
  data: any
  total: number
  columns?: string[]
}

export interface DataStats {
  totalFiles: number
  totalSize: number
  byPlatform: Record<string, number>
  byType: Record<string, number>
}

export interface EnvCheckResult {
  success: boolean
  message: string
  output?: string
  error?: string
}

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

// 发帖时间热力图数据
export interface PostingTimeHeatmap {
  hourlyDistribution: number[]   // 24小时分布 [0-23]
  weekdayDistribution: number[]  // 7天分布 [0-6, 0=周日]
  heatmapMatrix: number[][]      // 7x24 热力矩阵（归一化 0-1）
  peakTime: {
    hour: number
    weekday: number
    count: number
    label: string
  }
  offPeakTime: {
    hour: number
    weekday: number
    count: number
    label: string
  }
  totalPosts: number
  insights: string[]
}

// 评论深度分析数据
export interface CommentDepthDistribution {
  depth: number
  count: number
  percentage: number
}

export interface DiscussionHotspot {
  rootCommentId: string
  rootCommentText: string
  replyCount: number
  maxDepth: number
  participants: number
}

export interface CommentDepthAnalysis {
  avgThreadDepth: number
  maxThreadDepth: number
  replyRatio: number
  totalRootComments: number
  totalReplies: number
  depthDistribution: CommentDepthDistribution[]
  discussionHotspots: DiscussionHotspot[]
}

// 网络中心性分析相关类型
export interface CentralityNode {
  userId: string
  screenName: string
  degreeCentrality: number      // 度中心性 (0-1)
  weightedDegree: number        // 加权度
  influenceScore: number        // 综合影响力
  nodeSize: number              // 可视化节点大小
}

export interface CentralityEdge {
  source: string                // 源用户ID
  target: string                // 目标用户ID
  weight: number                // 边权重
}

export interface NetworkStats {
  nodeCount: number             // 节点总数
  edgeCount: number             // 边总数
  avgDegree: number             // 平均度数
  maxDegree: number             // 最大度数
  density: number               // 网络密度 (0-1)
}

export interface TopInfluencer {
  userId: string
  screenName: string
  score: number
  rank: number
}

export interface CentralityAnalysis {
  nodes: CentralityNode[]
  edges: CentralityEdge[]
  networkStats: NetworkStats
  topInfluencers: TopInfluencer[]
}

// 情感转变追踪相关类型
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

// 媒体类型分布相关类型
export type MediaType = 'text' | 'image' | 'video' | 'link' | 'mixed'

export interface MediaTypeItem {
  type: MediaType
  count: number
  percentage: number
  avgEngagement: number
}

export interface MediaTypeTrend {
  timestamp: string
  types: {
    text: number
    image: number
    video: number
    link: number
    mixed: number
  }
}

export interface MediaEngagement {
  type: MediaType
  avgLikes: number
  avgComments: number
  avgReposts: number
}

export interface MediaTypeAnalysis {
  distribution: MediaTypeItem[]
  totalPosts: number
  trend: MediaTypeTrend[]
  engagementByType: MediaEngagement[]
}

// 传播广度分析相关类型 - 聚合节点类型
export interface AggregatedNode {
  id: string                    // 唯一标识
  name: string                  // 显示名称（如"认证用户(128人)"）
  type: 'source' | 'aggregated' | 'top_user'
  level: number                 // 传播层级
  userType?: 'vip' | 'ordinary' | 'verified'
  count: number                 // 包含的用户数
  totalWeight: number           // 总权重（转发量）
  topUsers?: TopUser[]          // 展开时显示的 Top 用户
}

export interface TopUser {
  userId: string
  screenName: string
  weight: number
  followers?: number
}

// 层级统计
export interface LevelStats {
  level: number
  totalUsers: number
  totalReposts: number
  byUserType: {
    vip: { count: number; reposts: number }
    ordinary: { count: number; reposts: number }
    verified: { count: number; reposts: number }
  }
}

// 聚合传播数据
export interface AggregatedPropagation {
  nodes: AggregatedNode[]
  links: PropagationPath[]
  levelStats: LevelStats[]
}

export interface PropagationPath {
  source: string
  target: string
  weight: number
  level: number
}

export interface SpreadTimelinePoint {
  timestamp: string
  count: number
  cumulative: number
}

export interface UserTypeDistribution {
  type: 'vip' | 'ordinary' | 'verified'
  count: number
  percentage: number
}

export interface SpreadBreadthAnalysis {
  totalReposts: number
  uniqueReposters: number
  spreadDepth: number
  spreadWidth: number
  breadthIndex: number
  propagationPaths: PropagationPath[]
  spreadTimeline: SpreadTimelinePoint[]
  repostByUserType: UserTypeDistribution[]
  aggregatedPropagation?: AggregatedPropagation
}

// 社区发现相关类型
export interface CommunityMember {
  userId: string
  screenName: string
  role: 'leader' | 'active' | 'peripheral'
  inDegree: number
  outDegree: number
}

export interface Community {
  id: string
  name: string
  members: CommunityMember[]
  size: number
  density: number
  avgInfluence: number
  topKeywords: string[]
  sentiment: { positive: number; negative: number; neutral: number }
}

export interface CommunityLink {
  sourceCommunity: string
  targetCommunity: string
  weight: number
}

export interface BridgeUser {
  userId: string
  screenName: string
  communities: string[]
  bridgeScore: number
}

export interface CommunityAnalysis {
  communities: Community[]
  modularity: number
  totalCommunities: number
  interCommunityLinks: CommunityLink[]
  bridgeUsers: BridgeUser[]
}

// 社区演化追踪相关类型
export interface CommunityTimeSlice {
  timestamp: string
  communities: Community[]
  modularity: number
  totalMembers: number
}

export interface EvolutionEvent {
  type: 'birth' | 'death' | 'split' | 'merge' | 'growth' | 'shrink'
  timestamp: string
  involvedCommunities: string[]
  magnitude: number
  description: string
}

export interface KeyChange {
  communityId: string
  changeType: string
  beforeSize: number
  afterSize: number
  keyMembers: string[]
}

export interface TrendPrediction {
  predictedCommunityCount: number
  predictedModularity: number
  confidence: number
}

export interface CommunityEvolutionAnalysis {
  timeSlices: CommunityTimeSlice[]
  evolutionEvents: EvolutionEvent[]
  overallStability: number
  keyChanges: KeyChange[]
  trendPrediction: TrendPrediction
}

// 影响力预测相关类型
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