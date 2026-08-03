import { Injectable, Inject, OnInit } from '@sker/core';
import {
  UserProfileDistillationTaskEntity,
  WeiboUserEntity,
  useEntityManager,
} from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import type { TimeRange } from './types';
import type {
  CreateDistillationTaskRequest,
  DistillationTaskSummary,
  ReviewDistillationTaskRequest,
  UserInvestigationDossier,
  UserInvestigationQueueQuery,
  UserInvestigationQueueResponse,
} from '@sker/sdk';
import { InvestigationQueueService } from './investigation/investigation-queue.service';
import { UserDossierService } from './investigation/user-dossier.service';
import { UserHistoryCollectionService } from './investigation/user-history-collection.service';
import { UserProfileAggregationService } from './investigation/user-profile-aggregation.service';
import { UserProfileDistillationService } from './investigation/user-profile-distillation.service';
import { UserProfilePostExtractionService } from './investigation/user-profile-post-extraction.service';
import { PersonaProjectionService } from './investigation/persona-projection.service';
import { ACTIVE_DISTILLATION_TASK_STATUSES } from './users/constants';
import { createEmptyDistillationProgress } from './users/distillation-progress';
import { isOrphanedTask, toDistillationTaskSummary } from './users/distillation-task-state';
import { DistillationTaskStateService } from './users/distillation-task-state.service';
import { DistillationTaskExecutor } from './users/distillation-task-executor.service';
import { fetchUserList } from './users/user-list.query';
import { fetchRiskLevels } from './users/user-risk-levels.query';
import { fetchStatistics } from './users/user-statistics.query';
import type { UserListResponse, UserStatistics } from './users/types';

export type { RiskLevel, UserListItem, RiskLevelConfig, UserStatistics } from './users/types';

@Injectable({ providedIn: 'root' })
@OnInit()
export class UsersService implements OnInit {
  private processStartedAt = new Date();
  private readonly distillationTaskState: DistillationTaskStateService;
  private readonly distillationExecutor: DistillationTaskExecutor;

  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService,
    @Inject(InvestigationQueueService)
    private readonly investigationQueueService: InvestigationQueueService,
    @Inject(UserDossierService)
    private readonly userDossierService: UserDossierService,
    @Inject(UserHistoryCollectionService)
    private readonly userHistoryCollectionService: UserHistoryCollectionService,
    @Inject(UserProfileDistillationService)
    private readonly userProfileDistillationService: UserProfileDistillationService,
    @Inject(PersonaProjectionService)
    private readonly personaProjectionService: PersonaProjectionService,
    @Inject(UserProfilePostExtractionService)
    private readonly postExtractionService: UserProfilePostExtractionService = new UserProfilePostExtractionService(),
    @Inject(UserProfileAggregationService)
    private readonly aggregationService: UserProfileAggregationService = new UserProfileAggregationService(),
  ) {
    this.distillationTaskState = new DistillationTaskStateService();
    this.distillationExecutor = new DistillationTaskExecutor({
      stateService: this.distillationTaskState,
      userDossierService: this.userDossierService,
      userHistoryCollectionService: this.userHistoryCollectionService,
      userProfileDistillationService: this.userProfileDistillationService,
      personaProjectionService: this.personaProjectionService,
      postExtractionService: this.postExtractionService,
      aggregationService: this.aggregationService,
    });
  }

  async onInit(): Promise<void> {
    const reclaimedTaskCount = await useEntityManager(async (manager) => {
      const repo = manager.getRepository(UserProfileDistillationTaskEntity);
      const activeTasks = await repo.find({
        where: Array.from(ACTIVE_DISTILLATION_TASK_STATUSES, (status) => ({ status })),
        order: { created_at: 'DESC' },
      } as any);

      const orphanedTasks = activeTasks.filter((task) => this.isOrphanedDistillationTask(task));

      for (const task of orphanedTasks) {
        task.status = 'failed';
        task.completed_at = new Date();
        task.error_message = '任务因服务重启失去执行上下文，请重新发起';
        await repo.save(task);
      }

      return orphanedTasks.length;
    });

    if (reclaimedTaskCount > 0) {
      console.warn(
        `[UsersService] 已回收 ${reclaimedTaskCount} 个因服务重启而遗留的蒸馏任务`,
      );
    }
  }

  async getUserList(timeRange: TimeRange = '7d', page: number = 1, pageSize: number = 20) {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.USERS_LIST, timeRange, page, pageSize);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchUserList(timeRange, page, pageSize),
      CACHE_TTL.LONG
    );
  }

  async getInvestigationQueue(
    query: UserInvestigationQueueQuery,
  ): Promise<UserInvestigationQueueResponse> {
    return this.investigationQueueService.getQueue({
      eventId: query.eventId,
      riskLevel: query.riskLevel,
      status: query.status,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  async getUserDossier(
    id: string,
    eventId?: string,
    windowDays: number = 90,
  ): Promise<UserInvestigationDossier> {
    return this.userDossierService.getDossier(id, { eventId, windowDays });
  }

  async createDistillationTask(
    id: string,
    request?: CreateDistillationTaskRequest,
  ): Promise<DistillationTaskSummary> {
    const { task, shouldExecute } = await useEntityManager(async (manager) => {
      const repo = manager.getRepository(UserProfileDistillationTaskEntity);
      const existingTasks = await repo.find({
        where: { weibo_user_id: id },
        order: { created_at: 'DESC' },
      });
      const activeTask = await this.reclaimOrphanedTasksAndFindActiveTask(repo, existingTasks);

      if (activeTask) {
        return {
          task: activeTask,
          shouldExecute: false,
        };
      }

      const task = repo.create({
        weibo_user_id: id,
        event_id: request?.eventId ?? null,
        status: 'queued',
        history_window_days: request?.historyWindowDays ?? 90,
        distilled_summary: '任务已入队，等待开始抓取历史发帖',
        progress_json: createEmptyDistillationProgress(),
        warnings_json: [],
        source_post_count: 0,
        source_comment_count: 0,
        source_repost_count: 0,
        evidence_sample_count: 0,
      } as any) as unknown as UserProfileDistillationTaskEntity;
      return {
        task: (await repo.save(task as any)) as UserProfileDistillationTaskEntity,
        shouldExecute: true,
      };
    });

    if (shouldExecute) {
      void this.distillationExecutor.execute(task.id).catch((error) => {
        console.error(`[UsersService] distillation task ${task.id} 执行失败:`, error);
      });
    }

    return toDistillationTaskSummary(task);
  }

  async getDistillationTasks(id: string): Promise<DistillationTaskSummary[]> {
    return useEntityManager(async (manager) => {
      const repo = manager.getRepository(UserProfileDistillationTaskEntity);
      const tasks = await repo.find({
        where: { weibo_user_id: id },
        order: { created_at: 'DESC' },
      });

      return tasks.map((task) => toDistillationTaskSummary(task));
    });
  }

  async reviewDistillationTask(
    taskId: string,
    request: ReviewDistillationTaskRequest,
  ): Promise<DistillationTaskSummary> {
    return useEntityManager(async (manager) => {
      const taskRepo = manager.getRepository(UserProfileDistillationTaskEntity);
      const userRepo = manager.getRepository(WeiboUserEntity);
      const task = await taskRepo.findOne({ where: { id: taskId } });

      if (!task) {
        throw new Error(`Distillation task ${taskId} not found`);
      }

      if (request.decision === 'approve') {
        const user = await userRepo.findOne({
          where: { id: BigInt(task.weibo_user_id) as any },
        });

        if (!task.distilled_json) {
          throw new Error('Task has no distilled profile');
        }

        await this.personaProjectionService.publishProfile({
          ...(task.distilled_json as any),
          weiboUserId: task.weibo_user_id,
          screenName: user?.screen_name ?? user?.name ?? task.weibo_user_id,
          avatar: user?.avatar_hd ?? user?.avatar_large ?? user?.profile_image_url ?? null,
        });

        task.status = 'published';
        task.review_status = 'human_approved';
      } else {
        task.status = 'failed';
        task.review_status = 'human_rejected';
        task.error_message = request.note ?? '人工拒绝发布';
      }

      task.completed_at = new Date();
      const saved = await taskRepo.save(task);

      return toDistillationTaskSummary(saved);
    });
  }

  async getRiskLevels(timeRange: TimeRange = '7d') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.USERS_RISK_LEVELS, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchRiskLevels(timeRange),
      CACHE_TTL.LONG
    );
  }

  async getStatistics(timeRange: TimeRange = '7d'): Promise<UserStatistics> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.USERS_STATS, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => fetchStatistics(timeRange),
      CACHE_TTL.LONG
    );
  }

  private async reclaimOrphanedTasksAndFindActiveTask(
    repo: {
      save(task: UserProfileDistillationTaskEntity): Promise<UserProfileDistillationTaskEntity>;
    },
    tasks: UserProfileDistillationTaskEntity[],
  ): Promise<UserProfileDistillationTaskEntity | undefined> {
    for (const task of tasks) {
      if (!ACTIVE_DISTILLATION_TASK_STATUSES.has(task.status)) {
        continue;
      }

      if (this.isOrphanedDistillationTask(task)) {
        task.status = 'failed';
        task.completed_at = new Date();
        task.error_message = '任务因服务重启失去执行上下文，请重新发起';
        await repo.save(task);
        continue;
      }

      return task;
    }

    return undefined;
  }

  private isOrphanedDistillationTask(task: UserProfileDistillationTaskEntity): boolean {
    return isOrphanedTask(task, this.processStartedAt);
  }
}
