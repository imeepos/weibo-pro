import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityManager, UserProfileDistillationTaskEntity } from '@sker/entities';
import { setupInvestigationFlowTest } from './users.investigation-flow.test-helper';
import { baseDossierResult, buildDossierResult, buildDistilledProfile } from './users.investigation-flow.fixtures';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn(),
    UserProfileDistillationTaskEntity: class UserProfileDistillationTaskEntity {},
  };
});

describe('UsersService distillation flow - progress & timeout', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  let ctx: ReturnType<typeof setupInvestigationFlowTest>;

  beforeEach(() => {
    ctx = setupInvestigationFlowTest(vi.mocked(useEntityManager), UserProfileDistillationTaskEntity);
  });

  it('refreshes task summary while distillation stays in aggregating', async () => {
    const { service, savedTasks, userDossierService, userProfileDistillationService } = ctx;

    vi.useFakeTimers();
    vi.stubEnv('USER_PROFILE_DISTILLATION_PROGRESS_HEARTBEAT_MS', '1000');

    userDossierService.getDossier.mockResolvedValue(
      buildDossierResult({
        historyCoverage: { ...baseDossierResult.historyCoverage, collectedPostCount: 903 },
      }),
    );

    let resolveDistill: ((value: any) => void) | null = null;
    userProfileDistillationService.distillFromAggregatedInput.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDistill = resolve;
        }),
    );

    const result = await service.createDistillationTask('100', {
      eventId: 'event-1',
      historyWindowDays: 90,
    });

    await vi.waitFor(() => {
      expect(savedTasks.find((item) => item.id === result.id)?.status).toBe('aggregating');
    });
    expect(savedTasks.find((item) => item.id === result.id)?.source_post_count).toBe(903);

    await vi.advanceTimersByTimeAsync(1000);

    expect(savedTasks.find((item) => item.id === result.id)?.distilled_summary).toContain('正在生成画像');
    expect(savedTasks.find((item) => item.id === result.id)?.distilled_summary).toContain('已等待');

    (resolveDistill as ((value: any) => void) | null)?.(buildDistilledProfile({
      metadata: {
        sampledPosts: 20,
        sampledComments: 0,
        sampledReposts: 3,
        windowDays: 90,
        model: 'gpt-5',
        promptVersion: 'v2',
        generatedAt: '2026-04-23T00:00:00.000Z',
      },
    }));

    await vi.runAllTimersAsync();

    await vi.waitFor(() => {
      expect(savedTasks.find((item) => item.id === result.id)?.status).toBe('published');
    });
  });

  it('fails distillation tasks that exceed the analyze timeout', async () => {
    const { service, savedTasks, userProfileDistillationService } = ctx;

    vi.useFakeTimers();
    vi.stubEnv('USER_PROFILE_DISTILLATION_TIMEOUT_MS', '1000');
    vi.stubEnv('USER_PROFILE_DISTILLATION_PROGRESS_HEARTBEAT_MS', '1000');

    userProfileDistillationService.distillFromAggregatedInput.mockImplementation(
      () => new Promise(() => undefined),
    );

    const result = await service.createDistillationTask('100', {
      eventId: 'event-1',
      historyWindowDays: 90,
    });

    await vi.waitFor(() => {
      expect(savedTasks.find((item) => item.id === result.id)?.status).toBe('aggregating');
    });

    await vi.advanceTimersByTimeAsync(1000);

    await vi.waitFor(() => {
      expect(savedTasks.find((item) => item.id === result.id)?.status).toBe('failed');
    });
    expect(savedTasks.find((item) => item.id === result.id)?.error_message).toContain('超时');
  });

  it('returns the queued task before long-running collection completes', async () => {
    const { service, savedTasks, historyCollectionService } = ctx;

    let resolveCollection: (() => void) | null = null;
    historyCollectionService.collect.mockImplementation(
      () =>
        new Promise<any>((resolve) => {
          resolveCollection = () => resolve({
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
          });
        }),
    );

    const raced = await Promise.race([
      service.createDistillationTask('100', {
        eventId: 'event-1',
        historyWindowDays: 90,
      }).then((task) => ({ type: 'task' as const, task })),
      new Promise<{ type: 'timeout' }>((resolve) =>
        setTimeout(() => resolve({ type: 'timeout' }), 50),
      ),
    ]);

    expect(raced.type).toBe('task');
    if (raced.type !== 'task') {
      return;
    }

    expect(raced.task.status).toBe('queued');

    await vi.waitFor(() => {
      expect(historyCollectionService.collect).toHaveBeenCalled();
      expect(resolveCollection).not.toBeNull();
    });

    (resolveCollection as (() => void) | null)?.();

    await vi.waitFor(() => {
      expect(savedTasks.find((item) => item.id === raced.task.id)?.status).toBe('published');
    });
  });
});
