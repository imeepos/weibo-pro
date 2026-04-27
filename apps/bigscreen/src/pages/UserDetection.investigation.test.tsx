import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserDetection from './UserDetection';

const createTaskSpy = vi.fn().mockResolvedValue(null);
const reviewTaskSpy = vi.fn().mockResolvedValue(null);
const tasksRefetchSpy = vi.fn().mockResolvedValue(undefined);
const personaRefetchSpy = vi.fn().mockResolvedValue(undefined);
const evidenceRefetchSpy = vi.fn().mockResolvedValue(undefined);
const memoryGraphRefetchSpy = vi.fn().mockResolvedValue(undefined);
let mockTasksState: any;

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
  useDistillationTasks: () => mockTasksState,
}));

vi.mock('@/hooks/usePersonaNetworkGraph', () => ({
  usePersonaNetworkGraph: () => ({
    graph: {
      personas: [{
        personaId: 'p1',
        weiboUserId: '100',
        name: '用户A Persona',
        avatar: null,
        riskLevel: 'high',
        riskScore: 87,
        traits: ['热点追逐'],
        memoryCount: 4,
        lastDistilledAt: null,
      }],
      edges: [],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePersonaByWeiboUser', () => ({
  usePersonaByWeiboUser: () => ({
    persona: null,
    isLoading: false,
    error: null,
    refetch: personaRefetchSpy,
  }),
}));

vi.mock('@/hooks/usePersonaEvidence', () => ({
  usePersonaEvidence: () => ({
    evidence: [],
    isLoading: false,
    error: null,
    refetch: evidenceRefetchSpy,
  }),
}));

vi.mock('@/hooks/usePersonaMemoryGraph', () => ({
  usePersonaMemoryGraph: () => ({
    graph: null,
    isLoading: false,
    error: null,
    refetch: memoryGraphRefetchSpy,
  }),
}));

describe('UserDetection investigation mode', () => {
  beforeEach(() => {
    createTaskSpy.mockClear();
    reviewTaskSpy.mockClear();
    tasksRefetchSpy.mockClear();
    personaRefetchSpy.mockClear();
    evidenceRefetchSpy.mockClear();
    memoryGraphRefetchSpy.mockClear();

    mockTasksState = {
      tasks: [],
      latestTask: null,
      activeTask: null,
      hasActiveTask: false,
      isLoading: false,
      isCreatingTask: false,
      error: null,
      refetch: tasksRefetchSpy,
      createTask: createTaskSpy,
      reviewTask: reviewTaskSpy,
    };
  });

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

  it('drills from persona graph back into investigation mode with selected user', async () => {
    render(<UserDetection />);

    fireEvent.click(screen.getByText('查看全量图谱'));
    fireEvent.click(screen.getByText('用户A Persona'));

    expect(screen.getByText('高危候选队列')).toBeInTheDocument();
    expect(screen.getByText('当前选中用户')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('does not refetch persona data immediately after creating a queued task', async () => {
    render(<UserDetection />);

    fireEvent.click(screen.getAllByText('用户A')[0]!);
    fireEvent.click(screen.getByText('发起蒸馏'));

    await waitFor(() => {
      expect(createTaskSpy).toHaveBeenCalled();
    });

    expect(personaRefetchSpy).not.toHaveBeenCalled();
    expect(evidenceRefetchSpy).not.toHaveBeenCalled();
    expect(memoryGraphRefetchSpy).not.toHaveBeenCalled();
  });

  it('refreshes persona data after the last running task completes', async () => {
    const activeTask = {
      id: 'task-1',
      weiboUserId: '100',
      eventId: null,
      status: 'queued',
      historyWindowDays: 90,
      sourcePostCount: 0,
      sourceCommentCount: 0,
      sourceRepostCount: 0,
      evidenceSampleCount: 0,
      model: null,
      promptVersion: null,
      distilledSummary: null,
      reviewStatus: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    };

    mockTasksState = {
      ...mockTasksState,
      tasks: [activeTask],
      latestTask: activeTask,
      activeTask,
      hasActiveTask: true,
    };

    const view = render(<UserDetection />);

    fireEvent.click(screen.getAllByText('用户A')[0]!);

    personaRefetchSpy.mockClear();
    evidenceRefetchSpy.mockClear();
    memoryGraphRefetchSpy.mockClear();

    const completedTask = {
      ...activeTask,
      status: 'published',
      sourcePostCount: 20,
      sourceCommentCount: 2,
      sourceRepostCount: 3,
      evidenceSampleCount: 5,
      distilledSummary: '画像已生成',
      reviewStatus: 'auto_pass',
      completedAt: '2026-04-23T00:01:00.000Z',
      updatedAt: '2026-04-23T00:01:00.000Z',
    };

    mockTasksState = {
      ...mockTasksState,
      tasks: [completedTask],
      latestTask: completedTask,
      activeTask: null,
      hasActiveTask: false,
    };

    view.rerender(<UserDetection />);

    await waitFor(() => {
      expect(personaRefetchSpy).toHaveBeenCalled();
      expect(evidenceRefetchSpy).toHaveBeenCalled();
      expect(memoryGraphRefetchSpy).toHaveBeenCalled();
    });
  });
});
