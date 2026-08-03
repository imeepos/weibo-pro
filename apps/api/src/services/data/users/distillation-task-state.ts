import type { UserProfileDistillationTaskEntity } from '@sker/entities';
import type { DistillationTaskProgress, DistillationTaskSummary } from '@sker/sdk';
import { ACTIVE_DISTILLATION_TASK_STATUSES } from './constants';
import { createEmptyDistillationProgress, type DistillationTaskProgressPatch } from './distillation-progress';

// 任务实体 -> 对外摘要 DTO
export function toDistillationTaskSummary(
  task: UserProfileDistillationTaskEntity,
): DistillationTaskSummary {
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
    progress: (task.progress_json as DistillationTaskProgress | null) ?? undefined,
  };
}

// 将进度补丁合并进任务实体的 progress_json
export function mergeTaskProgress(
  task: UserProfileDistillationTaskEntity,
  patch: DistillationTaskProgressPatch,
): void {
  const current = (task.progress_json as DistillationTaskProgress | null) ??
    createEmptyDistillationProgress();

  task.progress_json = {
    ...current,
    ...patch,
    counters: {
      ...current.counters,
      ...(patch.counters ?? {}),
    },
    coverage: {
      ...current.coverage,
      ...(patch.coverage ?? {}),
    },
    recentWarnings: patch.recentWarnings ?? current.recentWarnings,
    lastProgressAt: new Date().toISOString(),
  };
}

// 合并去重警告列表
export function mergeWarnings(
  current: string[] | null | undefined,
  incoming: string[] | null | undefined,
): string[] {
  return Array.from(new Set([...(current ?? []), ...(incoming ?? [])]));
}

// 判断任务是否因服务重启而失去执行上下文
export function isOrphanedTask(
  task: UserProfileDistillationTaskEntity,
  processStartedAt: Date,
): boolean {
  if (!ACTIVE_DISTILLATION_TASK_STATUSES.has(task.status)) {
    return false;
  }

  const taskReferenceTime = task.started_at ?? task.created_at;
  return taskReferenceTime.getTime() < processStartedAt.getTime();
}
