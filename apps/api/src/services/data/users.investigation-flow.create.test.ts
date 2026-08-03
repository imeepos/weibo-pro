import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityManager, UserProfileDistillationTaskEntity } from '@sker/entities';
import { setupInvestigationFlowTest } from './users.investigation-flow.test-helper';
import { buildDistilledProfile } from './users.investigation-flow.fixtures';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn(),
    UserProfileDistillationTaskEntity: class UserProfileDistillationTaskEntity {},
  };
});

describe('UsersService distillation flow - create & publish', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  let ctx: ReturnType<typeof setupInvestigationFlowTest>;

  beforeEach(() => {
    ctx = setupInvestigationFlowTest(vi.mocked(useEntityManager), UserProfileDistillationTaskEntity);
  });

  it('creates, executes, and auto-publishes a distillation task', async () => {
    const {
      service,
      savedTasks,
      historyCollectionService,
      userDossierService,
      userProfileDistillationService,
      personaProjectionService,
    } = ctx;

    const result = await service.createDistillationTask('100', {
      eventId: 'event-1',
      historyWindowDays: 90,
    });

    expect(result.status).toBe('queued');
    expect(result.distilledSummary).toBe('任务已入队，等待开始抓取历史发帖');

    await vi.waitFor(() => {
      expect(historyCollectionService.collect).toHaveBeenCalled();
      expect(userDossierService.getDossier).toHaveBeenCalled();
      expect(userProfileDistillationService.distillFromAggregatedInput).toHaveBeenCalled();
      expect(personaProjectionService.publishProfile).toHaveBeenCalled();
      expect(savedTasks.find((item) => item.id === result.id)?.status).toBe('published');
    });
  });

  it('falls back to dossier distillation when aggregated profile generation fails', async () => {
    const { service, savedTasks, userProfileDistillationService } = ctx;

    userProfileDistillationService.distillFromAggregatedInput.mockRejectedValue(
      new Error('Invalid input: expected object, received undefined'),
    );

    const result = await service.createDistillationTask('100', {
      eventId: 'event-1',
      historyWindowDays: 90,
    });

    await vi.waitFor(() => {
      const saved = savedTasks.find((item) => item.id === result.id);
      expect(userProfileDistillationService.distillFromAggregatedInput).toHaveBeenCalledTimes(1);
      expect(userProfileDistillationService.distill).toHaveBeenCalledTimes(1);
      expect(saved?.status).toBe('published');
      expect(saved?.warnings_json).toContain(
        '聚合画像生成失败，已回退到原始 dossier 蒸馏：Invalid input: expected object, received undefined',
      );
    });
  });

  it('tracks crawling extracting aggregating progress and keeps partial warnings', async () => {
    const {
      service,
      savedTasks,
      historyCollectionService,
      postExtractionService,
      aggregationService,
      userProfileDistillationService,
    } = ctx;

    const distilledProfile = buildDistilledProfile({
      risk: {
        overallLevel: 'high',
        overallScore: 87,
        riskDrivers: [],
        reviewRecommendation: 'auto_pass',
      },
      metadata: {
        sampledPosts: 12,
        sampledComments: 0,
        sampledReposts: 0,
        windowDays: 90,
        model: 'gpt-5',
        promptVersion: 'v3',
        generatedAt: '2026-04-28T01:10:00.000Z',
        extractorVersion: 'post-v1',
        aggregationVersion: 'agg-v1',
        eventWindowCount: 1,
        coordinationSignalCount: 0,
      },
    });

    historyCollectionService.collect.mockResolvedValue({
      status: 'partial',
      page: 2,
      collectedPostCount: 12,
      newPostCount: 12,
      duplicatePostCount: 0,
      failedPageCount: 1,
      latestPostAt: '2026-04-28T01:00:00.000Z',
      oldestPostAt: '2026-04-21T01:00:00.000Z',
      partial: true,
      warnings: ['第 3 页长时间无进展，已继续分析'],
      message: '历史发帖抓取出现停滞，已基于 12 条帖子继续分析',
    });

    postExtractionService.extractForUser.mockResolvedValue({
      extractorVersion: 'post-v1',
      total: 12,
      reusedCount: 8,
      extractedCount: 3,
      failedCount: 1,
      warnings: ['帖子 998 提取失败：timeout'],
      items: [],
    });

    aggregationService.aggregate.mockResolvedValue({
      tree: [],
      timeline: [],
      coordinationSignals: [],
      stats: { totalEvents: 1, totalWarnings: 2 },
    });

    userProfileDistillationService.distillFromAggregatedInput.mockResolvedValue(distilledProfile);

    const result = await service.createDistillationTask('100', { historyWindowDays: 90 });

    await vi.waitFor(() => {
      const saved = savedTasks.find((item) => item.id === result.id);
      expect(saved?.status).toBe('published');
      expect(saved?.progress_json?.stage).toBe('publishing');
      expect(saved?.progress_json?.partial).toBe(true);
      expect(saved?.progress_json?.counters.reusedExtractions).toBe(8);
      expect(saved?.warnings_json).toContain('帖子 998 提取失败：timeout');
    });
  });
});
