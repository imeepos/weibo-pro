import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service';
import { useEntityManager, UserProfileDistillationTaskEntity } from '@sker/entities';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn(),
    UserProfileDistillationTaskEntity: class UserProfileDistillationTaskEntity {},
  };
});

describe('UsersService distillation flow', () => {
  const savedTasks: any[] = [];
  let taskCounter = 0;
  let service: UsersService;
  let historyCollectionService: { collect: ReturnType<typeof vi.fn> };
  let userDossierService: { getDossier: ReturnType<typeof vi.fn> };
  let userProfileDistillationService: { distill: ReturnType<typeof vi.fn> };
  let personaProjectionService: { publishProfile: ReturnType<typeof vi.fn> };

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    savedTasks.length = 0;
    taskCounter = 0;

    historyCollectionService = {
      collect: vi.fn().mockResolvedValue({
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
      }),
    };
    userDossierService = {
      getDossier: vi.fn().mockResolvedValue({
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
        behaviorTimeline: { postingByDay: [], postingByHour: [], interactionByDay: [], spikeMoments: [], activePeriods: [] },
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
        evidenceSamples: { eventSamples: [], historySamples: [], relationSamples: [], nlpSamples: [] },
        preDistillationSummary: { candidateLabels: [], anomalyHints: [], coverageWarnings: [], humanReviewNeeded: false },
      }),
    };
    userProfileDistillationService = {
      distill: vi.fn().mockResolvedValue({
        summary: { short: '短摘要', long: '长摘要', confidence: 0.9 },
        identity: { inferredRole: '热点自媒体', roleConfidence: 0.8, accountNature: ['media'], stableTraits: ['热点追逐'] },
        behavior: { activityPattern: ['夜间活跃'], postingRhythm: 'bursty', escalationPattern: ['突发追热点'], historicalStability: 'medium' },
        content: { primaryTopics: ['体育'], narrativeStyles: ['情绪放大'], emotionalTendency: ['negative'], stancePattern: ['对立'] },
        risk: {
          overallLevel: 'high',
          overallScore: 87,
          riskDrivers: [{ label: '情绪极化', reason: '负向占比高', confidence: 0.8 }],
          reviewRecommendation: 'auto_pass',
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
      }),
    };
    personaProjectionService = { publishProfile: vi.fn().mockResolvedValue(undefined) };

    vi.mocked(useEntityManager).mockImplementation(async (handler: any) => {
      const matchesWhere = (item: any, where: any): boolean => {
        if (!where) {
          return true;
        }

        if (Array.isArray(where)) {
          return where.some((entry) => matchesWhere(item, entry));
        }

        return Object.entries(where).every(([key, value]) => item[key] === value);
      };

      const repo = {
        async findOne(options: any) {
          if (options?.where?.id) {
            return savedTasks.find((item) => item.id === options.where.id) ?? null;
          }
          return null;
        },
        create(input: any) {
          return {
            id: input.id ?? `task-${++taskCounter}`,
            weibo_user_id: input.weibo_user_id,
            event_id: input.event_id ?? null,
            status: input.status,
            history_window_days: input.history_window_days ?? 90,
            source_post_count: input.source_post_count ?? 0,
            source_comment_count: input.source_comment_count ?? 0,
            source_repost_count: input.source_repost_count ?? 0,
            evidence_sample_count: input.evidence_sample_count ?? 0,
            model: input.model ?? null,
            prompt_version: input.prompt_version ?? null,
            distilled_summary: input.distilled_summary ?? null,
            distilled_json: input.distilled_json ?? null,
            review_status: input.review_status ?? null,
            error_message: input.error_message ?? null,
            started_at: input.started_at ?? null,
            completed_at: input.completed_at ?? null,
            created_at: input.created_at ?? new Date('2026-04-23T00:00:00.000Z'),
            updated_at: input.updated_at ?? new Date('2026-04-23T00:00:00.000Z'),
          };
        },
        async save(entity: any) {
          const index = savedTasks.findIndex((item) => item.id === entity.id);
          if (index >= 0) savedTasks[index] = { ...savedTasks[index], ...entity, updated_at: new Date('2026-04-23T00:00:00.000Z') };
          else savedTasks.push({ ...entity });
          return savedTasks.find((item) => item.id === entity.id);
        },
        async find(options: any) {
          return savedTasks
            .filter((item) => matchesWhere(item, options?.where))
            .sort((a, b) => +b.created_at - +a.created_at);
        },
      };

      const manager = {
        getRepository(entity: any) {
          if (entity === UserProfileDistillationTaskEntity) return repo;
          return {
            ...repo,
            async findOne() {
              return {
                id: 100n,
                screen_name: '用户A',
                name: '用户A',
                avatar_hd: null,
                avatar_large: null,
                profile_image_url: null,
              };
            },
          };
        },
      };

      return handler(manager);
    });

    service = new UsersService(
      { getOrSet: vi.fn() } as any,
      { getQueue: vi.fn() } as any,
      userDossierService as any,
      historyCollectionService as any,
      userProfileDistillationService as any,
      personaProjectionService as any,
    );
  });

  it('creates, executes, and auto-publishes a distillation task', async () => {
    const result = await service.createDistillationTask('100', {
      eventId: 'event-1',
      historyWindowDays: 90,
    });

    expect(result.status).toBe('queued');
    expect(result.distilledSummary).toBe('任务已入队，等待开始抓取历史发帖');

    await vi.waitFor(() => {
      expect(historyCollectionService.collect).toHaveBeenCalled();
      expect(userDossierService.getDossier).toHaveBeenCalled();
      expect(userProfileDistillationService.distill).toHaveBeenCalled();
      expect(personaProjectionService.publishProfile).toHaveBeenCalled();
      expect(savedTasks.find((item) => item.id === result.id)?.status).toBe('published');
    });
  });

  it('refreshes task summary while distillation stays in analyzing', async () => {
    vi.useFakeTimers();
    vi.stubEnv('USER_PROFILE_DISTILLATION_PROGRESS_HEARTBEAT_MS', '1000');

    let resolveDistill: ((value: any) => void) | null = null;
    userProfileDistillationService.distill.mockImplementation(
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
      expect(savedTasks.find((item) => item.id === result.id)?.status).toBe('analyzing');
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(savedTasks.find((item) => item.id === result.id)?.distilled_summary).toContain('正在生成画像');
    expect(savedTasks.find((item) => item.id === result.id)?.distilled_summary).toContain('已等待');

    resolveDistill?.({
      summary: { short: '短摘要', long: '长摘要', confidence: 0.9 },
      identity: { inferredRole: '热点自媒体', roleConfidence: 0.8, accountNature: ['media'], stableTraits: ['热点追逐'] },
      behavior: { activityPattern: ['夜间活跃'], postingRhythm: 'bursty', escalationPattern: ['突发追热点'], historicalStability: 'medium' },
      content: { primaryTopics: ['体育'], narrativeStyles: ['情绪放大'], emotionalTendency: ['negative'], stancePattern: ['对立'] },
      risk: {
        overallLevel: 'high',
        overallScore: 87,
        riskDrivers: [{ label: '情绪极化', reason: '负向占比高', confidence: 0.8 }],
        reviewRecommendation: 'auto_pass',
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
        promptVersion: 'v2',
        generatedAt: '2026-04-23T00:00:00.000Z',
      },
    });

    await vi.runAllTimersAsync();

    await vi.waitFor(() => {
      expect(savedTasks.find((item) => item.id === result.id)?.status).toBe('published');
    });
  });

  it('fails distillation tasks that exceed the analyze timeout', async () => {
    vi.useFakeTimers();
    vi.stubEnv('USER_PROFILE_DISTILLATION_TIMEOUT_MS', '1000');
    vi.stubEnv('USER_PROFILE_DISTILLATION_PROGRESS_HEARTBEAT_MS', '1000');

    userProfileDistillationService.distill.mockImplementation(
      () => new Promise(() => undefined),
    );

    const result = await service.createDistillationTask('100', {
      eventId: 'event-1',
      historyWindowDays: 90,
    });

    await vi.waitFor(() => {
      expect(savedTasks.find((item) => item.id === result.id)?.status).toBe('analyzing');
    });

    await vi.advanceTimersByTimeAsync(1000);

    await vi.waitFor(() => {
      expect(savedTasks.find((item) => item.id === result.id)?.status).toBe('failed');
    });
    expect(savedTasks.find((item) => item.id === result.id)?.error_message).toContain('超时');
  });

  it('returns the queued task before long-running collection completes', async () => {
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

    resolveCollection?.();

    await vi.waitFor(() => {
      expect(savedTasks.find((item) => item.id === raced.task.id)?.status).toBe('published');
    });
  });

  it('returns the existing active distillation task instead of enqueueing a duplicate', async () => {
    (service as any).processStartedAt = new Date('2026-04-23T00:00:00.000Z');

    savedTasks.push({
      id: 'task-active',
      weibo_user_id: '100',
      event_id: null,
      status: 'crawling',
      history_window_days: 90,
      source_post_count: 0,
      source_comment_count: 0,
      source_repost_count: 0,
      evidence_sample_count: 0,
      model: null,
      prompt_version: null,
      distilled_summary: null,
      distilled_json: null,
      review_status: null,
      error_message: null,
      started_at: new Date('2026-04-23T00:10:00.000Z'),
      completed_at: null,
      created_at: new Date('2026-04-23T00:00:00.000Z'),
      updated_at: new Date('2026-04-23T00:10:00.000Z'),
    });

    const result = await service.createDistillationTask('100', {
      historyWindowDays: 90,
    });

    expect(result.id).toBe('task-active');
    expect(result.status).toBe('crawling');
    expect(historyCollectionService.collect).not.toHaveBeenCalled();
    expect(savedTasks.filter((item) => item.weibo_user_id === '100')).toHaveLength(1);
  });

  it('reclaims orphaned active tasks before duplicate detection and starts a new task', async () => {
    let resolveCollection: (() => void) | null = null;
    historyCollectionService.collect.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCollection = resolve;
        }),
    );

    savedTasks.push({
      id: 'task-orphaned-before-create',
      weibo_user_id: '100',
      event_id: null,
      status: 'crawling',
      history_window_days: 90,
      source_post_count: 0,
      source_comment_count: 0,
      source_repost_count: 0,
      evidence_sample_count: 0,
      model: null,
      prompt_version: null,
      distilled_summary: null,
      distilled_json: null,
      review_status: null,
      error_message: null,
      started_at: new Date('2026-04-23T00:05:00.000Z'),
      completed_at: null,
      created_at: new Date('2026-04-23T00:00:00.000Z'),
      updated_at: new Date('2026-04-23T00:05:00.000Z'),
    });

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

    resolveCollection?.();
  });

  it('marks active tasks from a previous api process as failed during startup', async () => {
    savedTasks.push({
      id: 'task-orphaned',
      weibo_user_id: '100',
      event_id: null,
      status: 'crawling',
      history_window_days: 90,
      source_post_count: 0,
      source_comment_count: 0,
      source_repost_count: 0,
      evidence_sample_count: 0,
      model: null,
      prompt_version: null,
      distilled_summary: null,
      distilled_json: null,
      review_status: null,
      error_message: null,
      started_at: new Date('2026-04-23T00:05:00.000Z'),
      completed_at: null,
      created_at: new Date('2026-04-23T00:00:00.000Z'),
      updated_at: new Date('2026-04-23T00:05:00.000Z'),
    });

    (service as any).processStartedAt = new Date('2026-04-23T00:15:00.000Z');

    await (service as any).onInit();

    expect(savedTasks[0]?.status).toBe('failed');
    expect(savedTasks[0]?.completed_at).toBeInstanceOf(Date);
    expect(savedTasks[0]?.error_message).toContain('服务重启');
  });

  it('publishes a review-pending task when human approves it', async () => {
    savedTasks.push({
      id: 'task-review',
      weibo_user_id: '100',
      event_id: 'event-1',
      status: 'review_pending',
      history_window_days: 90,
      source_post_count: 20,
      source_comment_count: 0,
      source_repost_count: 3,
      evidence_sample_count: 1,
      model: 'gpt-5',
      prompt_version: 'v1',
      distilled_summary: '短摘要',
      distilled_json: userProfileDistillationService.distill.mock.results[0]?.value ?? {
        summary: { short: '短摘要', long: '长摘要', confidence: 0.9 },
        identity: { inferredRole: '热点自媒体', roleConfidence: 0.8, accountNature: ['media'], stableTraits: ['热点追逐'] },
        behavior: { activityPattern: ['夜间活跃'], postingRhythm: 'bursty', escalationPattern: ['突发追热点'], historicalStability: 'medium' },
        content: { primaryTopics: ['体育'], narrativeStyles: ['情绪放大'], emotionalTendency: ['negative'], stancePattern: ['对立'] },
        risk: { overallLevel: 'high', overallScore: 87, riskDrivers: [{ label: '情绪极化', reason: '负向占比高', confidence: 0.8 }], reviewRecommendation: 'human_review' },
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
      },
      review_status: 'human_pending',
      error_message: null,
      started_at: null,
      completed_at: null,
      created_at: new Date('2026-04-23T00:00:00.000Z'),
      updated_at: new Date('2026-04-23T00:00:00.000Z'),
    });

    const result = await service.reviewDistillationTask('task-review', {
      decision: 'approve',
    });

    expect(personaProjectionService.publishProfile).toHaveBeenCalled();
    expect(result.status).toBe('published');
    expect(result.reviewStatus).toBe('human_approved');
  });
});
