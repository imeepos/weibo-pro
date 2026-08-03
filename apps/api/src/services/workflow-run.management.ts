import {
  WorkflowRunEntity,
  useEntityManager,
  RunStatus,
} from '@sker/entities';
import { logger } from '@sker/core';
import { FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

/**
 * 获取运行实例
 */
export async function getWorkflowRun(runId: string): Promise<WorkflowRunEntity | null> {
  return useEntityManager(async (manager) => {
    const runRepository = manager.getRepository(WorkflowRunEntity);

    const run = await runRepository.findOne({
      where: { id: runId },
    });

    if (!run) {
      logger.warn('运行实例不存在', { runId });
      return null;
    }

    return run;
  });
}

/**
 * 列出运行历史：支持分页、按创建时间倒序、可选状态/时间过滤
 */
export async function listWorkflowRuns(
  workflowId: string,
  options?: {
    page?: number;
    pageSize?: number;
    status?: RunStatus;
    startDate?: Date;
    endDate?: Date;
  },
): Promise<{ runs: WorkflowRunEntity[]; total: number }> {
  return useEntityManager(async (manager) => {
    const runRepository = manager.getRepository(WorkflowRunEntity);

    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;

    const where: FindOptionsWhere<WorkflowRunEntity> = {
      workflowId,
    };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.startDate) {
      where.createdAt = MoreThanOrEqual(options.startDate);
    }

    if (options?.endDate) {
      where.createdAt = LessThanOrEqual(options.endDate);
    }

    const [runs, total] = await runRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    logger.debug('查询运行历史', {
      workflowId,
      total,
      page,
      pageSize,
    });

    return { runs, total };
  });
}

/**
 * 更新运行状态：支持部分更新，自动计算执行耗时
 */
export async function updateWorkflowRunStatus(
  runId: string,
  updates: {
    status?: RunStatus;
    nodeStates?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    error?: { message: string; stack?: string; nodeId?: string };
    startedAt?: Date;
    completedAt?: Date;
  },
): Promise<void> {
  return useEntityManager(async (manager) => {
    const runRepository = manager.getRepository(WorkflowRunEntity);

    const run = await runRepository.findOne({
      where: { id: runId },
    });

    if (!run) {
      throw new Error(`运行实例不存在: ${runId}`);
    }

    // 更新字段
    if (updates.status !== undefined) {
      run.status = updates.status;
    }

    if (updates.nodeStates !== undefined) {
      run.nodeStates = updates.nodeStates;
    }

    if (updates.outputs !== undefined) {
      run.outputs = updates.outputs;
    }

    if (updates.error !== undefined) {
      run.error = updates.error;
    }

    if (updates.startedAt !== undefined) {
      run.startedAt = updates.startedAt;
    }

    if (updates.completedAt !== undefined) {
      run.completedAt = updates.completedAt;
    }

    // 计算执行耗时
    if (run.startedAt && run.completedAt) {
      run.durationMs = run.completedAt.getTime() - run.startedAt.getTime();
    }

    await runRepository.save(run);

    logger.info('运行状态已更新', {
      runId,
      status: updates.status,
      durationMs: run.durationMs,
    });
  });
}

/**
 * 删除运行历史：支持批量删除，物理删除
 */
export async function deleteWorkflowRuns(runIds: string[]): Promise<number> {
  return useEntityManager(async (manager) => {
    const runRepository = manager.getRepository(WorkflowRunEntity);

    const result = await runRepository.delete(runIds);

    const deletedCount = result.affected ?? 0;

    return deletedCount;
  });
}

/**
 * 清理过期的运行记录：定期清理超过保留期的记录，避免数据库无限增长
 */
export async function cleanupWorkflowRuns(daysToKeep: number = 30): Promise<number> {
  return useEntityManager(async (manager) => {
    const runRepository = manager.getRepository(WorkflowRunEntity);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await runRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .andWhere('status IN (:...statuses)', {
        statuses: [RunStatus.SUCCESS, RunStatus.FAILED, RunStatus.CANCELLED],
      })
      .execute();

    const deletedCount = result.affected ?? 0;

    logger.info('已清理过期运行记录', {
      deletedCount,
      daysToKeep,
      cutoffDate,
    });

    return deletedCount;
  });
}
