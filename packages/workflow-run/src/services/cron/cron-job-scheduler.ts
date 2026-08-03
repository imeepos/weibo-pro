import { logger } from '@sker/core'
import { ScheduleType } from '@sker/entities'
import type { WorkflowScheduleEntity } from '@sker/entities'
import nodeSchedule from 'node-schedule'
import type { CronJobRegistry } from './cron-job-registry'
import type { CronExecutionEngine } from './cron-execution-engine'
import type { CronSchedulePersistence } from './cron-schedule-persistence'
import { formatBeijingTime } from './cron-time.util'

/**
 * Cron 任务注册器
 *
 * 负责调度任务的注册与注销：
 * - register: 根据调度类型创建对应的调度机制（node-schedule / setInterval / 持续模式）
 * - unregister: 移除对应调度任务（取消 Job / 清理定时器 / 清除持续运行标记）
 */
export class CronJobScheduler {
  constructor(
    private registry: CronJobRegistry,
    private engine: CronExecutionEngine,
    private persistence: CronSchedulePersistence
  ) {}

  /**
   * 注册调度任务（添加或更新）
   */
  async register(schedule: WorkflowScheduleEntity): Promise<void> {
    // 先移除已存在的任务
    this.unregister(schedule.id)

    let job: nodeSchedule.Job | null = null

    switch (schedule.scheduleType) {
      case ScheduleType.CRON: {
        if (!schedule.cronExpression) {
          logger.error('❌ Cron 调度缺少表达式', { scheduleId: schedule.id })
          return
        }
        job = nodeSchedule.scheduleJob(
          schedule.cronExpression,
          async () => await this.engine.executeWithLock(schedule)
        )
        const nextInvocation = job?.nextInvocation()

        // 📅 立即更新数据库中的 nextRunAt，确保与内存中的调度时间同步
        if (nextInvocation) {
          await this.persistence.updateNextRunAt(schedule.id, nextInvocation)
        }

        logger.info('📅 Cron 调度已启动', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          cronExpression: schedule.cronExpression,
          workflowId: schedule.workflowId,
          nextRunAt: formatBeijingTime(nextInvocation)
        })
        break
      }

      case ScheduleType.INTERVAL: {
        if (!schedule.intervalSeconds) {
          logger.error('❌ 间隔调度缺少间隔时间', { scheduleId: schedule.id })
          return
        }
        // 使用 setInterval 实现精确间隔调度，避免时间漂移
        const intervalMs = schedule.intervalSeconds * 1000
        const timer = setInterval(async () => {
          await this.engine.executeWithLock(schedule)
        }, intervalMs)
        this.registry.setTimer(schedule.id, timer)
        const nextIntervalRun = new Date(Date.now() + intervalMs)

        // 📅 立即更新数据库中的 nextRunAt，确保与内存中的调度时间同步
        await this.persistence.updateNextRunAt(schedule.id, nextIntervalRun)

        logger.info('⏱️ 间隔调度已启动', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          intervalSeconds: schedule.intervalSeconds,
          intervalMs,
          workflowId: schedule.workflowId,
          nextRunAt: formatBeijingTime(nextIntervalRun)
        })
        return
      }

      case ScheduleType.ONCE: {
        if (!schedule.startTime) {
          logger.error('❌ 一次性调度缺少开始时间', { scheduleId: schedule.id })
          return
        }
        job = nodeSchedule.scheduleJob(
          new Date(schedule.startTime),
          async () => await this.engine.executeWithLock(schedule)
        )
        const executeDate = new Date(schedule.startTime)

        // 📅 一次性调度的 nextRunAt 应该等于执行时间
        await this.persistence.updateNextRunAt(schedule.id, executeDate)

        logger.info('🎯 一次性调度已设置', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          startTime: schedule.startTime,
          executeAt: formatBeijingTime(executeDate),
          workflowId: schedule.workflowId
        })
        break
      }

      case ScheduleType.MANUAL:
        // 手动触发不需要调度
        logger.debug('🖐️ 手动触发类型，跳过调度', { scheduleId: schedule.id })
        return

      case ScheduleType.CONTINUOUS:
        // 持续模式：立即启动第一次执行
        // 后续执行在 executeContinuous 中处理（执行完毕后立即重新执行）
        this.engine.startContinuousSchedule(schedule)
        return

      default:
        logger.error('❌ 不支持的调度类型', {
          scheduleId: schedule.id,
          scheduleType: schedule.scheduleType
        })
        return
    }

    if (job) {
      this.registry.setJob(schedule.id, job)
    }
  }

  /**
   * 注销调度任务
   */
  unregister(scheduleId: string): void {
    // 清理 cron/once 类型的 node-schedule 任务
    if (this.registry.cancelJob(scheduleId)) {
      logger.debug('移除调度任务', { scheduleId })
    }

    // 清理 interval 类型的定时器
    if (this.registry.cancelTimer(scheduleId)) {
      logger.debug('移除间隔定时器', { scheduleId })
    }

    // 清理 continuous 类型的运行标记
    if (this.registry.deleteContinuous(scheduleId)) {
      logger.debug('移除持续调度运行标记', { scheduleId })
    }
  }
}
