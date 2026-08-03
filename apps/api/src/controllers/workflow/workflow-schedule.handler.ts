import { BadRequestException, NotFoundException, logger, root } from '@sker/core';
import { WorkflowScheduleService } from '../../services/workflow-schedule.service';
import { WorkflowRunService } from '../../services/workflow-run.service';
import { WorkflowScheduleEntity, ScheduleType, ScheduleStatus } from '@sker/entities';
import { WorkflowRunHandler } from './workflow-run.handler';

/**
 * 工作流调度处理器
 *
 * 存在即合理：
 * - 创建、查询、更新、删除调度
 * - 启用、禁用调度
 * - 手动触发调度，后台异步执行
 */
export class WorkflowScheduleHandler {
  private readonly workflowScheduleService: WorkflowScheduleService;
  private readonly workflowRunService: WorkflowRunService;
  private readonly runs: WorkflowRunHandler;

  constructor(runs: WorkflowRunHandler) {
    this.workflowScheduleService = root.get(WorkflowScheduleService);
    this.workflowRunService = root.get(WorkflowRunService);
    this.runs = runs;
  }

  /**
   * 创建调度
   */
  async createSchedule(
    body: {
      code: string;
      name: string;
      scheduleType: string;
      cronExpression?: string;
      intervalSeconds?: number;
      inputs?: Record<string, unknown>;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<WorkflowScheduleEntity> {
    if (!body.name) {
      throw new BadRequestException('工作流名称不能为空')
    }

    return this.workflowScheduleService.createSchedule({
      workflowName: body.code,
      name: body.name,
      scheduleType: body.scheduleType as ScheduleType,
      cronExpression: body.cronExpression,
      intervalSeconds: body.intervalSeconds,
      inputs: body.inputs || {},
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    })
  }

  /**
   * 列出调度
   */
  async listSchedules(workflowName: string): Promise<WorkflowScheduleEntity[]> {
    return this.workflowScheduleService.listSchedules(workflowName)
  }

  /**
   * 获取调度详情
   */
  async getSchedule(scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.workflowScheduleService.getSchedule(scheduleId)
  }

  /**
   * 更新调度
   */
  async updateSchedule(
    scheduleId: string,
    body: {
      name?: string;
      scheduleType?: string;
      cronExpression?: string;
      intervalSeconds?: number;
      inputs?: Record<string, unknown>;
      startTime?: Date;
      endTime?: Date;
      status?: string;
    }
  ): Promise<WorkflowScheduleEntity> {
    return this.workflowScheduleService.updateSchedule(scheduleId, {
      ...body,
      scheduleType: body.scheduleType as ScheduleType,
      status: body.status as ScheduleStatus,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    })
  }

  /**
   * 删除调度
   */
  async deleteSchedule(scheduleId: string): Promise<{ success: boolean }> {
    await this.workflowScheduleService.deleteSchedule(scheduleId)
    return { success: true }
  }

  /**
   * 启用调度
   */
  async enableSchedule(scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.workflowScheduleService.enableSchedule(scheduleId)
  }

  /**
   * 禁用调度
   */
  async disableSchedule(scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.workflowScheduleService.disableSchedule(scheduleId)
  }

  /**
   * 手动触发调度
   *
   * 优雅设计：
   * - 为手动类型调度提供即时触发能力
   * - 支持动态传递运行参数（覆盖调度中保存的参数）
   * - 创建运行实例后立即返回 runId，不等待执行完成
   * - 后台异步执行，避免长时间阻塞请求
   * - 返回运行实例 ID，用于追踪执行状态
   */
  async triggerSchedule(
    scheduleId: string,
    body?: { inputs?: Record<string, unknown> }
  ): Promise<{ success: boolean; runId: string }> {
    if (!scheduleId) {
      throw new BadRequestException('调度 ID 不能为空')
    }

    const schedule = await this.workflowScheduleService.getSchedule(scheduleId)

    if (!schedule) {
      throw new NotFoundException(`调度不存在: ${scheduleId}`)
    }

    // 优先使用请求中的 inputs，否则使用调度保存的 inputs
    const inputs = body?.inputs ?? schedule.inputs

    logger.info('手动触发调度', {
      scheduleId,
      workflowId: schedule.workflowId,
      hasCustomInputs: !!body?.inputs
    })

    // 创建运行实例（直接使用 workflowId）
    const run = await this.workflowRunService.createRun(schedule.workflowId, inputs, scheduleId)

    // 更新调度的最后运行时间
    await this.workflowScheduleService.updateLastRunTime(scheduleId)

    // 异步执行，不等待结果
    setImmediate(() => {
      this.runs.executeRun({ runId: run.id }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('异步执行工作流失败', { runId: run.id, error: message })
      })
    })

    return {
      success: true,
      runId: run.id
    }
  }
}
