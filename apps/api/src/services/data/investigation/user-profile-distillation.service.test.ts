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
    expect(profile.metadata.promptVersion).toBe('v1');
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
    expect(profile.metadata.promptVersion).toBe('v1');
  });
});
