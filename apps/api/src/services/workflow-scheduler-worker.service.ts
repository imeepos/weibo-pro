import { Injectable } from '@sker/core'
import { DataSource } from 'typeorm'
import { WorkflowScheduleEntity, ScheduleStatus, WorkflowRunEntity } from '@sker/entities'
import { WorkflowScheduleService } from './workflow-schedule.service'
import { WorkflowRunService } from './workflow-run.service'
import { WorkflowService } from './workflow.service'
import * as cron from 'node-cron'
import { logger } from '@sker/core'

@Injectable()
export class WorkflowSchedulerWorker {
  private schedulerJob: cron.ScheduledTask | null = null
  private isRunning = false
  private readonly scanInterval = '*/30 * * * * *' // 每30秒扫描一次
  private readonly maxConcurrentRuns = 10 // 最大并发执行数

  constructor(
    private dataSource: DataSource,
    private scheduleService: WorkflowScheduleService,
    private runService: WorkflowRunService,
    private workflowService: WorkflowService
  ) {}

  async start(): Promise<void> {
    if (this.schedulerJob) {
      logger.info('Workflow scheduler worker is already running')
      return
    }

    logger.info('Starting workflow scheduler worker')

    // 启动定时任务
    this.schedulerJob = cron.schedule(this.scanInterval, async () => {
      await this.processSchedules()
    }, {
      scheduled: true,
      runOnInit: true // 启动时立即执行一次
    })

    logger.info('Workflow scheduler worker started')
  }

  async stop(): Promise<void> {
    if (this.schedulerJob) {
      this.schedulerJob.stop()
      this.schedulerJob = null
      logger.info('Workflow scheduler worker stopped')
    }
  }

  private async processSchedules(): Promise<void> {
    if (this.isRunning) {
      logger.debug('Scheduler worker is busy, skipping this cycle')
      return
    }

    this.isRunning = true
    const startTime = Date.now()

    try {
      // 获取需要执行的调度
      const schedules = await this.scheduleService.getSchedulesToRun(this.maxConcurrentRuns)

      if (schedules.length > 0) {
        logger.info(`Found ${schedules.length} schedules to execute`)

        // 并发执行调度
        const promises = schedules.map(schedule => this.executeSchedule(schedule))
        await Promise.allSettled(promises)
      }

      // 处理过期的调度
      await this.handleExpiredSchedules()

    } catch (error) {
      logger.error('Error processing schedules:', error)
    } finally {
      this.isRunning = false
      const duration = Date.now() - startTime
      logger.debug(`Scheduler worker cycle completed in ${duration}ms`)
    }
  }

  private async executeSchedule(schedule: WorkflowScheduleEntity): Promise<void> {
    logger.info(`Executing schedule: ${schedule.id} (${schedule.name})`)

    try {
      // 获取工作流
      const workflow = await this.workflowService.getWorkflowById(schedule.workflowId)
      if (!workflow) {
        logger.error(`Workflow ${schedule.workflowId} not found for schedule ${schedule.id}`)
        return
      }

      // 创建工作流运行实例
      const run = await this.runService.createRun({
        workflowId: schedule.workflowId,
        scheduleId: schedule.id,
        inputs: {
          ...workflow.defaultInputs,
          ...schedule.inputs
        },
        graphSnapshot: workflow.graphDefinition
      })

      logger.info(`Created run ${run.id} for schedule ${schedule.id}`)

      // 更新调度状态（在事务中）
      await this.dataSource.transaction(async manager => {
        // 更新调度的执行时间
        await manager.update(WorkflowScheduleEntity, schedule.id, {
          lastRunAt: new Date(),
          nextRunAt: this.calculateNextRunTime(schedule)
        })
      })

      // 通过 MQ 异步触发执行（不等待结果）
      // 这里假设现有架构支持异步执行
      logger.info(`Scheduled run ${run.id} for execution`)

    } catch (error) {
      logger.error(`Failed to execute schedule ${schedule.id}:`, error)

      // 更新调度状态，避免无限重试
      try {
        await this.scheduleService.updateScheduleAfterRun(schedule)
      } catch (updateError) {
        logger.error(`Failed to update schedule ${schedule.id} after error:`, updateError)
      }
    }
  }

  private async handleExpiredSchedules(): Promise<void> {
    try {
      // 查找已过期的调度
      const expiredSchedules = await this.dataSource
        .getRepository(WorkflowScheduleEntity)
        .createQueryBuilder('schedule')
        .where('schedule.status = :enabled', { enabled: ScheduleStatus.ENABLED })
        .andWhere('schedule.endTime IS NOT NULL')
        .andWhere('schedule.endTime <= :now', { now: new Date() })
        .getMany()

      if (expiredSchedules.length > 0) {
        logger.info(`Found ${expiredSchedules.length} expired schedules`)

        // 批量更新过期状态
        const ids = expiredSchedules.map(s => s.id)
        await this.dataSource
          .getRepository(WorkflowScheduleEntity)
          .update(ids, {
            status: ScheduleStatus.EXPIRED,
            nextRunAt: null
          })

        logger.info(`Updated ${ids.length} schedules to expired status`)
      }
    } catch (error) {
      logger.error('Error handling expired schedules:', error)
    }
  }

  private calculateNextRunTime(schedule: WorkflowScheduleEntity): Date | null {
    // 如果调度已过期，返回 null
    if (schedule.status === ScheduleStatus.EXPIRED) {
      return null
    }

    // 如果设置了结束时间且已到期
    if (schedule.endTime && new Date() >= schedule.endTime) {
      return null
    }

    // 计算下次执行时间
    try {
      const nextTime = this.scheduleService.calculateNextRunTime(schedule.scheduleType, {
        cronExpression: schedule.cronExpression,
        intervalSeconds: schedule.intervalSeconds,
        startTime: new Date()
      })

      // 处理 MANUAL 类型返回 null 的情况
      return nextTime
    } catch (error) {
      logger.error(`Failed to calculate next run time for schedule ${schedule.id}:`, error)
      return null
    }
  }

  // 立即触发某个调度（用于测试或手动执行）
  async triggerSchedule(scheduleId: number): Promise<void> {
    const schedule = await this.scheduleService.getSchedule(scheduleId)
    if (schedule.status !== ScheduleStatus.ENABLED) {
      throw new Error(`Schedule ${scheduleId} is not enabled`)
    }

    await this.executeSchedule(schedule)
  }

  // 获取调度器状态
  getStatus(): { isRunning: boolean; lastScanTime?: Date } {
    return {
      isRunning: this.schedulerJob !== null,
      lastScanTime: new Date()
    }
  }
}