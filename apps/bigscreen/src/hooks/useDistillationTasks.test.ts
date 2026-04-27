import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDistillationTasks } from './useDistillationTasks';
import { UsersAPI } from '@/services/api/users';

vi.mock('@/services/api/users', () => ({
  UsersAPI: {
    getDistillationTasks: vi.fn(),
    createDistillationTask: vi.fn(),
    reviewDistillationTask: vi.fn(),
  },
}));

describe('useDistillationTasks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls while the latest task is still running', async () => {
    vi.mocked(UsersAPI.getDistillationTasks)
      .mockResolvedValueOnce([{
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
      }])
      .mockResolvedValueOnce([{
        id: 'task-1',
        weiboUserId: '100',
        eventId: null,
        status: 'published',
        historyWindowDays: 90,
        sourcePostCount: 20,
        sourceCommentCount: 2,
        sourceRepostCount: 3,
        evidenceSampleCount: 5,
        model: 'gpt-5',
        promptVersion: 'v1',
        distilledSummary: '画像已生成',
        reviewStatus: 'auto_pass',
        errorMessage: null,
        startedAt: '2026-04-23T00:00:00.000Z',
        completedAt: '2026-04-23T00:01:00.000Z',
        createdAt: '2026-04-23T00:00:00.000Z',
        updatedAt: '2026-04-23T00:01:00.000Z',
      }]);

    const { result } = renderHook(() => useDistillationTasks({ userId: '100' }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.tasks[0]?.status).toBe('queued');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.tasks[0]?.status).toBe('published');

    expect(UsersAPI.getDistillationTasks).toHaveBeenCalledTimes(2);
  });
});
