/**
 * EventDetail 测试共享数据 fixtures。
 * 从拆分前的 EventDetail.test.tsx 中抽取,仅包含纯数据,不含任何 vi.mock / 断言逻辑。
 */

export const mockEventId = 'test-event-123';

export const mockEventData = {
  id: mockEventId,
  title: '测试事件标题',
  description: '这是一个测试事件的描述信息',
  postCount: 1500,
  userCount: 800,
  sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2 },
  hotness: 95,
  trend: 'up' as const,
  category: '科技',
  keywords: ['AI', '人工智能', '机器学习'],
  createdAt: '2025-01-01T00:00:00Z',
  lastUpdate: '2025-01-15T12:00:00Z',
};

export const eventTimeSeries = {
  categories: ['2025-01-15T00:00:00Z'],
  series: [
    { name: '帖子数量', data: [100] },
    { name: '正面情绪', data: [0.6] },
    { name: '负面情绪', data: [0.2] },
    { name: '中性情绪', data: [0.2] },
  ],
};

export const eventTrends = {
  hotnessData: [80, 85, 90, 95],
  sentimentScores: [0.5, 0.55, 0.6, 0.65],
  postVolume: [100, 120, 150, 180],
  userEngagement: [50, 60, 75, 90],
  totalPosts: 550,
};

export const eventKeywords = [
  { keyword: 'AI', weight: 0.9, sentiment: 'positive' },
  { keyword: '人工智能', weight: 0.8, sentiment: 'positive' },
];

export const eventMilestones = [
  {
    timestamp: '2026-04-20T09:00:00.000Z',
    type: 'heat_spike',
    title: '热度峰值',
    summary: '热度在该时间窗快速升高',
    confidence: 0.8,
    metrics: { hotness: 120, postCount: 60, userCount: 40 },
    representativePosts: [],
  },
];

export const eventTopicOverview = {
  topTopics: [{ title: '外交部', count: 42, sentiment: 'neutral', trend: 'stable' }],
  timeSeries: [],
};

export const eventInstitutions = [
  {
    userId: 'user-1',
    screenName: '新华社',
    institutionType: 'state_media',
    verified: true,
    postCount: 5,
    interactionCount: 120,
    influenceScore: 9800,
    sentimentTilt: 'neutral',
  },
];

export const eventOpinionClusters = [
  {
    id: 'cluster-1',
    label: '批评观点',
    stance: 'critical',
    summary: '围绕追责和透明回应形成的观点簇',
    postCount: 12,
    userCount: 8,
    keywords: ['追责', '透明'],
    representativePosts: [],
  },
];

export const eventEmotionMap = [{ label: '愤怒', weight: 4 }];

export const eventUserEmotionInsights = [
  {
    userId: 'user-1',
    screenName: '用户A',
    postCount: 3,
    emotionTilt: 'negative',
    summary: '高频负向发帖',
  },
];

export const eventSentimentTrendDetailed = [
  {
    timestamp: '2026-04-20T09:00:00.000Z',
    positive: 0.2,
    negative: 0.6,
    neutral: 0.2,
  },
];

export const eventRiskProfile = {
  totalUsers: 120,
  activeUsers: 67,
  abnormalUserCount: 8,
  averageRiskScore: 36.5,
  riskDistribution: { low: 90, medium: 22, high: 8 },
  topSignals: [{ type: 'night_activity', label: '夜间活跃', count: 6 }],
  topRiskUsers: [{ userId: 'user-1', screenName: '用户A', riskLevel: 'high', riskScore: 84 }],
};

export const eventAbnormalUsers = [
  {
    userId: 'user-1',
    screenName: '用户A',
    followers: 24,
    verified: false,
    location: '北京',
    postCount: 12,
    riskLevel: 'high',
    riskScore: 84,
    confidence: 0.84,
    isAbnormal: true,
    accountType: 'bot',
    lastActive: '2026-04-23T01:00:00.000Z',
    summary: '检测到 3 个异常信号',
    abnormalSignals: [
      { type: 'night_activity', severity: 'medium', description: '凌晨发帖占比高', value: 0.5 },
    ],
  },
];

export const engagementTrend: unknown[] = [];

export const eventUserRelations = {
  nodes: [{ id: '1', name: '用户1' }],
  edges: [],
  statistics: {
    totalUsers: 1,
    totalRelations: 0,
    avgDegree: 0,
    density: 0,
    communities: 0,
  },
};

export const eventGeographic = {
  statistics: { postCount: 100, userCount: 20, regionCount: 2, avgSentiment: 0.6 },
  distributions: [],
};

export const sentimentHotness = [
  { postId: '1', sentimentScore: 0.8, hotness: 90, timestamp: '2025-01-15T00:00:00Z' },
];

export const sentimentIntensity = [{ intensity: 0.8, count: 100 }];

export const anomalies = [
  {
    timestamp: '2025-01-15T00:00:00Z',
    type: 'spike',
    metric: 'hotness',
    value: 100,
    expected: 70,
    confidence: 0.9,
  },
];

export const spreadBreadth = {
  totalReposts: 100,
  uniqueReposters: 80,
  spreadDepth: 5,
  spreadWidth: 4.5,
  breadthIndex: 0.75,
  propagationPaths: [],
  spreadTimeline: [],
  repostByUserType: [],
};

export const mediaTypeDistribution = {
  totalPosts: 1000,
  distribution: [],
  trend: [],
  engagementByType: [],
};
