import { Injectable, Inject, logger } from '@sker/core'
import { DataSource, WorkflowScheduleEntity, WorkflowEntity, ScheduleStatus, ScheduleType } from '@sker/entities'
import { executeAst, WorkflowGraphAst } from '@sker/workflow'

/**
 * 工作流执行服务
 *
 * 存在即合理：
 * - 负责执行调度触发的工作流
 * - 处理工作流执行前后的状态更新
 * - 计算下次执行时间
 * - 错误隔离，单个任务失败不影响其他调度
 *
 * 优雅设计：
 * - 输入：WorkflowScheduleEntity
 * - 输出：执行结果 + 更新调度状态
 * - 职责单一：只关注执行逻辑
 */
@Injectable()
export class WorkflowExecutionService {
  constructor(@Inject(DataSource) private dataSource: DataSource) {}

  /**
   * 执行调度任务
   */
  async execute(schedule: WorkflowScheduleEntity): Promise<void> {
    logger.info('开始执行调度任务', {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      workflowId: schedule.workflowId
    })

    const startTime = new Date()

    try {
      // 获取工作流
      const workflow = await this.dataSource
        .getRepository(WorkflowEntity)
        .findOne({ where: { id: schedule.workflowId } })

      if (!workflow) {
        logger.error('工作流不存在', {
          workflowId: schedule.workflowId,
          scheduleId: schedule.id
        })
        return
      }

      // 构造工作流 AST
      const ast = new WorkflowGraphAst()
      ast.id = workflow.id
      ast.name = workflow.name
      ast.description = workflow.description
      ast.nodes = workflow.nodes
      ast.edges = workflow.edges
      ast.entryNodeIds = workflow.entryNodeIds
      ast.viewport = workflow.viewport
      ast.collapsed = workflow.collapsed
      ast.tags = workflow.tags

      // 合并输入参数（调度参数覆盖默认参数）
      const inputs = {
        ...workflow.defaultInputs,
        ...schedule.inputs
      }

      // 执行工作流
      const result = await executeAst(ast, ast as WorkflowGraphAst).toPromise()

      if (result) {
        logger.info('工作流执行完成', {
          workflowName: workflow.name,
          scheduleId: schedule.id,
          state: result.state,
          duration: Date.now() - startTime.getTime()
        })
      } else {
        logger.warn('工作流执行无返回结果', {
          workflowName: workflow.name,
          scheduleId: schedule.id
        })
      }

      // 更新调度状态
      await this.updateScheduleAfterRun(schedule, true)
    } catch (error) {
      logger.error('执行调度任务失败', {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        error: (error as Error).message,
        stack: (error as Error).stack
      })

      // 即使失败也更新下次执行时间（避免无限重试）
      try {
        await this.updateScheduleAfterRun(schedule, false)
      } catch (updateError) {
        logger.error('更新调度状态失败', {
          scheduleId: schedule.id,
          error: (updateError as Error).message
        })
      }
    }
  }

  /**
   * 执行后更新调度状态
   */
  private async updateScheduleAfterRun(
    schedule: WorkflowScheduleEntity,
    success: boolean
  ): Promise<void> {
    const now = new Date()
    const nextRunAt = this.calculateNextRunTime(schedule)

    // 检查是否过期
    let status = schedule.status
    if (schedule.endTime && nextRunAt && nextRunAt > schedule.endTime) {
      status = ScheduleStatus.EXPIRED
      logger.info('调度任务已过期', {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        endTime: schedule.endTime
      })
    }

    // ONCE 类型执行一次后自动禁用
    if (schedule.scheduleType === ScheduleType.ONCE) {
      status = ScheduleStatus.DISABLED
      logger.info('一次性调度已完成', {
        scheduleId: schedule.id,
        scheduleName: schedule.name
      })
    }

    await this.dataSource.getRepository(WorkflowScheduleEntity).update(schedule.id, {
      lastRunAt: now,
      nextRunAt:
        status === ScheduleStatus.DISABLED || status === ScheduleStatus.EXPIRED
          ? undefined
          : nextRunAt ?? undefined,
      status
    })
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextRunTime(schedule: WorkflowScheduleEntity): Date | null {
    const now = new Date()

    // 如果已过期
    if (schedule.endTime && now >= schedule.endTime) {
      return null
    }

    switch (schedule.scheduleType) {
      case ScheduleType.ONCE:
        // 一次性任务执行后不再执行
        return null

      case ScheduleType.CRON:
        if (!schedule.cronExpression) {
          logger.error('Cron 调度缺少表达式', { scheduleId: schedule.id })
          return null
        }
        try {
          // node-schedule 会自动处理下次执行时间
          // 这里只是用于记录，实际调度由 node-schedule 控制
          return new Date(now.getTime() + 60000) // 临时返回1分钟后
        } catch (error) {
          logger.error('Cron 表达式解析失败', {
            scheduleId: schedule.id,
            expression: schedule.cronExpression,
            error: (error as Error).message
          })
          return null
        }

      case ScheduleType.INTERVAL:
        if (!schedule.intervalSeconds) {
          logger.error('间隔调度缺少间隔时间', { scheduleId: schedule.id })
          return null
        }
        return new Date(now.getTime() + schedule.intervalSeconds * 1000)

      case ScheduleType.MANUAL:
        // 手动触发不需要下次执行时间
        return null

      default:
        logger.error('不支持的调度类型', {
          scheduleId: schedule.id,
          scheduleType: schedule.scheduleType
        })
        return null
    }
  }
}
