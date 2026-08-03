export const validProfile = {
  summary: { short: '短摘要', long: '长摘要', confidence: 0.91 },
  identity: {
    inferredRole: '热点自媒体',
    roleConfidence: 0.8,
    accountNature: ['media'],
    stableTraits: ['热点追逐'],
  },
  behavior: {
    activityPattern: ['夜间活跃'],
    postingRhythm: 'bursty',
    escalationPattern: ['突发追热点'],
    historicalStability: 'medium',
  },
  content: {
    primaryTopics: ['体育'],
    narrativeStyles: ['情绪放大'],
    emotionalTendency: ['negative'],
    stancePattern: ['对立'],
  },
  risk: {
    overallLevel: 'high',
    overallScore: 87,
    riskDrivers: [{ label: '情绪极化', reason: '负向占比高', confidence: 0.8 }],
    reviewRecommendation: 'human_review',
  },
  relations: { keyConnections: [], clusterRole: null, coordinationSignals: [] },
  memoryDrafts: [{
    type: 'insight',
    name: '热点追逐型',
    description: null,
    content: '长期追逐热点并放大情绪',
    evidenceRefs: [{ sourceTable: 'weibo_posts', sourceId: '1', score: 0.8 }],
    relationDrafts: [],
  }],
  metadata: {
    sampledPosts: 20,
    sampledComments: 0,
    sampledReposts: 3,
    windowDays: 90,
    model: 'gpt-5',
    promptVersion: 'v1',
    generatedAt: '2026-04-23T00:00:00.000Z',
  },
} as const;

export const validDossier = {
  accountSnapshot: {
    weiboUserId: '100',
    screenName: '用户A',
    displayName: '用户A',
    avatar: null,
    description: '简介',
    location: '陕西',
    followersCount: 1200,
    friendsCount: 80,
    statusesCount: 320,
    verified: true,
    verifiedType: 0,
    verifiedReason: null,
    creditScore: 80,
    urisk: 60,
    createdAt: null,
  },
  eventRiskContext: {
    eventId: 'event-1',
    eventRiskLevel: 'high',
    eventRiskScore: 92,
    riskSignals: [],
    firstSeenAt: null,
    lastSeenAt: null,
    eventPostCount: 2,
    eventInteractionCount: 12,
  },
  historyCoverage: {
    windowDays: 90,
    collectedPostCount: 20,
    collectedCommentCount: 0,
    collectedRepostCount: 3,
    timeRangeStart: null,
    timeRangeEnd: null,
    samplingStrategy: 'recent+spikes',
  },
  behaviorTimeline: {
    postingByDay: [],
    postingByHour: [],
    interactionByDay: [],
    spikeMoments: [],
    activePeriods: [],
  },
  topicAndSentimentProfile: {
    topicClusters: [],
    primaryKeywords: [],
    eventTypes: [],
    sentimentTrend: [],
    sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
    topicShiftMoments: [],
  },
  relationSummary: {
    topConnectedUsers: [],
    relationTypes: [],
    sharedEvents: [],
    relationClusters: [],
    suspiciousCoordinationHints: [],
  },
  evidenceSamples: {
    eventSamples: [],
    historySamples: [],
    relationSamples: [],
    nlpSamples: [],
  },
  preDistillationSummary: {
    candidateLabels: [],
    anomalyHints: [],
    coverageWarnings: [],
    humanReviewNeeded: false,
  },
} as const;

export const alternativeProviderProfile = {
  summary: '该用户为高影响力认证账号，近期高频讨论国际政治和军事话题，具有明显的议题引导能力。',
  identity: {
    handle: '张颐武',
    userId: '1194868525',
    verifiedInfo: '北京大学中文系教授，博士生导师',
    influenceLevel: '高影响力',
    tags: ['学者', '时评人'],
  },
  behavior: {
    postingFrequency: '高频',
    activeHours: '凌晨至上午',
    interactionPattern: '以转发和简短评论为主',
    anomaly: '深夜活跃度异常偏高',
  },
  content: {
    primaryThemes: ['国际政治', '军事动态'],
    style: '转载媒体文章并附简短评论',
    sentiment: '负面/批判性为主',
    keywords: ['特朗普', '核试验'],
  },
  risk: {
    level: '中',
    score: 65,
    reasons: [
      '高频发布敏感国际政治话题',
      '作为大V具备较强议题放大能力',
    ],
  },
  relations: {
    closeCircle: ['1974576991', '1703371307'],
    interactionType: '高频转发与评论',
    assessment: '存在固定的信息传播网络',
  },
  memoryDrafts: {
    keyObservations: '近期重点聚焦国际政治和核武议题，情绪倾向较强。',
    pendingTasks: '持续监控其相关议题的表达方向与传播链路。',
  },
  metadata: {
    analysisTime: '2026-04-28T12:00:00Z',
    dataWindow: '90 days',
    sampleSize: 774,
    reviewStatus: '需人工复核',
  },
} as const;

export const secondAlternativeProviderProfile = {
  summary: {
    riskLevel: 'medium',
    riskScore: 42,
    primaryThreat: '涉政敏感话题评论',
    confidence: 'medium',
    verdict:
      '该用户为拥有近千万粉丝的加V大V，近期活跃度极高，且存在明显的涉政敏感话题讨论倾向。',
  },
  identity: {
    userId: '1571999832',
    screenName: '释不归',
    tags: ['大V', '加V用户', '高频发博', '北京'],
    influenceScore: 9378839,
    profileAnomalies: [],
  },
  behavior: {
    postingFrequency: 'high',
    activityPattern: '全天候活跃，高峰期在上午及凌晨',
    automationProbability: 0.15,
    interactionStyle: '高产出型，具备极强的舆论引爆能力。',
  },
  content: {
    primaryTopics: ['音乐分享', '生活感悟', '时政评论'],
    sentiment: 'mixed',
    sensitiveKeywords: ['川子', '违纪', '烧香', '党员', '委内瑞拉'],
    narrative: '日常以音乐、生活类内容维持高活跃度，间歇性插入时政热点评论。',
  },
  risk: {
    politicalRisk: 'medium',
    disinformationRisk: 'low',
    coordinationRisk: 'medium',
    riskSignals: [
      '涉政敏感词（违纪/烧香/川子）',
      '特定日期互动量异常激增',
      '存在疑似协同互动的小圈子',
    ],
  },
  relations: {
    networkType: 'hub',
    keyConnections: ['7930521683', '2094640577', '1919959601'],
    coordinationIndicators:
      '与特定用户存在高频互动，且关系类型集中在评论和转发。',
  },
  memoryDrafts: {
    recentMilestones: [
      '2026-04-17: 单日互动量达到峰值 45542',
      '2026-04-15: 互动量激增至 1958',
    ],
    pendingInvestigation: '需重点监控其在涉政话题上的立场转变及协同行为。',
  },
  metadata: {
    analyzedAt: '2026-04-28T00:00:00.000Z',
    dataWindow: '90 days',
    sampleSize: 903,
    modelVersion: 'v1.0',
  },
} as const;
