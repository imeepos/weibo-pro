import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserDetection from './UserDetection';
import {
  dossierFixture,
  queuedTaskFixture,
  completedTaskFixture,
} from './UserDetection.investigation.test.fixtures';

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
    dossier: dossierFixture,
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
      isRefreshing: false,
      isCreatingTask: false,
      error: null,
      refetch: tasksRefetchSpy,
      createTask: createTaskSpy,
      reviewTask: reviewTaskSpy,
    };
  });

  it('renders queue, dossier, and distillation workspace in one page', () => {
    render(<UserDetection />);

    expect(screen.getByText('重点用户队列')).toBeInTheDocument();
    expect(screen.getByText('用户档案')).toBeInTheDocument();
    expect(screen.getByText('AI 蒸馏画像')).toBeInTheDocument();
  });

  it('switches between investigation mode and persona graph mode', async () => {
    render(<UserDetection />);

    fireEvent.click(screen.getByText('查看全量图谱'));
    expect(screen.getByText('全量 Persona 图谱')).toBeInTheDocument();

    fireEvent.click(screen.getByText('返回调查模式'));
    expect(screen.getByText('重点用户队列')).toBeInTheDocument();
  });

  it('drills from persona graph back into investigation mode with selected user', async () => {
    render(<UserDetection />);

    fireEvent.click(screen.getByText('查看全量图谱'));
    fireEvent.click(screen.getByText('用户A Persona'));

    expect(screen.getByText('重点用户队列')).toBeInTheDocument();
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
    const activeTask = queuedTaskFixture;

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

    const completedTask = completedTaskFixture;

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
