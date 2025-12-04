import { Injectable } from '@sker/core';
import {
  WorkflowRunEntity,
  WorkflowEntity,
  useEntityManager,
  RunStatus,
} from '@sker/entities';
import { logger } from '@sker/core';
import { FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { generateId } from '@sker/workflow';

/**
 * 工作流运行实例服务
 *
 * 存在即合理：
 * - 管理工作流的运行实例生命周期
 * - 追踪每次运行的输入、输出和状态
 * - 支持多实例并发运行
 * - 提供运行历史追溯能力
 *
 * 优雅设计：
 * - 每次运行创建独立的实例记录
 * - 使用 graphSnapshot 保存执行时的工作流快照
 * - 通过 nodeStates 追踪各节点的执行状态
 * - 支持断点续传和错误恢复
 */
@Injectable({ providedIn: 'root' })
export class WorkflowRunService {
  /**
   * 创建运行实例
   *
   * 优雅设计：
   * - 从 WorkflowEntity 获取最新的工作流定义
   * - 合并 defaultInputs 和用户提供的 inputs
   * - 创建工作流快照，确保运行独立性
   * - 初始状态为 PENDING
   */
  async createRun(
    workflowId: string,
    inputs?: Record<string, unknown>,
    scheduleId?: string,
  ): Promise<WorkflowRunEntity> {
    return useEntityManager(async (manager) => {
      const workflowRepository = manager.getRepository(WorkflowEntity);
      const runRepository = manager.getRepository(WorkflowRunEntity);

      // 获取工作流定义
      const workflow = await workflowRepository.findOne({
        where: { id: workflowId },
      });

      if (!workflow) {
        throw new Error(`工作流不存在: ${workflowId}`);
      }

      // 合并默认输入和用户输入
      const mergedInputs = {
        ...workflow.defaultInputs,
        ...inputs,
      };

      // 创建运行实例
      const currentTime = new Date();
      logger.info('💡 创建运行实例时的时间检查', {
        nodeJsTime: currentTime.toISOString(),
        nodeJsLocalTime: currentTime.toLocaleString('zh-CN'),
        nodeJsTimestamp: currentTime.getTime(),
      });

      const run = runRepository.create({
        id: generateId(),
        workflowId: workflow.id,
        scheduleId,
        status: RunStatus.PENDING,
        graphSnapshot: workflow,
        inputs: mergedInputs,
        nodeStates: {},
      });

      await runRepository.save(run);

      logger.info('工作流运行实例已创建', {
        runId: run.id,
        workflowId: workflow.id,
        workflowName: workflow.name,
        createdAt: run.createdAt?.toISOString(),
        createdAtLocal: run.createdAt?.toLocaleString('zh-CN'),
      });

      return run;
    });
  }

  /**
   * 获取运行实例
   */
  async getRun(runId: string): Promise<WorkflowRunEntity | null> {
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
   * 列出运行历史
   *
   * 优雅设计：
   * - 支持分页查询
   * - 按创建时间倒序排列
   * - 可选择性过滤状态
   */
  async listRuns(
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
   * 更新运行状态
   *
   * 优雅设计：
   * - 支持部分更新
   * - 自动计算执行耗时
   * - 原子性更新，避免并发冲突
   */
  async updateRunStatus(
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
   * 开始运行
   *
   * 优雅设计：
   * - 设置状态为 RUNNING
   * - 记录开始时间
   * - 幂等性：如果已经开始，不重复设置
   */
  async startRun(runId: string): Promise<void> {
    return useEntityManager(async (manager) => {
      const runRepository = manager.getRepository(WorkflowRunEntity);

      const run = await runRepository.findOne({
        where: { id: runId },
      });

      if (!run) {
        throw new Error(`运行实例不存在: ${runId}`);
      }

      if (run.status !== RunStatus.PENDING) {
        logger.warn('运行实例已启动或已完成', { runId, status: run.status });
        return;
      }

      run.status = RunStatus.RUNNING;
      run.startedAt = new Date();

      await runRepository.save(run);

      logger.info('运行已启动', { runId });
    });
  }

  /**
   * 完成运行
   *
   * 优雅设计：
   * - 根据是否有错误自动设置状态
   * - 记录完成时间和耗时
   */
  async completeRun(
    runId: string,
    result: {
      success: boolean;
      outputs?: Record<string, unknown>;
      nodeStates?: Record<string, unknown>;
      error?: { message: string; stack?: string; nodeId?: string };
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

      run.status = result.success ? RunStatus.SUCCESS : RunStatus.FAILED;
      run.completedAt = new Date();

      if (result.outputs) {
        run.outputs = result.outputs;
      }

      if (result.nodeStates) {
        run.nodeStates = result.nodeStates;
      }

      if (result.error) {
        run.error = result.error;
      }

      // 计算耗时
      if (run.startedAt && run.completedAt) {
        run.durationMs = run.completedAt.getTime() - run.startedAt.getTime();
      }

      await runRepository.save(run);

      logger.info('运行已完成', {
        runId,
        status: run.status,
        durationMs: run.durationMs,
        success: result.success,
      });
    });
  }

  /**
   * 取消运行
   *
   * 优雅设计：
   * - 只能取消 PENDING 或 RUNNING 状态的运行
   * - 记录取消时间
   */
  async cancelRun(runId: string): Promise<void> {
    return useEntityManager(async (manager) => {
      const runRepository = manager.getRepository(WorkflowRunEntity);

      const run = await runRepository.findOne({
        where: { id: runId },
      });

      if (!run) {
        throw new Error(`运行实例不存在: ${runId}`);
      }

      if (![RunStatus.PENDING, RunStatus.RUNNING].includes(run.status)) {
        throw new Error(`无法取消已完成的运行: ${runId}`);
      }

      run.status = RunStatus.CANCELLED;
      run.completedAt = new Date();

      // 计算耗时
      if (run.startedAt && run.completedAt) {
        run.durationMs = run.completedAt.getTime() - run.startedAt.getTime();
      }

      await runRepository.save(run);

      logger.info('运行已取消', { runId });
    });
  }

  /**
   * 删除运行历史
   *
   * 优雅设计：
   * - 支持批量删除
   * - 物理删除，不保留记录
   */
  async deleteRuns(runIds: string[]): Promise<number> {
    return useEntityManager(async (manager) => {
      const runRepository = manager.getRepository(WorkflowRunEntity);

      const result = await runRepository.delete(runIds);

      const deletedCount = result.affected ?? 0;

      return deletedCount;
    });
  }

  /**
   * 清理过期的运行记录
   *
   * 优雅设计：
   * - 定期清理超过保留期的运行记录
   * - 避免数据库无限增长
   */
  async cleanupOldRuns(daysToKeep: number = 30): Promise<number> {
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
}
