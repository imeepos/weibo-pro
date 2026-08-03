import { logger } from '@sker/core'
import { useEntityManager, WorkflowScheduleEntity, ScheduleStatus } from '@sker/entities'
import { withRetryOnNetworkError } from '../../utils/retry-on-network-error'
import { formatBeijingTime } from './cron-time.util'

/**
 * 调度任务数据库持久化
 *
 * 统一封装 WorkflowScheduleEntity 的数据库访问：
 * - 按 ID 查询（无重试，供 reloadSchedule 使用）
 * - 按 ID 查询（带重试，供执行前校验使用）
 * - 查询所有启用调度（带重试，供启动加载使用）
 * - 更新 nextRunAt 字段（带重试 + 异常兜底）
 */
export class CronSchedulePersistence {
  /**
   * 按 ID 查询调度（无重试）
   */
  async findById(scheduleId: string): Promise<WorkflowScheduleEntity | null> {
    return await useEntityManager(async (manager) => {
      return await manager.findOne(WorkflowScheduleEntity, { where: { id: scheduleId } })
    })
  }

  /**
   * 按 ID 查询调度（带网络重试）
   */
  async findByIdWithRetry(scheduleId: string, operationName: string): Promise<WorkflowScheduleEntity | null> {
    return await withRetryOnNetworkError(
      async () => {
        return await useEntityManager(async (manager) => {
          return await manager.findOne(WorkflowScheduleEntity, { where: { id: scheduleId } })
        })
      },
      3,
      1000,
      operationName
    )
  }

  /**
   * 查询所有启用状态的调度
   */
  async findEnabledSchedules(): Promise<WorkflowScheduleEntity[]> {
    return await withRetryOnNetworkError(
      async () => {
        return await useEntityManager(async (manager) => {
          return await manager.find(WorkflowScheduleEntity, {
            where: { status: ScheduleStatus.ENABLED }
          })
        })
      },
      3,
      1000,
      '加载调度任务列表'
    )
  }

  /**
   * 更新数据库中的 nextRunAt 字段
   *
   * 这个方法确保内存中的调度时间与数据库保持同步
   * 防止 nextRunAt 停留在过期时间
   */
  async updateNextRunAt(scheduleId: string, nextRunAt: Date): Promise<void> {
    try {
      await withRetryOnNetworkError(
        async () => {
          await useEntityManager(async (manager) => {
            // 使用 update() 直接更新 nextRunAt 字段
            const updateResult = await manager.update(
              WorkflowScheduleEntity,
              { id: scheduleId },
              { nextRunAt }
            )

            logger.debug('[CronSchedulerService] 更新数据库 nextRunAt', {
              scheduleId,
              nextRunAt: formatBeijingTime(nextRunAt),
              affectedRows: updateResult.affected
            })
          })
        },
        3,
        1000,
        `更新 nextRunAt [${scheduleId}]`
      )
    } catch (error) {
      logger.error('[CronSchedulerService] 更新 nextRunAt 失败', {
        scheduleId,
        nextRunAt: formatBeijingTime(nextRunAt),
        error: (error as Error).message
      })
    }
  }
}
