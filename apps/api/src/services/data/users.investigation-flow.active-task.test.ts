import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityManager, UserProfileDistillationTaskEntity } from '@sker/entities';
import { setupInvestigationFlowTest } from './users.investigation-flow.test-helper';
import { baseDistilledProfile, buildDistilledProfile, buildTaskRow } from './users.investigation-flow.fixtures';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn(),
    UserProfileDistillationTaskEntity: class UserProfileDistillationTaskEntity {},
  };
});

describe('UsersService distillation flow - active task & review', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  let ctx: ReturnType<typeof setupInvestigationFlowTest>;

  beforeEach(() => {
    ctx = setupInvestigationFlowTest(vi.mocked(useEntityManager), UserProfileDistillationTaskEntity);
  });

  it('returns the existing active distillation task instead of enqueueing a duplicate', async () => {
    const { service, savedTasks, historyCollectionService } = ctx;

    (service as any).processStartedAt = new Date('2026-04-23T00:00:00.000Z');

    savedTasks.push(buildTaskRow());

    const result = await service.createDistillationTask('100', {
      historyWindowDays: 90,
    });

    expect(result.id).toBe('task-active');
    expect(result.status).toBe('crawling');
    expect(historyCollectionService.collect).not.toHaveBeenCalled();
    expect(savedTasks.filter((item) => item.weibo_user_id === '100')).toHaveLength(1);
  });

  it('reclaims orphaned active tasks before duplicate detection and starts a new task', async () => {
    const { service, savedTasks, historyCollectionService } = ctx;

    let resolveCollection: (() => void) | null = null;
    historyCollectionService.collect.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCollection = resolve;
        }),
    );

    savedTasks.push(
      buildTaskRow({
        id: 'task-orphaned-before-create',
        started_at: new Date('2026-04-23T00:05:00.000Z'),
        updated_at: new Date('2026-04-23T00:05:00.000Z'),
      }),
    );

    (service as any).processStartedAt = new Date('2026-04-23T00:15:00.000Z');

    const result = await service.createDistillationTask('100', {
      historyWindowDays: 90,
    });

    expect(result.id).not.toBe('task-orphaned-before-create');
    expect(result.status).toBe('queued');
    expect(savedTasks.find((item) => item.id === 'task-orphaned-before-create')?.status).toBe('failed');
    expect(savedTasks.find((item) => item.id === 'task-orphaned-before-create')?.error_message).toContain('服务重启');

    await vi.waitFor(() => {
      expect(historyCollectionService.collect).toHaveBeenCalled();
      expect(resolveCollection).not.toBeNull();
    });

    (resolveCollection as (() => void) | null)?.();
  });

  it('marks active tasks from a previous api process as failed during startup', async () => {
    const { service, savedTasks } = ctx;

    savedTasks.push(
      buildTaskRow({
        id: 'task-orphaned',
        started_at: new Date('2026-04-23T00:05:00.000Z'),
        updated_at: new Date('2026-04-23T00:05:00.000Z'),
      }),
    );

    (service as any).processStartedAt = new Date('2026-04-23T00:15:00.000Z');

    await (service as any).onInit();

    expect(savedTasks[0]?.status).toBe('failed');
    expect(savedTasks[0]?.completed_at).toBeInstanceOf(Date);
    expect(savedTasks[0]?.error_message).toContain('服务重启');
  });

  it('publishes a review-pending task when human approves it', async () => {
    const { service, savedTasks, personaProjectionService } = ctx;

    savedTasks.push(
      buildTaskRow({
        id: 'task-review',
        event_id: 'event-1',
        status: 'review_pending',
        source_post_count: 20,
        source_repost_count: 3,
        evidence_sample_count: 1,
        model: 'gpt-5',
        prompt_version: 'v1',
        distilled_summary: '短摘要',
        distilled_json: buildDistilledProfile({
          risk: { ...baseDistilledProfile.risk, reviewRecommendation: 'human_review' },
        }),
        review_status: 'human_pending',
        started_at: null,
        updated_at: new Date('2026-04-23T00:00:00.000Z'),
      }),
    );

    const result = await service.reviewDistillationTask('task-review', {
      decision: 'approve',
    });

    expect(personaProjectionService.publishProfile).toHaveBeenCalled();
    expect(result.status).toBe('published');
    expect(result.reviewStatus).toBe('human_approved');
  });
});
