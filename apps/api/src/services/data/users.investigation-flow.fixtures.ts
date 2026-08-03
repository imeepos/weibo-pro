/**
 * 共享 fixtures：UsersService distillation-flow 测试套件使用的纯数据。
 * 仅包含数据与工厂函数，不含 vitest 依赖，供各测试文件复用。
 */

export const historyCollectionCompletedResult = {
  status: 'completed',
  page: 1,
  collectedPostCount: 20,
  newPostCount: 20,
  duplicatePostCount: 0,
  failedPageCount: 0,
  latestPostAt: '2026-04-23T00:00:00.000Z',
  oldestPostAt: '2026-04-22T00:00:00.000Z',
  partial: false,
  warnings: [],
  message: '历史发帖抓取完成，共处理 20 条帖子',
};

export const baseDossierResult = {
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
  behaviorTimeline: { postingByDay: [], postingByHour: [], interactionByDay: [], spikeMoments: [], activePeriods: [] },
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
  evidenceSamples: { eventSamples: [], historySamples: [], relationSamples: [], nlpSamples: [] },
  preDistillationSummary: { candidateLabels: [], anomalyHints: [], coverageWarnings: [], humanReviewNeeded: false },
};

export function buildDossierResult(overrides: Record<string, any> = {}) {
  return { ...baseDossierResult, ...overrides };
}

export const baseDistilledProfile = {
  summary: { short: '短摘要', long: '长摘要', confidence: 0.9 },
  identity: { inferredRole: '热点自媒体', roleConfidence: 0.8, accountNature: ['media'], stableTraits: ['热点追逐'] },
  behavior: { activityPattern: ['夜间活跃'], postingRhythm: 'bursty', escalationPattern: ['突发追热点'], historicalStability: 'medium' },
  content: { primaryTopics: ['体育'], narrativeStyles: ['情绪放大'], emotionalTendency: ['negative'], stancePattern: ['对立'] },
  risk: {
    overallLevel: 'high',
    overallScore: 87,
    riskDrivers: [{ label: '情绪极化', reason: '负向占比高', confidence: 0.8 }],
    reviewRecommendation: 'auto_pass',
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
};

export function buildDistilledProfile(overrides: Record<string, any> = {}) {
  return { ...baseDistilledProfile, ...overrides };
}

export const postExtractionDefaultResult = {
  extractorVersion: 'post-v1',
  total: 20,
  reusedCount: 0,
  extractedCount: 20,
  failedCount: 0,
  warnings: [],
  items: Array.from({ length: 20 }, (_, index) => ({
    id: `extract-${index + 1}`,
    source_post_id: `source-${index + 1}`,
    status: 'succeeded',
    extracted_json: {
      topicLabels: ['体育'],
      eventLabel: '事件A',
      eventKey: 'event-a',
      viewpointLabels: ['支持'],
      stance: '支持',
      sentiment: 'positive',
      emotionLabels: [],
      entities: [],
      riskSignals: [],
      coordinationMarkers: [],
      temporalHints: {
        postCreatedAt: '2026-04-23T00:00:00.000Z',
        inferredPhase: 'unknown',
      },
      contentFingerprint: `fp-${index + 1}`,
      excerpt: `帖子 ${index + 1}`,
    },
  })),
};

export const aggregationDefaultResult = {
  tree: [],
  timeline: [],
  coordinationSignals: [],
  stats: { totalEvents: 0, totalWarnings: 0 },
};

export const sourcePostRowsFixture = Array.from({ length: 20 }, (_, index) => ({
  post_id: `${index + 1}`,
  created_at: `2026-04-23T${String(index).padStart(2, '0')}:00:00.000Z`,
  text: `测试帖子 ${index + 1}`,
  comments_count: 0,
  reposts_count: 0,
  attitudes_count: 0,
  event_id: 'event-1',
}));

export function buildTaskRow(overrides: Record<string, any> = {}) {
  return {
    id: 'task-active',
    weibo_user_id: '100',
    event_id: null,
    status: 'crawling',
    history_window_days: 90,
    source_post_count: 0,
    source_comment_count: 0,
    source_repost_count: 0,
    evidence_sample_count: 0,
    model: null,
    prompt_version: null,
    distilled_summary: null,
    distilled_json: null,
    review_status: null,
    error_message: null,
    started_at: new Date('2026-04-23T00:10:00.000Z'),
    completed_at: null,
    created_at: new Date('2026-04-23T00:00:00.000Z'),
    updated_at: new Date('2026-04-23T00:10:00.000Z'),
    ...overrides,
  };
}
