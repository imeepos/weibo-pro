/**
 * PersonaProjectionService 测试基础输入
 */
export const baseInput = {
  weiboUserId: '100',
  screenName: '用户A',
  avatar: null,
  summary: { short: '摘要', long: '长摘要', confidence: 0.9 },
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
    overallLevel: 'high' as const,
    overallScore: 87,
    riskDrivers: [{ label: '情绪极化', reason: '负向占比高', confidence: 0.8 }],
    reviewRecommendation: 'human_review' as const,
  },
  relations: { keyConnections: [], clusterRole: null, coordinationSignals: [] },
  memoryDrafts: [
    {
      type: 'insight' as const,
      name: '热点追逐型',
      description: null,
      content: '长期追逐热点并放大情绪',
      evidenceRefs: [{ sourceTable: 'weibo_posts', sourceId: '1', score: 0.8 }],
      relationDrafts: [
        {
          relationType: 'related' as const,
          targetKind: 'memory' as const,
          targetRef: '情绪放大型',
        },
      ],
    },
    {
      type: 'concept' as const,
      name: '情绪放大型',
      description: null,
      content: '偏好情绪化表达',
      evidenceRefs: [{ sourceTable: 'weibo_posts', sourceId: '2', score: 0.7 }],
      relationDrafts: [],
    },
  ],
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
