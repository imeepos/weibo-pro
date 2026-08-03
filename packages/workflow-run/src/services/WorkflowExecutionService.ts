import { Injectable, logger } from '@sker/core'
import { useEntityManager, WorkflowScheduleEntity, WorkflowEntity, ScheduleStatus, ScheduleType } from '@sker/entities'
import { executeAst, WorkflowGraphAst } from '@sker/workflow'
import { withRetryOnNetworkError } from '../utils/retry-on-network-error'
import { lastValueFrom } from 'rxjs'
import { filter, take, tap } from 'rxjs/operators'
import { calculateNextRunTime as calcNextRunTime } from './workflow-schedule.util'

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
  constructor() { }

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
      // 获取工作流（带重试）
      const workflow = await withRetryOnNetworkError(
        async () => {
          return await useEntityManager(async (manager) => {
            return await manager.findOne(WorkflowEntity, { where: { id: schedule.workflowId } })
          })
        },
        3,
        1000,
        `查询工作流 [${schedule.name}]`
      )

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
      logger.info(`execute workflow ${workflow.name} with inputs:`, inputs)
      // 执行工作流
      const recentEvents: Array<{ type: string; id: string }> = []
      const execution$ = executeAst(ast, inputs, ast as WorkflowGraphAst).pipe(
        tap(event => {
          recentEvents.push({ type: event.type, id: event.id })
          if (recentEvents.length > 10) {
            recentEvents.shift()
          }
        })
      )
      const result = await lastValueFrom(
        execution$.pipe(
          filter(event =>
            event.id === workflow.id &&
            (event.type === 'node_success' || event.type === 'node_fail')
          ),
          take(1)
        ),
        { defaultValue: null }
      )

      if (!result) {
        logger.warn('工作流执行未收到 workflow 终态事件', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          workflowId: workflow.id,
          recentEvents,
          lastEventType: recentEvents[recentEvents.length - 1]?.type,
          lastEventId: recentEvents[recentEvents.length - 1]?.id
        })
        throw new Error(`Workflow ${workflow.id} completed without terminal event`)
      }

      if (result) {
        const state = result.type === 'node_success' ? 'success'
          : result.type === 'node_fail' ? 'fail'
            : undefined;
        logger.info('工作流执行完成', {
          workflowName: workflow.name,
          scheduleId: schedule.id,
          state,
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
    const nextRunAt = calcNextRunTime(schedule)

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

    // 详细日志：更新前的数据
    logger.info('[WorkflowExecutionService] 准备更新调度时间', {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      success,
      currentTime: now.toISOString(),
      lastRunAt: now.toISOString(),
      nextRunAt: nextRunAt?.toISOString(),
      newStatus: status,
      statusReason:
        status === ScheduleStatus.DISABLED && schedule.scheduleType === ScheduleType.ONCE
          ? '一次性任务完成'
          : status === ScheduleStatus.EXPIRED
            ? '已过期'
            : '正常运行'
    })

    await withRetryOnNetworkError(
      async () => {
        // 使用事务确保数据持久化
        // 使用 save() 而不是 update()，以便 TypeORM Subscriber 能获取完整实体信息
        await useEntityManager(async (manager) => {
          // 在事务中执行更新
          await manager.transaction(async (txManager) => {
            // 先加载实体，然后使用 save() 更新
            // 这样 Subscriber 的 databaseEntity 会包含完整信息
            const entity = await txManager.findOne(WorkflowScheduleEntity, {
              where: { id: schedule.id }
            })

            if (!entity) {
              logger.error('[WorkflowExecutionService] 找不到调度实体', {
                scheduleId: schedule.id
              })
              return
            }

            // 更新字段
            entity.lastRunAt = now
            entity.nextRunAt =
              status === ScheduleStatus.DISABLED || status === ScheduleStatus.EXPIRED
                ? undefined
                : nextRunAt ?? undefined
            entity.status = status

            // 使用 save() 保存，触发 Subscriber 并传递完整实体
            await txManager.save(entity)
          })

          // 详细日志：更新操作结果
          logger.info('[WorkflowExecutionService] 数据库 save 操作完成', {
            scheduleId: schedule.id
          })

          // 验证查询：确认数据已写入（使用新的 manager 确保读取到已提交的数据）
          const verified = await manager.findOne(WorkflowScheduleEntity, {
            where: { id: schedule.id }
          })
          logger.info('[WorkflowExecutionService] 数据写入验证', {
            scheduleId: schedule.id,
            verifiedLastRunAt: verified?.lastRunAt?.toISOString() || 'null',
            verifiedNextRunAt: verified?.nextRunAt?.toISOString() || 'null',
            verifiedStatus: verified?.status || 'null',
            match:
              verified?.lastRunAt?.getTime() === now.getTime() &&
              (verified?.nextRunAt?.getTime() === nextRunAt?.getTime() ||
                (!verified?.nextRunAt && !nextRunAt))
          })
        })
      },
      3,
      1000,
      `更新调度状态 [${schedule.name}]`
    )
  }

  /**
   * 计算下次执行时间（委托给 workflow-schedule.util）
   */
  private calculateNextRunTime(schedule: WorkflowScheduleEntity): Date | null {
    return calcNextRunTime(schedule)
  }
}
