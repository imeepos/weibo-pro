import {
  WorkflowRunEntity,
  WorkflowEntity,
  useEntityManager,
  RunStatus,
} from '@sker/entities';
import { logger } from '@sker/core';
import { generateId } from '@sker/workflow';

/**
 * 创建运行实例
 *
 * 从 WorkflowEntity 获取最新的工作流定义，合并 defaultInputs 和用户提供的 inputs，
 * 创建工作流快照以确保运行独立性，初始状态为 PENDING。
 */
export async function createWorkflowRun(
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
 * 开始运行：设置状态为 RUNNING，记录开始时间，幂等性（已开始则不重复设置）
 */
export async function startWorkflowRun(runId: string): Promise<void> {
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
 * 完成运行：根据是否有错误自动设置状态，记录完成时间和耗时
 */
export async function completeWorkflowRun(
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
 * 取消运行：只能取消 PENDING 或 RUNNING 状态的运行，记录取消时间
 */
export async function cancelWorkflowRun(runId: string): Promise<void> {
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
