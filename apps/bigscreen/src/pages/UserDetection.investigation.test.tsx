import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UserDetection from './UserDetection';

vi.mock('@/hooks/useInvestigationQueue', () => ({
  useInvestigationQueue: () => ({
    queue: [{
      weiboUserId: '100',
      screenName: '用户A',
      avatar: null,
      eventRiskScore: 92,
      eventRiskLevel: 'high',
      status: 'queued',
      hasPersona: false,
      lastDistilledAt: null,
      riskSignals: ['情绪极化'],
    }],
    response: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useUserDossier', () => ({
  useUserDossier: () => ({
    dossier: {
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
        eventId: null,
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
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDistillationTasks', () => ({
  useDistillationTasks: () => ({
    tasks: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    createTask: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePersonaNetworkGraph', () => ({
  usePersonaNetworkGraph: () => ({
    graph: {
      personas: [],
      edges: [],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('UserDetection investigation mode', () => {
  it('renders queue, dossier, and distillation workspace in one page', () => {
    render(<UserDetection />);

    expect(screen.getByText('高危候选队列')).toBeInTheDocument();
    expect(screen.getByText('用户 dossier')).toBeInTheDocument();
    expect(screen.getByText('AI 蒸馏画像')).toBeInTheDocument();
  });

  it('switches between investigation mode and persona graph mode', async () => {
    render(<UserDetection />);

    fireEvent.click(screen.getByText('查看全量图谱'));
    expect(screen.getByText('全量 Persona 图谱')).toBeInTheDocument();

    fireEvent.click(screen.getByText('返回调查模式'));
    expect(screen.getByText('高危候选队列')).toBeInTheDocument();
  });
});
