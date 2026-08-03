import { useEntityManager, UserProfileDistillationTaskEntity } from '@sker/entities';
import {
  DEFAULT_DISTILLATION_HEARTBEAT_MS,
  DEFAULT_DISTILLATION_TIMEOUT_MS,
} from './constants';
import { mergeTaskProgress } from './distillation-task-state';

// 蒸馏任务的持久化状态读写与心跳/超时控制
export class DistillationTaskStateService {
  async updateTask(
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

  // 在蒸馏（耗时）阶段提供心跳进度与超时保护
  async runWithTaskHeartbeat<T>(taskId: string, run: () => Promise<T>): Promise<T> {
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
      await this.updateTask(taskId, (currentTask) => {
        currentTask.status = 'aggregating';
        currentTask.error_message = null;
        currentTask.distilled_summary = `正在生成画像，已等待 ${this.formatElapsedDuration(elapsedMs)}，当前样本帖子 ${currentTask.source_post_count} 条`;
        mergeTaskProgress(currentTask, {
          stage: 'aggregating',
          latestMessage: `正在生成画像，已等待 ${this.formatElapsedDuration(elapsedMs)}，当前样本帖子 ${currentTask.source_post_count} 条`,
        });
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
      return await Promise.race([run(), timeoutPromise]);
    } finally {
      stopTimers();
    }
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
}
