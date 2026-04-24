import { describe, expect, it, vi } from 'vitest';
import { distilledUserProfileSchema } from './user-profile-distillation.schema';
import { UserProfileDistillationService } from './user-profile-distillation.service';

vi.mock('@sker/workflow-run', () => ({
  useLlmModel: () => ({
    invoke: vi.fn().mockResolvedValue({
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
  }),
}));

describe('distilled user profile schema', () => {
  it('validates required summary, risk, and memory drafts', () => {
    const parsed = distilledUserProfileSchema.parse({
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
    });

    expect(parsed.risk.overallLevel).toBe('high');
    expect(parsed.memoryDrafts).toHaveLength(1);
  });

  it('strips fenced json and returns a validated profile from llm output', async () => {
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
});
