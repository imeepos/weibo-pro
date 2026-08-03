import { logger } from '@sker/core'
import { ScheduleStatus } from '@sker/entities'
import type { WorkflowScheduleEntity } from '@sker/entities'
import type { WorkflowExecutionService } from '../WorkflowExecutionService'
import { withRetryOnNetworkError } from '../../utils/retry-on-network-error'
import type { CronJobRegistry } from './cron-job-registry'
import type { CronSchedulePersistence } from './cron-schedule-persistence'
import type { LockService } from './cron-distributed-lock'

export interface CronExecutionEngineOptions {
  executionService: WorkflowExecutionService
  lock: LockService
  registry: CronJobRegistry
  persistence: CronSchedulePersistence
  lockTTL: number
  maxExecutionsBeforeCleanup: number
  onRemoveSchedule: (scheduleId: string) => void
  onTriggerCleanup: () => Promise<void>
}

/**
 * Cron 调度执行引擎
 *
 * 负责调度任务的触发执行：
 * - executeWithLock: 普通调度（CRON / INTERVAL / ONCE）带分布式锁执行
 * - 持续调度循环：执行完毕后立即重新执行，形成无限循环
 * - 执行前校验调度状态（是否仍存在、是否启用）
 */
export class CronExecutionEngine {
  private executionCount = 0 // 执行计数器

  constructor(private options: CronExecutionEngineOptions) {}

  /**
   * 使用分布式锁执行任务
   */
  async executeWithLock(schedule: WorkflowScheduleEntity): Promise<void> {
    const lockKey = `schedule:lock:${schedule.id}`
    const startTime = Date.now()

    logger.info('⏰ 调度任务触发', {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      scheduleType: schedule.scheduleType,
      workflowId: schedule.workflowId
    })

    try {
      // 🔍 在执行前检查调度状态（从数据库获取最新状态）
      const latestSchedule = await this.validateScheduleStatus(schedule.id, schedule.name)
      if (!latestSchedule) {
        return
      }

      // 🔒 尝试获取分布式锁（使用 SETNX + EXPIRE）
      const locked = await withRetryOnNetworkError(
        () => this.options.lock.tryLock(lockKey, this.options.lockTTL),
        3,
        1000,
        `获取分布式锁 [${schedule.name}]`
      )

      if (!locked) {
        logger.debug('⏭️ 调度任务被其他实例执行中，跳过', {
          scheduleId: schedule.id,
          scheduleName: schedule.name
        })
        return
      }

      logger.debug('🔒 获取分布式锁成功，开始执行', {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        lockTTL: this.options.lockTTL
      })

      // 执行任务
      try {
        await withRetryOnNetworkError(
          () => this.options.executionService.execute(latestSchedule),
          3,
          1000,
          `执行调度任务 [${schedule.name}]`
        )

        const duration = Date.now() - startTime
        logger.info('✅ 调度任务执行成功', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          duration: `${duration}ms`
        })
      } finally {
        // 释放锁
        await withRetryOnNetworkError(
          () => this.options.lock.release(lockKey),
          3,
          1000,
          `释放分布式锁 [${schedule.name}]`
        )
      }
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('❌ 调度任务执行异常', {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        duration: `${duration}ms`,
        error: (error as Error).message,
        stack: (error as Error).stack
      })
    }
  }

  /**
   * 启动持续调度模式
   * 持续模式会在工作流执行完毕后立即重新执行，形成无限循环
   */
  startContinuousSchedule(schedule: WorkflowScheduleEntity): void {
    // 防止重复启动
    if (this.options.registry.hasContinuous(schedule.id)) {
      logger.debug('持续调度已在运行中，跳过重复启动', { scheduleId: schedule.id })
      return
    }

    this.options.registry.addContinuous(schedule.id)
    logger.info('🔄 持续调度已启动', {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      workflowId: schedule.workflowId
    })

    // 使用 setImmediate 立即启动第一次执行，避免阻塞当前调用栈
    setImmediate(() => this.executeContinuous(schedule))
  }

  /**
   * 持续调度执行循环
   * 在工作流执行完毕后立即重新执行
   */
  private async executeContinuous(schedule: WorkflowScheduleEntity): Promise<void> {
    const scheduleId = schedule.id

    // 检查是否仍在运行中（可能已被外部移除）
    if (!this.options.registry.hasContinuous(scheduleId)) {
      logger.debug('持续调度已停止，退出循环', { scheduleId })
      return
    }

    const lockKey = `schedule:lock:${scheduleId}`
    const startTime = Date.now()

    try {
      // 🔍 在执行前检查调度状态（从数据库获取最新状态）
      const latestSchedule = await this.validateScheduleStatus(scheduleId, schedule.name)
      if (!latestSchedule) {
        this.options.registry.deleteContinuous(scheduleId)
        return
      }

      // 🔒 尝试获取分布式锁
      const locked = await withRetryOnNetworkError(
        () => this.options.lock.tryLock(lockKey, this.options.lockTTL),
        3,
        1000,
        `获取分布式锁 [持续调度 ${schedule.name}]`
      )

      if (!locked) {
        logger.debug('⏭️ 持续调度任务被其他实例执行中，跳过本次执行', {
          scheduleId,
          scheduleName: schedule.name
        })
        // 等待一段时间后重试
        await this.delayBeforeNextRun(5000)
        if (this.options.registry.hasContinuous(scheduleId)) {
          setImmediate(() => this.executeContinuous(schedule))
        }
        return
      }

      logger.debug('🔒 持续调度获取分布式锁成功，开始执行', {
        scheduleId,
        scheduleName: schedule.name
      })

      // 执行任务
      try {
        await withRetryOnNetworkError(
          () => this.options.executionService.execute(latestSchedule),
          3,
          1000,
          `执行持续调度任务 [${schedule.name}]`
        )

        const duration = Date.now() - startTime
        logger.info('✅ 持续调度任务执行成功，准备立即执行下一次', {
          scheduleId,
          scheduleName: schedule.name,
          duration: `${duration}ms`
        })

        // 定期触发清理
        this.executionCount++
        if (this.executionCount >= this.options.maxExecutionsBeforeCleanup) {
          await this.options.onTriggerCleanup()
          this.executionCount = 0
        }
      } finally {
        // 释放锁
        await withRetryOnNetworkError(
          () => this.options.lock.release(lockKey),
          3,
          1000,
          `释放分布式锁 [持续调度 ${schedule.name}]`
        )
      }

      // 执行完毕后立即调度下一轮；setImmediate 会让出当前调用栈，避免递归堆栈增长。
      if (this.options.registry.hasContinuous(scheduleId)) {
        setImmediate(() => this.executeContinuous(schedule))
      }
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('❌ 持续调度任务执行异常，等待后重试', {
        scheduleId,
        scheduleName: schedule.name,
        duration: `${duration}ms`,
        error: (error as Error).message,
        stack: (error as Error).stack
      })

      // 发生错误时等待一段时间后重试
      if (this.options.registry.hasContinuous(scheduleId)) {
        await this.delayBeforeNextRun(30000) // 错误后等待30秒
        if (this.options.registry.hasContinuous(scheduleId)) {
          setImmediate(() => this.executeContinuous(schedule))
        }
      }
    }
  }

  /**
   * 检查调度状态是否可以执行
   * @returns 返回最新调度信息，如果不可执行则返回 null
   */
  private async validateScheduleStatus(scheduleId: string, scheduleName: string): Promise<WorkflowScheduleEntity | null> {
    const latestSchedule = await this.options.persistence.findByIdWithRetry(
      scheduleId,
      `检查调度状态 [${scheduleName}]`
    )

    // 如果调度不存在，取消执行
    if (!latestSchedule) {
      logger.warn('⚠️ 调度不存在，取消执行', {
        scheduleId,
        scheduleName
      })
      this.options.onRemoveSchedule(scheduleId)
      return null
    }

    // 如果调度已被禁用或过期，取消执行
    if (latestSchedule.status !== ScheduleStatus.ENABLED) {
      logger.warn('⚠️ 调度已被禁用或过期，取消执行', {
        scheduleId,
        scheduleName,
        status: latestSchedule.status
      })
      this.options.onRemoveSchedule(scheduleId)
      return null
    }

    return latestSchedule
  }

  /**
   * 下次执行前的延迟
   */
  private async delayBeforeNextRun(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
