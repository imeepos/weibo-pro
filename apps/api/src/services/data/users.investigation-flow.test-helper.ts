import { vi } from 'vitest';
import { UsersService } from './users.service';
import {
  aggregationDefaultResult,
  baseDistilledProfile,
  baseDossierResult,
  historyCollectionCompletedResult,
  postExtractionDefaultResult,
  sourcePostRowsFixture,
} from './users.investigation-flow.fixtures';

export interface InvestigationFlowServiceHarness {
  service: UsersService;
  savedTasks: any[];
  savedSourcePosts: any[];
  historyCollectionService: { collect: ReturnType<typeof vi.fn> };
  userDossierService: { getDossier: ReturnType<typeof vi.fn> };
  userProfileDistillationService: {
    distill: ReturnType<typeof vi.fn>;
    distillFromAggregatedInput: ReturnType<typeof vi.fn>;
  };
  personaProjectionService: { publishProfile: ReturnType<typeof vi.fn> };
  postExtractionService: { extractForUser: ReturnType<typeof vi.fn> };
  aggregationService: { aggregate: ReturnType<typeof vi.fn> };
}

/**
 * 构造一次完整的 distillation-flow 测试环境：
 * - 新鲜的 savedTasks / savedSourcePosts 内存仓库
 * - 各依赖服务的 vi.fn() mock（默认 resolve 公共 fixtures）
 * - useEntityManager 的内存版实现
 * - 组装 UsersService 实例
 *
 * 每次调用都会创建独立状态，供 beforeEach 中逐个测试重置。
 */
export function setupInvestigationFlowTest(
  entityManager: ReturnType<typeof vi.fn>,
  taskEntity: any,
): InvestigationFlowServiceHarness {
  const savedTasks: any[] = [];
  const savedSourcePosts: any[] = [];
  let taskCounter = 0;
  let sourcePostCounter = 0;

  const historyCollectionService = {
    collect: vi.fn().mockResolvedValue(historyCollectionCompletedResult),
  };
  const userDossierService = {
    getDossier: vi.fn().mockResolvedValue(baseDossierResult),
  };
  const userProfileDistillationService = {
    distill: vi.fn().mockResolvedValue(baseDistilledProfile),
    distillFromAggregatedInput: vi.fn().mockResolvedValue(baseDistilledProfile),
  };
  const personaProjectionService = { publishProfile: vi.fn().mockResolvedValue(undefined) };
  const postExtractionService = {
    extractForUser: vi.fn().mockResolvedValue(postExtractionDefaultResult),
  };
  const aggregationService = {
    aggregate: vi.fn().mockResolvedValue(aggregationDefaultResult),
  };

  entityManager.mockImplementation(async (handler: any) => {
    const matchesWhere = (item: any, where: any): boolean => {
      if (!where) {
        return true;
      }

      if (Array.isArray(where)) {
        return where.some((entry) => matchesWhere(item, entry));
      }

      return Object.entries(where).every(([key, value]) => item[key] === value);
    };

    const taskRepo = {
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
          progress_json: input.progress_json ?? null,
          warnings_json: input.warnings_json ?? null,
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

    const sourcePostRepo = {
      async findOne(options: any) {
        const where = options?.where ?? {};
        return (
          savedSourcePosts.find(
            (item) =>
              matchesWhere(item, where) ||
              (where.weibo_user_id === item.weibo_user_id && where.post_id === item.post_id),
          ) ?? null
        );
      },
      create(input: any) {
        return {
          id: input.id ?? `source-${++sourcePostCounter}`,
          weibo_user_id: input.weibo_user_id,
          post_id: input.post_id,
          source_kind: input.source_kind ?? 'post',
          post_created_at: input.post_created_at ?? null,
          content_fingerprint: input.content_fingerprint,
          normalized_text: input.normalized_text,
          source_snapshot: input.source_snapshot ?? {},
          first_seen_at: input.first_seen_at ?? new Date('2026-04-23T00:00:00.000Z'),
          last_seen_at: input.last_seen_at ?? new Date('2026-04-23T00:00:00.000Z'),
          latest_task_id: input.latest_task_id ?? null,
          created_at: input.created_at ?? new Date('2026-04-23T00:00:00.000Z'),
          updated_at: input.updated_at ?? new Date('2026-04-23T00:00:00.000Z'),
        };
      },
      async save(entity: any) {
        const index = savedSourcePosts.findIndex((item) => item.id === entity.id);
        if (index >= 0) {
          savedSourcePosts[index] = {
            ...savedSourcePosts[index],
            ...entity,
            updated_at: new Date('2026-04-23T00:00:00.000Z'),
          };
        } else {
          savedSourcePosts.push({ ...entity });
        }
        return savedSourcePosts.find((item) => item.id === entity.id);
      },
      async find(options: any) {
        return savedSourcePosts.filter((item) => matchesWhere(item, options?.where));
      },
    };

    const manager = {
      async query() {
        return sourcePostRowsFixture;
      },
      getRepository(entity: any) {
        if (entity === taskEntity) return taskRepo;
        if (entity?.name === 'UserProfileSourcePostEntity') return sourcePostRepo;
        return {
          ...taskRepo,
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

  const service = new UsersService(
    { getOrSet: vi.fn() } as any,
    { getQueue: vi.fn() } as any,
    userDossierService as any,
    historyCollectionService as any,
    userProfileDistillationService as any,
    personaProjectionService as any,
    postExtractionService as any,
    aggregationService as any,
  );

  return {
    service,
    savedTasks,
    savedSourcePosts,
    historyCollectionService,
    userDossierService,
    userProfileDistillationService,
    personaProjectionService,
    postExtractionService,
    aggregationService,
  };
}
