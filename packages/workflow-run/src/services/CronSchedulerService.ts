import { Injectable, Inject, logger } from '@sker/core'
import { RedisClient } from '@sker/redis'
import { DataSource, WorkflowScheduleEntity, ScheduleStatus, ScheduleType } from '@sker/entities'
import { WorkflowExecutionService } from './WorkflowExecutionService'
import { withRetryOnNetworkError } from '../utils/retry-on-network-error'
import nodeSchedule from 'node-schedule'

/**
 * Cron 调度服务（基于 node-schedule + 分布式锁）
 *
 * 存在即合理：
 * - 使用 node-schedule 替换轮询机制，实现精确调度
 * - 使用 Redis 分布式锁避免多实例重复执行
 * - 内存管理：Map 缓存 Job 对象
 * - 优雅关闭：自动 cancel 所有任务
 *
 * 优雅设计：
 * - addSchedule: 添加或更新调度任务
 * - removeSchedule: 移除调度任务
 * - initializeSchedules: 启动时加载所有启用的调度
 * - 分布式锁：每个任务执行前尝试获取锁
 *
 * 性能即艺术：
 * - node-schedule 基于系统定时器，零轮询开销
 * - Redis 分布式锁，多实例安全
 */
@Injectable()
export class CronSchedulerService {
  private scheduleJobs = new Map<string, nodeSchedule.Job>()
  private readonly lockTTL = 300 // 锁过期时间（秒），根据任务最长执行时间调整

  constructor(
    @Inject(WorkflowExecutionService) private executionService: WorkflowExecutionService,
    @Inject(RedisClient) private redis: RedisClient,
    @Inject(DataSource) private dataSource: DataSource
  ) {}

  /**
   * 添加调度任务
   */
  async addSchedule(schedule: WorkflowScheduleEntity): Promise<void> {
    // 先移除已存在的任务
    this.removeSchedule(schedule.id)

    let job: nodeSchedule.Job | null = null

    switch (schedule.scheduleType) {
      case ScheduleType.CRON:
        if (!schedule.cronExpression) {
          logger.error('Cron 调度缺少表达式', { scheduleId: schedule.id })
          return
        }
        job = nodeSchedule.scheduleJob(
          schedule.cronExpression,
          async () => await this.executeWithLock(schedule)
        )
        logger.info('添加 Cron 调度', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          cronExpression: schedule.cronExpression
        })
        break

      case ScheduleType.INTERVAL:
        if (!schedule.intervalSeconds) {
          logger.error('间隔调度缺少间隔时间', { scheduleId: schedule.id })
          return
        }
        // node-schedule 使用 RecurrenceRule 实现间隔调度
        const rule = new nodeSchedule.RecurrenceRule()
        const intervalMs = schedule.intervalSeconds * 1000

        // 简化处理：使用 setInterval + node-schedule 的 scheduleJob
        job = nodeSchedule.scheduleJob(new Date(Date.now() + intervalMs), async () => {
          await this.executeWithLock(schedule)
          // 重新调度下次执行
          await this.addSchedule(schedule)
        })
        logger.info('添加间隔调度', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          intervalSeconds: schedule.intervalSeconds
        })
        break

      case ScheduleType.ONCE:
        if (!schedule.startTime) {
          logger.error('一次性调度缺少开始时间', { scheduleId: schedule.id })
          return
        }
        job = nodeSchedule.scheduleJob(
          new Date(schedule.startTime),
          async () => await this.executeWithLock(schedule)
        )
        logger.info('添加一次性调度', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          startTime: schedule.startTime
        })
        break

      case ScheduleType.MANUAL:
        // 手动触发不需要调度
        logger.debug('手动触发类型，跳过调度', { scheduleId: schedule.id })
        return

      default:
        logger.error('不支持的调度类型', {
          scheduleId: schedule.id,
          scheduleType: schedule.scheduleType
        })
        return
    }

    if (job) {
      this.scheduleJobs.set(schedule.id, job)
    }
  }

  /**
   * 移除调度任务
   */
  removeSchedule(scheduleId: string): void {
    const job = this.scheduleJobs.get(scheduleId)
    if (job) {
      job.cancel()
      this.scheduleJobs.delete(scheduleId)
      logger.debug('移除调度任务', { scheduleId })
    }
  }

  /**
   * 使用分布式锁执行任务
   */
  private async executeWithLock(schedule: WorkflowScheduleEntity): Promise<void> {
    const lockKey = `schedule:lock:${schedule.id}`

    try {
      // 🔒 尝试获取分布式锁（使用 SETNX + EXPIRE）
      const locked = await withRetryOnNetworkError(
        () => this.tryLock(lockKey, this.lockTTL),
        3,
        1000,
        `获取分布式锁 [${schedule.name}]`
      )

      if (!locked) {
        logger.debug('调度任务被其他实例执行中，跳过', {
          scheduleId: schedule.id,
          scheduleName: schedule.name
        })
        return
      }

      // 执行任务
      try {
        await withRetryOnNetworkError(
          () => this.executionService.execute(schedule),
          3,
          1000,
          `执行调度任务 [${schedule.name}]`
        )
      } finally {
        // 释放锁
        await withRetryOnNetworkError(
          () => this.redis.del(lockKey),
          3,
          1000,
          `释放分布式锁 [${schedule.name}]`
        )
      }
    } catch (error) {
      logger.error('调度任务执行异常', {
        scheduleId: schedule.id,
        error: (error as Error).message,
        stack: (error as Error).stack
      })
    }
  }

  /**
   * 尝试获取分布式锁
   */
  private async tryLock(key: string, ttl: number): Promise<boolean> {
    try {
      // 使用 SETNX 获取锁
      const result = await this.redis.setnx(key, '1')

      if (result === 1) {
        // 获取锁成功，设置过期时间
        await this.redis.expire(key, ttl)
        return true
      }

      return false
    } catch (error) {
      logger.error('获取分布式锁失败', {
        key,
        error: (error as Error).message
      })
      return false
    }
  }

  /**
   * 启动时从数据库加载所有启用的调度
   */
  async initializeSchedules(): Promise<void> {
    try {
      const schedules = await withRetryOnNetworkError(
        async () => {
          return await this.dataSource.getRepository(WorkflowScheduleEntity).find({
            where: { status: ScheduleStatus.ENABLED }
          })
        },
        3,
        1000,
        '加载调度任务列表'
      )

      logger.info(`开始加载调度任务`, { count: schedules.length })

      for (const schedule of schedules) {
        await this.addSchedule(schedule)
      }

      logger.info(`✅ 调度任务加载完成`, {
        total: schedules.length,
        loaded: this.scheduleJobs.size
      })
    } catch (error) {
      logger.error('加载调度任务失败', {
        error: (error as Error).message,
        stack: (error as Error).stack
      })
    }
  }

  /**
   * 停止所有调度任务
   */
  async stopAll(): Promise<void> {
    logger.info('停止所有调度任务', { count: this.scheduleJobs.size })

    for (const [scheduleId, job] of this.scheduleJobs) {
      job.cancel()
      logger.debug('取消调度任务', { scheduleId })
    }

    this.scheduleJobs.clear()
    logger.info('✅ 所有调度任务已停止')
  }

  /**
   * 获取当前运行的调度任务数量
   */
  getJobCount(): number {
    return this.scheduleJobs.size
  }

  /**
   * 获取所有调度任务ID
   */
  getScheduleIds(): string[] {
    return Array.from(this.scheduleJobs.keys())
  }
}
