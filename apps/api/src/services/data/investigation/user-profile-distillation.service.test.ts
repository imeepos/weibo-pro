import { beforeEach, describe, expect, it, vi } from 'vitest';
import { distilledUserProfileSchema } from './user-profile-distillation.schema';
import { UserProfileDistillationService } from './user-profile-distillation.service';
import { useLlmModel } from '@sker/workflow-run';

const fallbackInvokeMock = vi.fn();
const structuredInvokeMock = vi.fn();
const withStructuredOutputMock = vi.fn();

vi.mock('@sker/workflow-run', () => ({
  useLlmModel: vi.fn(),
}));

const validProfile = {
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

const validDossier = {
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

const alternativeProviderProfile = {
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

const secondAlternativeProviderProfile = {
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

describe('distilled user profile schema', () => {
  beforeEach(() => {
    fallbackInvokeMock.mockReset();
    structuredInvokeMock.mockReset();
    withStructuredOutputMock.mockReset();

    withStructuredOutputMock.mockReturnValue({
      invoke: structuredInvokeMock,
    });

    vi.mocked(useLlmModel).mockReturnValue({
      invoke: fallbackInvokeMock,
      withStructuredOutput: withStructuredOutputMock,
    } as any);
  });

  it('validates required summary, risk, and memory drafts', () => {
    const parsed = distilledUserProfileSchema.parse(validProfile);

    expect(parsed.risk.overallLevel).toBe('high');
    expect(parsed.memoryDrafts).toHaveLength(1);
  });

  it('uses structured output when the model supports it', async () => {
    structuredInvokeMock.mockResolvedValue(validProfile);

    const service = new UserProfileDistillationService();

    const profile = await service.distill({
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
    });

    expect(withStructuredOutputMock).toHaveBeenCalledWith(distilledUserProfileSchema);
    expect(profile.summary.short).toBe('短摘要');
    expect(profile.memoryDrafts[0]?.type).toBe('insight');
    expect(fallbackInvokeMock).not.toHaveBeenCalled();
  });

  it('falls back to plain invoke when structured output parsing throws before reaching the service parser', async () => {
    structuredInvokeMock.mockRejectedValue(
      new SyntaxError('Unexpected token `, "```json\\n{\\n"... is not valid JSON'),
    );
    fallbackInvokeMock.mockResolvedValue({
      content: `\`\`\`json
${JSON.stringify(validProfile, null, 2)}
\`\`\``,
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.summary.short).toBe('短摘要');
    expect(structuredInvokeMock).toHaveBeenCalledTimes(1);
    expect(fallbackInvokeMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to fenced json parsing when structured output is unavailable', async () => {
    vi.mocked(useLlmModel).mockReturnValueOnce({
      invoke: fallbackInvokeMock.mockResolvedValue({
        content: `\`\`\`json
{
  "summary": { "short": "短摘要", "long": "长摘要", "confidence": 0.91 },
  "identity": {
    "inferredRole": "热点自媒体",
    "roleConfidence": 0.8,
    "accountNature": ["media"],
    "stableTraits": ["热点追逐"]
  },
  "behavior": {
    "activityPattern": ["夜间活跃"],
    "postingRhythm": "bursty",
    "escalationPattern": ["突发追热点"],
    "historicalStability": "medium"
  },
  "content": {
    "primaryTopics": ["体育"],
    "narrativeStyles": ["情绪放大"],
    "emotionalTendency": ["negative"],
    "stancePattern": ["对立"]
  },
  "risk": {
    "overallLevel": "high",
    "overallScore": 87,
    "riskDrivers": [{ "label": "情绪极化", "reason": "负向占比高", "confidence": 0.8 }],
    "reviewRecommendation": "human_review"
  },
  "relations": { "keyConnections": [], "clusterRole": null, "coordinationSignals": [] },
  "memoryDrafts": [{
    "type": "insight",
    "name": "热点追逐型",
    "description": null,
    "content": "长期追逐热点并放大情绪",
    "evidenceRefs": [{ "sourceTable": "weibo_posts", "sourceId": "1", "score": 0.8 }],
    "relationDrafts": []
  }],
  "metadata": {
    "sampledPosts": 20,
    "sampledComments": 0,
    "sampledReposts": 3,
    "windowDays": 90,
    "model": "gpt-5",
    "promptVersion": "v1",
    "generatedAt": "2026-04-23T00:00:00.000Z"
  }
}
\`\`\``,
      }),
    } as any);

    const service = new UserProfileDistillationService();

    const profile = await service.distill({
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
    });

    expect(profile.summary.short).toBe('短摘要');
    expect(profile.memoryDrafts[0]?.type).toBe('insight');
  });

  it('coerces common plain-invoke provider schemas into the investigation profile schema', async () => {
    structuredInvokeMock.mockRejectedValue(
      new SyntaxError('Unexpected token `, "```json\\n{\\n"... is not valid JSON'),
    );
    fallbackInvokeMock.mockResolvedValue({
      content: `\`\`\`json
${JSON.stringify(alternativeProviderProfile, null, 2)}
\`\`\``,
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.summary.short).toContain('高影响力认证账号');
    expect(profile.identity.inferredRole).toContain('北京大学中文系教授');
    expect(profile.risk.overallLevel).toBe('medium');
    expect(profile.risk.reviewRecommendation).toBe('human_review');
    expect(profile.memoryDrafts).toHaveLength(2);
    expect(profile.memoryDrafts[0]?.evidenceRefs.length).toBeGreaterThan(0);
    expect(profile.metadata.sampledPosts).toBe(774);
    expect(profile.metadata.windowDays).toBe(90);
  });

  it('coerces nested provider summary and milestone schemas into the investigation profile schema', async () => {
    structuredInvokeMock.mockRejectedValue(
      new SyntaxError('Unexpected token `, "```json\\n{\\n"... is not valid JSON'),
    );
    fallbackInvokeMock.mockResolvedValue({
      content: `\`\`\`json
${JSON.stringify(secondAlternativeProviderProfile, null, 2)}
\`\`\``,
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.summary.long).toContain('涉政敏感话题讨论倾向');
    expect(profile.risk.overallLevel).toBe('medium');
    expect(profile.memoryDrafts.length).toBeGreaterThan(0);
    expect(profile.memoryDrafts.some((item) => item.content.includes('2026-04-17'))).toBe(true);
    expect(profile.relations.keyConnections[0]?.targetUserId).toBe('7930521683');
    expect(profile.metadata.sampledPosts).toBe(903);
  });

  it('parses fenced json content returned by structured output adapters', async () => {
    structuredInvokeMock.mockResolvedValue({
      content: `\`\`\`json
{
  "summary": { "short": "短摘要", "long": "长摘要", "confidence": 0.91 },
  "identity": {
    "inferredRole": "热点自媒体",
    "roleConfidence": 0.8,
    "accountNature": ["media"],
    "stableTraits": ["热点追逐"]
  },
  "behavior": {
    "activityPattern": ["夜间活跃"],
    "postingRhythm": "bursty",
    "escalationPattern": ["突发追热点"],
    "historicalStability": "medium"
  },
  "content": {
    "primaryTopics": ["体育"],
    "narrativeStyles": ["情绪放大"],
    "emotionalTendency": ["negative"],
    "stancePattern": ["对立"]
  },
  "risk": {
    "overallLevel": "high",
    "overallScore": 87,
    "riskDrivers": [{ "label": "情绪极化", "reason": "负向占比高", "confidence": 0.8 }],
    "reviewRecommendation": "human_review"
  },
  "relations": { "keyConnections": [], "clusterRole": null, "coordinationSignals": [] },
  "memoryDrafts": [{
    "type": "insight",
    "name": "热点追逐型",
    "description": null,
    "content": "长期追逐热点并放大情绪",
    "evidenceRefs": [{ "sourceTable": "weibo_posts", "sourceId": "1", "score": 0.8 }],
    "relationDrafts": []
  }],
  "metadata": {
    "sampledPosts": 20,
    "sampledComments": 0,
    "sampledReposts": 3,
    "windowDays": 90,
    "model": "gpt-5",
    "promptVersion": "v1",
    "generatedAt": "2026-04-23T00:00:00.000Z"
  }
}
\`\`\``,
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill({
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
    });

    expect(profile.summary.short).toBe('短摘要');
    expect(profile.metadata.model).toBe('gpt-5');
  });

  it('parses opening fenced json even when the closing fence is missing', async () => {
    vi.mocked(useLlmModel).mockReturnValueOnce({
      invoke: fallbackInvokeMock.mockResolvedValue({
        content: `\`\`\`json
{
  "summary": { "short": "短摘要", "long": "长摘要", "confidence": 0.91 },
  "identity": {
    "inferredRole": "热点自媒体",
    "roleConfidence": 0.8,
    "accountNature": ["media"],
    "stableTraits": ["热点追逐"]
  },
  "behavior": {
    "activityPattern": ["夜间活跃"],
    "postingRhythm": "bursty",
    "escalationPattern": ["突发追热点"],
    "historicalStability": "medium"
  },
  "content": {
    "primaryTopics": ["体育"],
    "narrativeStyles": ["情绪放大"],
    "emotionalTendency": ["negative"],
    "stancePattern": ["对立"]
  },
  "risk": {
    "overallLevel": "high",
    "overallScore": 87,
    "riskDrivers": [{ "label": "情绪极化", "reason": "负向占比高", "confidence": 0.8 }],
    "reviewRecommendation": "human_review"
  },
  "relations": { "keyConnections": [], "clusterRole": null, "coordinationSignals": [] },
  "memoryDrafts": [{
    "type": "insight",
    "name": "热点追逐型",
    "description": null,
    "content": "长期追逐热点并放大情绪",
    "evidenceRefs": [{ "sourceTable": "weibo_posts", "sourceId": "1", "score": 0.8 }],
    "relationDrafts": []
  }],
  "metadata": {
    "sampledPosts": 20,
    "sampledComments": 0,
    "sampledReposts": 3,
    "windowDays": 90,
    "model": "gpt-5",
    "promptVersion": "v1",
    "generatedAt": "2026-04-23T00:00:00.000Z"
  }
}`,
      }),
    } as any);

    const service = new UserProfileDistillationService();

    const profile = await service.distill({
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
    });

    expect(profile.summary.short).toBe('短摘要');
    expect(profile.metadata.promptVersion).toBe('v2');
  });

  it('parses fenced json from raw structured output wrappers', async () => {
    structuredInvokeMock.mockResolvedValue({
      parsed: null,
      raw: {
        content: `\`\`\`json
${JSON.stringify(validProfile, null, 2)}
\`\`\``,
      },
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.summary.short).toBe('短摘要');
    expect(profile.metadata.model).toBe('gpt-5');
  });

  it('parses mixed content arrays that contain string fence blocks', async () => {
    structuredInvokeMock.mockResolvedValue({
      content: [
        { type: 'text', text: '以下是结构化结果：' },
        '```json',
        JSON.stringify(validProfile, null, 2),
        '```',
      ],
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.summary.short).toBe('短摘要');
    expect(profile.risk.overallLevel).toBe('high');
  });

  it('parses fenced json when the model emits more than three opening backticks', async () => {
    structuredInvokeMock.mockResolvedValue({
      content: `\`\`\`\`json
${JSON.stringify(validProfile, null, 2)}
\`\`\``,
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.summary.short).toBe('短摘要');
    expect(profile.metadata.promptVersion).toBe('v2');
  });

  it('uses llm wiki prompt conventions in v2 distillation', async () => {
    structuredInvokeMock.mockResolvedValue({
      ...validProfile,
      memoryDrafts: [{
        ...validProfile.memoryDrafts[0],
        section: 'identity',
        isSectionHub: false,
        stability: 'stable',
      }],
    });

    const service = new UserProfileDistillationService();

    await service.distill(validDossier as any);

    const [messages] = structuredInvokeMock.mock.calls.at(-1)!;
    expect(messages[0].content).toContain('raw source layer');
    expect(messages[0].content).toContain('wiki layer');
    expect(messages[0].content).toContain('evidence-first');
  });

  it('keeps valid memory drafts when one llm wiki draft is malformed', async () => {
    structuredInvokeMock.mockRejectedValue(
      new SyntaxError('Unexpected token `, "```json\\n{\\n"... is not valid JSON'),
    );
    fallbackInvokeMock.mockResolvedValue({
      ...validProfile,
      memoryDrafts: [
        {
          ...validProfile.memoryDrafts[0],
          section: 'identity',
          isSectionHub: false,
          stability: 'stable',
        },
        {
          type: 'insight',
          name: '',
          description: null,
          content: '',
          evidenceRefs: [],
          relationDrafts: [],
          section: 'risk',
        },
      ],
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.memoryDrafts).toHaveLength(1);
    expect((profile.memoryDrafts[0] as any)?.section).toBe('identity');
  });
});
