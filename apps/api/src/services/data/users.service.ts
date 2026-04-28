import { Injectable, Inject, OnInit } from '@sker/core';
import {
  WeiboUserEntity,
  UserProfileDistillationTaskEntity,
  useEntityManager,
} from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import { getTimeRangeBoundaries, getPreviousTimeRangeBoundaries } from './time-range.utils';
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
import { UserProfileDistillationService } from './investigation/user-profile-distillation.service';
import { PersonaProjectionService } from './investigation/persona-projection.service';

const ACTIVE_DISTILLATION_TASK_STATUSES = new Set(['queued', 'crawling', 'analyzing']);
const DEFAULT_DISTILLATION_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_DISTILLATION_HEARTBEAT_MS = 15 * 1000;

export type RiskLevel = 'low' | 'medium' | 'high';

export interface UserListItem {
  id: string;
  username: string;
  nickname: string;
  followers: number;
  following: number;
  posts: number;
  verified: boolean;
  location: string;
  riskLevel: RiskLevel;
  activities: {
    posts: number;
    comments: number;
  };
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  tags: string[];
  lastActive: string;
  avatar?: string;
}

export interface RiskLevelConfig {
  level: RiskLevel;
  name: string;
  description: string;
  color: string;
  minScore: number;
  maxScore: number;
  actionRequired: boolean;
  autoActions: string[];
  count?: number;
}

export interface UserStatistics {
  total: number;
  active: number;
  suspended: number;
  banned: number;
  monitoring: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  newUsers: {
    today: number;
    week: number;
    month: number;
  };
  activeUsers: {
    today: number;
    week: number;
    month: number;
  };
  averageRiskScore: number;
  trends: {
    totalGrowthRate: number;
    riskScoreChange: number;
    newUsersGrowthRate: number;
  };
  trendData: {
    total: number[];
    highRisk: number[];
    mediumRisk: number[];
    lowRisk: number[];
  };
  changes: {
    total: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

@Injectable({ providedIn: 'root' })
@OnInit()
export class UsersService implements OnInit {
  private processStartedAt = new Date();

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
  ) {}

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
      () => this.fetchUserList(timeRange, page, pageSize),
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
        source_post_count: 0,
        source_comment_count: 0,
        source_repost_count: 0,
        evidence_sample_count: 0,
      });
      return {
        task: await repo.save(task),
        shouldExecute: true,
      };
    });

    if (shouldExecute) {
      void this.executeDistillationTask(task.id).catch((error) => {
        console.error(`[UsersService] distillation task ${task.id} 执行失败:`, error);
      });
    }

    return this.toDistillationTaskSummary(task);
  }

  async getDistillationTasks(id: string): Promise<DistillationTaskSummary[]> {
    return useEntityManager(async (manager) => {
      const repo = manager.getRepository(UserProfileDistillationTaskEntity);
      const tasks = await repo.find({
        where: { weibo_user_id: id },
        order: { created_at: 'DESC' },
      });

      return tasks.map((task) => this.toDistillationTaskSummary(task));
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

      return this.toDistillationTaskSummary(saved);
    });
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

  private async executeDistillationTask(taskId: string): Promise<void> {
    let task = await this.updateDistillationTask(taskId, (currentTask) => {
      currentTask.status = 'crawling';
      currentTask.started_at = new Date();
      currentTask.completed_at = null;
      currentTask.error_message = null;
      currentTask.distilled_summary = '正在抓取历史发帖...';
      currentTask.source_post_count = 0;
    });

    try {
      const collection = await this.userHistoryCollectionService.collect({
        weiboUserId: task.weibo_user_id,
        uid: task.weibo_user_id,
        windowDays: task.history_window_days,
        taskId: task.id,
        onProgress: async (progress) => {
          await this.updateDistillationTask(taskId, (currentTask) => {
            currentTask.source_post_count = progress.collectedPostCount;
            currentTask.distilled_summary = progress.message;
            currentTask.error_message = null;
          });
        },
      });

      task = await this.updateDistillationTask(taskId, (currentTask) => {
        currentTask.status = 'analyzing';
        currentTask.source_post_count = collection.collectedPostCount;
        currentTask.distilled_summary = collection.partial
          ? `${collection.message}，正在基于已抓取数据生成画像`
          : '历史发帖抓取完成，正在生成画像';
      });

      const dossier = await this.userDossierService.getDossier(task.weibo_user_id, {
        eventId: task.event_id ?? undefined,
        windowDays: task.history_window_days,
      });
      const profile = await this.runDistillationWithTaskHeartbeat(taskId, dossier);
      const reviewStatus =
        profile.risk.reviewRecommendation === 'auto_pass' ? 'auto_pass' : 'human_pending';

      if (reviewStatus === 'auto_pass') {
        await this.personaProjectionService.publishProfile({
          ...profile,
          weiboUserId: dossier.accountSnapshot.weiboUserId,
          screenName:
            dossier.accountSnapshot.screenName ??
            dossier.accountSnapshot.displayName ??
            dossier.accountSnapshot.weiboUserId,
          avatar: dossier.accountSnapshot.avatar,
        });
      }

      await this.updateDistillationTask(taskId, (currentTask) => {
        currentTask.model = profile.metadata.model;
        currentTask.prompt_version = profile.metadata.promptVersion;
        currentTask.distilled_summary = profile.summary.short;
        currentTask.distilled_json = profile as unknown as Record<string, unknown>;
        currentTask.review_status = reviewStatus;
        currentTask.source_post_count = profile.metadata.sampledPosts;
        currentTask.source_comment_count = profile.metadata.sampledComments;
        currentTask.source_repost_count = profile.metadata.sampledReposts;
        currentTask.evidence_sample_count = profile.memoryDrafts.reduce(
          (sum, item) => sum + item.evidenceRefs.length,
          0,
        );
        currentTask.status = reviewStatus === 'auto_pass' ? 'published' : 'review_pending';
        currentTask.completed_at = new Date();
        currentTask.error_message = null;
      });
    } catch (error) {
      await this.updateDistillationTask(taskId, (currentTask) => {
        currentTask.status = 'failed';
        currentTask.error_message = error instanceof Error ? error.message : String(error);
        currentTask.completed_at = new Date();
      });
    }
  }

  private async updateDistillationTask(
    taskId: string,
    mutate: (task: UserProfileDistillationTaskEntity) => void,
  ): Promise<UserProfileDistillationTaskEntity> {
    return useEntityManager(async (manager) => {
      const repo = manager.getRepository(UserProfileDistillationTaskEntity);
      const task = await repo.findOne({ where: { id: taskId } });

      if (!task) {
        throw new Error(`Distillation task ${taskId} not found`);
      }

      mutate(task);
      return repo.save(task);
    });
  }

  private async runDistillationWithTaskHeartbeat(
    taskId: string,
    dossier: UserInvestigationDossier,
  ) {
    const timeoutMs = this.resolvePositiveIntegerEnv(
      process.env.USER_PROFILE_DISTILLATION_TIMEOUT_MS,
      DEFAULT_DISTILLATION_TIMEOUT_MS,
    );
    const heartbeatMs = this.resolvePositiveIntegerEnv(
      process.env.USER_PROFILE_DISTILLATION_PROGRESS_HEARTBEAT_MS,
      DEFAULT_DISTILLATION_HEARTBEAT_MS,
    );
    const startedAt = Date.now();
    let settled = false;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const stopTimers = () => {
      settled = true;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
    };

    const pushHeartbeat = async () => {
      const elapsedMs = Date.now() - startedAt;
      await this.updateDistillationTask(taskId, (currentTask) => {
        currentTask.status = 'analyzing';
        currentTask.error_message = null;
        currentTask.distilled_summary = `正在生成画像，已等待 ${this.formatElapsedDuration(elapsedMs)}，当前样本帖子 ${currentTask.source_post_count} 条`;
      });
    };

    heartbeatTimer = setInterval(() => {
      if (settled) {
        return;
      }

      void pushHeartbeat().catch((error) => {
        console.error(`[UsersService] distillation task ${taskId} 心跳更新失败:`, error);
      });
    }, heartbeatMs);

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`用户画像蒸馏超时（>${Math.ceil(timeoutMs / 1000)}s）`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([
        this.userProfileDistillationService.distill(dossier),
        timeoutPromise,
      ]);
    } finally {
      stopTimers();
    }
  }

  private isOrphanedDistillationTask(task: UserProfileDistillationTaskEntity): boolean {
    if (!ACTIVE_DISTILLATION_TASK_STATUSES.has(task.status)) {
      return false;
    }

    const taskReferenceTime = task.started_at ?? task.created_at;
    return taskReferenceTime.getTime() < this.processStartedAt.getTime();
  }

  private toDistillationTaskSummary(task: UserProfileDistillationTaskEntity): DistillationTaskSummary {
    return {
      id: task.id,
      weiboUserId: task.weibo_user_id,
      eventId: task.event_id,
      status: task.status,
      historyWindowDays: task.history_window_days,
      sourcePostCount: task.source_post_count,
      sourceCommentCount: task.source_comment_count,
      sourceRepostCount: task.source_repost_count,
      evidenceSampleCount: task.evidence_sample_count,
      model: task.model,
      promptVersion: task.prompt_version,
      distilledSummary: task.distilled_summary,
      reviewStatus: task.review_status,
      errorMessage: task.error_message,
      startedAt: task.started_at ? task.started_at.toISOString() : null,
      completedAt: task.completed_at ? task.completed_at.toISOString() : null,
      createdAt: task.created_at.toISOString(),
      updatedAt: task.updated_at.toISOString(),
    };
  }

  private resolvePositiveIntegerEnv(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private formatElapsedDuration(valueMs: number): string {
    const totalSeconds = Math.max(1, Math.floor(valueMs / 1000));
    if (totalSeconds < 60) {
      return `${totalSeconds} 秒`;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds > 0 ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分钟`;
  }

  private async fetchUserList(timeRange: TimeRange, page: number = 1, pageSize: number = 20) {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);
      const offset = (page - 1) * pageSize;

      const results = await manager.query(`
        WITH user_activity AS (
          SELECT
            p.user_id as user_id,
            COUNT(p.id) as post_count,
            MAX(p.ingested_at) as last_active,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN nlp.id END) as positive_count,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN nlp.id END) as neutral_count,
            COUNT(DISTINCT nlp.id) as analyzed_count
          FROM weibo_posts p
          LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
          WHERE p.ingested_at >= $1::timestamptz
            AND p.ingested_at <= $2::timestamptz
            AND p.deleted_at IS NULL
            AND p.user_id IS NOT NULL
          GROUP BY p.user_id
        ),
        all_user_activity AS (
          SELECT
            p.user_id as user_id,
            COUNT(p.id) as total_post_count,
            MAX(p.ingested_at) as last_post_time
          FROM weibo_posts p
          WHERE p.deleted_at IS NULL
            AND p.user_id IS NOT NULL
          GROUP BY p.user_id
        )
        SELECT
          u.id,
          u.idstr,
          u.screen_name,
          u.name,
          u.followers_count,
          u.friends_count,
          u.statuses_count,
          u.verified,
          COALESCE(NULLIF(u.location, ''), NULLIF(u.province, ''), NULLIF(u.city, ''), '未知') as location,
          COALESCE(ua.post_count, 0) as activity_posts,
          COALESCE(ua.positive_count, 0) as sentiment_positive,
          COALESCE(ua.negative_count, 0) as sentiment_negative,
          COALESCE(ua.neutral_count, 0) as sentiment_neutral,
          COALESCE(ua.analyzed_count, 0) as analyzed_count,
          COALESCE(ua.last_active, aua.last_post_time, u.created_at::timestamptz) as last_active,
          CASE
            WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.6 THEN 'high'
            WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.3 THEN 'medium'
            ELSE 'low'
          END as risk_level,
          COALESCE(u.avatar_hd, u.avatar_large, u.profile_image_url) as avatar
        FROM weibo_users u
        LEFT JOIN user_activity ua ON ua.user_id = u.id
        LEFT JOIN all_user_activity aua ON aua.user_id = u.id
        ORDER BY
          COALESCE(ua.post_count, 0) DESC,
          COALESCE(aua.total_post_count, 0) DESC,
          u.followers_count DESC
        LIMIT $3 OFFSET $4
      `, [start, end, pageSize, offset]);

      const totalResult = await manager.query(`
        SELECT COUNT(*) as total
        FROM weibo_users u
      `);
      const totalCount = parseInt(totalResult[0]?.total) || 0;

      const users: UserListItem[] = results.map((row: any) => {
        const analyzedCount = parseInt(row.analyzed_count);
        const positiveCount = parseInt(row.sentiment_positive);
        const negativeCount = parseInt(row.sentiment_negative);
        const neutralCount = parseInt(row.sentiment_neutral);

        const total = analyzedCount || 1;
        const positivePercent = Math.round((positiveCount / total) * 100);
        const negativePercent = Math.round((negativeCount / total) * 100);
        const neutralPercent = Math.round((neutralCount / total) * 100);

        const tags: string[] = [];
        if (row.verified) tags.push('已认证');
        if (row.followers_count > 10000) tags.push('大V');
        if (positivePercent > 70) tags.push('正面');
        if (negativePercent > 50) tags.push('负面');

        return {
          id: row.idstr || String(row.id),
          username: row.screen_name || `user_${row.id}`,
          nickname: row.name || row.screen_name || '未知用户',
          followers: row.followers_count || 0,
          following: row.friends_count || 0,
          posts: row.statuses_count || 0,
          verified: row.verified || false,
          location: row.location,
          riskLevel: row.risk_level as RiskLevel,
          activities: {
            posts: parseInt(row.activity_posts) || 0,
            comments: 0
          },
          sentiment: {
            positive: positivePercent,
            negative: negativePercent,
            neutral: neutralPercent
          },
          tags,
          lastActive: row.last_active,
          avatar: row.avatar
        };
      });

      const totalPages = Math.ceil(totalCount / pageSize);
      return {
        users,
        total: totalCount,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages
      };
    });
  }

  async getRiskLevels(timeRange: TimeRange = '7d') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.USERS_RISK_LEVELS, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchRiskLevels(timeRange),
      CACHE_TTL.LONG
    );
  }

  private async fetchRiskLevels(timeRange: TimeRange): Promise<RiskLevelConfig[]> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      const distribution = await manager.query(`
        WITH user_activity AS (
          SELECT
            p.user_id as user_id,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count,
            COUNT(DISTINCT nlp.id) as analyzed_count
          FROM weibo_posts p
          LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
          WHERE p.ingested_at >= $1::timestamptz
            AND p.ingested_at <= $2::timestamptz
            AND p.deleted_at IS NULL
            AND p.user_id IS NOT NULL
          GROUP BY p.user_id
        ),
        user_risk AS (
          SELECT
            u.id as user_id,
            CASE
              WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.6 THEN 'high'
              WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.3 THEN 'medium'
              ELSE 'low'
            END as risk_level
          FROM weibo_users u
          LEFT JOIN user_activity ua ON ua.user_id = u.id
        )
        SELECT
          risk_level,
          COUNT(*) as count
        FROM user_risk
        GROUP BY risk_level
      `, [start, end]);

      const countMap = new Map<string, number>(
        distribution.map((r: any) => [r.risk_level, parseInt(r.count)])
      );

      const levels: RiskLevelConfig[] = [
        {
          level: 'low',
          name: '低风险',
          description: '用户行为正常，无异常活动',
          color: '#10b981',
          minScore: 0,
          maxScore: 30,
          actionRequired: false,
          autoActions: [],
          count: countMap.get('low') || 0
        },
        {
          level: 'medium',
          name: '中风险',
          description: '用户存在部分异常行为，需要关注',
          color: '#f59e0b',
          minScore: 31,
          maxScore: 60,
          actionRequired: true,
          autoActions: ['监控', '记录'],
          count: countMap.get('medium') || 0
        },
        {
          level: 'high',
          name: '高风险',
          description: '用户存在明显异常行为，需要立即处理',
          color: '#ef4444',
          minScore: 61,
          maxScore: 100,
          actionRequired: true,
          autoActions: ['监控', '限制', '通知管理员'],
          count: countMap.get('high') || 0
        }
      ];

      return levels;
    });
  }

  async getStatistics(timeRange: TimeRange = '7d'): Promise<UserStatistics> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.USERS_STATS, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchStatistics(timeRange),
      CACHE_TTL.LONG
    );
  }

  private async fetchStatistics(timeRange: TimeRange): Promise<UserStatistics> {
    return useEntityManager(async (manager) => {
      const current = getTimeRangeBoundaries(timeRange);
      const previous = getPreviousTimeRangeBoundaries(timeRange);

      const totalUsersResult = await manager.query(`
        SELECT COUNT(*) as total FROM weibo_users
      `);
      const totalUsers = parseInt(totalUsersResult[0]?.total) || 0;

      const currentStats = await manager.query(`
        WITH user_activity AS (
          SELECT
            p.user_id as user_id,
            COUNT(DISTINCT nlp.id) as analyzed_count,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count
          FROM weibo_posts p
          LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
          WHERE p.ingested_at >= $1::timestamptz
            AND p.ingested_at <= $2::timestamptz
            AND p.deleted_at IS NULL
            AND p.user_id IS NOT NULL
          GROUP BY p.user_id
        ),
        user_risk AS (
          SELECT
            u.id as user_id,
            COALESCE(ua.analyzed_count, 0) as analyzed_count,
            CASE
              WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.6 THEN 'high'
              WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.3 THEN 'medium'
              ELSE 'low'
            END as risk_level,
            CASE
              WHEN ua.analyzed_count > 0 THEN (ua.negative_count::float / ua.analyzed_count) * 100
              ELSE 0
            END as risk_score
          FROM weibo_users u
          LEFT JOIN user_activity ua ON ua.user_id = u.id
        )
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN analyzed_count > 0 THEN 1 END) as total_active,
          COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk,
          COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk,
          COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk,
          AVG(risk_score) as avg_risk_score
        FROM user_risk
      `, [current.start, current.end]);

      const previousStats = await manager.query(`
        WITH user_activity AS (
          SELECT
            p.user_id as user_id,
            COUNT(DISTINCT nlp.id) as analyzed_count,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count
          FROM weibo_posts p
          LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
          WHERE p.ingested_at >= $1::timestamptz
            AND p.ingested_at <= $2::timestamptz
            AND p.deleted_at IS NULL
            AND p.user_id IS NOT NULL
          GROUP BY p.user_id
        ),
        user_risk AS (
          SELECT
            u.id as user_id,
            COALESCE(ua.analyzed_count, 0) as analyzed_count,
            CASE
              WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.6 THEN 'high'
              WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.3 THEN 'medium'
              ELSE 'low'
            END as risk_level
          FROM weibo_users u
          LEFT JOIN user_activity ua ON ua.user_id = u.id
        )
        SELECT
          COUNT(CASE WHEN analyzed_count > 0 THEN 1 END) as total_active,
          COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk,
          COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk,
          COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk
        FROM user_risk
      `, [previous.start, previous.end]);

      // 计算过去7天的趋势数据
      const trendDataResult = await manager.query(`
        WITH RECURSIVE date_series AS (
          SELECT $1::timestamptz - INTERVAL '6 days' as date
          UNION ALL
          SELECT date + INTERVAL '1 day'
          FROM date_series
          WHERE date < $1::timestamptz
        ),
        daily_user_activity AS (
          SELECT
            DATE_TRUNC('day', p.ingested_at) as day,
            p.user_id as user_id,
            COUNT(DISTINCT nlp.id) as analyzed_count,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count
          FROM weibo_posts p
          LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
          WHERE p.ingested_at >= $1::timestamptz - INTERVAL '6 days'
            AND p.ingested_at <= $1::timestamptz
            AND p.deleted_at IS NULL
            AND p.user_id IS NOT NULL
          GROUP BY DATE_TRUNC('day', p.ingested_at), p.user_id
        ),
        daily_user_risk AS (
          SELECT
            ds.date,
            COUNT(DISTINCT dua.user_id) as total_users,
            COUNT(DISTINCT CASE
              WHEN dua.analyzed_count > 0 AND (dua.negative_count::float / dua.analyzed_count) > 0.6
              THEN dua.user_id
            END) as high_risk,
            COUNT(DISTINCT CASE
              WHEN dua.analyzed_count > 0 AND (dua.negative_count::float / dua.analyzed_count) > 0.3
              AND (dua.negative_count::float / dua.analyzed_count) <= 0.6
              THEN dua.user_id
            END) as medium_risk,
            COUNT(DISTINCT CASE
              WHEN dua.analyzed_count = 0 OR (dua.negative_count::float / dua.analyzed_count) <= 0.3
              THEN dua.user_id
            END) as low_risk
          FROM date_series ds
          LEFT JOIN daily_user_activity dua ON DATE_TRUNC('day', dua.day) <= ds.date
          GROUP BY ds.date
          ORDER BY ds.date
        )
        SELECT
          date,
          total_users,
          high_risk,
          medium_risk,
          low_risk
        FROM daily_user_risk
        ORDER BY date
      `, [current.end]);

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activityStats = await manager.query(`
        SELECT
          COUNT(DISTINCT CASE WHEN p.ingested_at >= $1::timestamptz THEN p.user_id END) as active_today,
          COUNT(DISTINCT CASE WHEN p.ingested_at >= $2::timestamptz THEN p.user_id END) as active_week,
          COUNT(DISTINCT CASE WHEN p.ingested_at >= $3::timestamptz THEN p.user_id END) as active_month
        FROM weibo_posts p
        WHERE p.ingested_at >= $3::timestamptz
          AND p.deleted_at IS NULL
          AND p.user_id IS NOT NULL
      `, [oneDayAgo, sevenDaysAgo, thirtyDaysAgo]);

      const row = currentStats[0] || {};
      const prevRow = previousStats[0] || {};
      const actRow = activityStats[0] || {};

      const totalActive = parseInt(row.total_active) || 0;
      const prevTotalActive = parseInt(prevRow.total_active) || 0;
      const avgRiskScore = parseFloat(row.avg_risk_score) || 0;

      const currentHighRisk = parseInt(row.high_risk) || 0;
      const currentMediumRisk = parseInt(row.medium_risk) || 0;
      const currentLowRisk = parseInt(row.low_risk) || 0;

      const prevHighRisk = parseInt(prevRow.high_risk) || 0;
      const prevMediumRisk = parseInt(prevRow.medium_risk) || 0;
      const prevLowRisk = parseInt(prevRow.low_risk) || 0;

      const totalGrowthRate = prevTotalActive > 0
        ? ((totalActive - prevTotalActive) / prevTotalActive) * 100
        : 0;

      // 计算变化百分比
      const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(1));
      };

      // 提取趋势数据
      const trendData = {
        total: trendDataResult.map((r: any) => parseInt(r.total_users) || 0),
        highRisk: trendDataResult.map((r: any) => parseInt(r.high_risk) || 0),
        mediumRisk: trendDataResult.map((r: any) => parseInt(r.medium_risk) || 0),
        lowRisk: trendDataResult.map((r: any) => parseInt(r.low_risk) || 0),
      };

      return {
        total: totalUsers,
        active: totalActive,
        suspended: 0,
        banned: 0,
        monitoring: currentMediumRisk + currentHighRisk,
        riskDistribution: {
          low: currentLowRisk,
          medium: currentMediumRisk,
          high: currentHighRisk,
          critical: 0
        },
        newUsers: {
          today: 0,
          week: 0,
          month: 0
        },
        activeUsers: {
          today: parseInt(actRow.active_today) || 0,
          week: parseInt(actRow.active_week) || 0,
          month: parseInt(actRow.active_month) || 0
        },
        averageRiskScore: Number(avgRiskScore.toFixed(1)),
        trends: {
          totalGrowthRate: Number(totalGrowthRate.toFixed(1)),
          riskScoreChange: 0,
          newUsersGrowthRate: 0
        },
        trendData,
        changes: {
          total: calculateChange(totalActive, prevTotalActive),
          highRisk: calculateChange(currentHighRisk, prevHighRisk),
          mediumRisk: calculateChange(currentMediumRisk, prevMediumRisk),
          lowRisk: calculateChange(currentLowRisk, prevLowRisk),
        }
      };
    });
  }
}
