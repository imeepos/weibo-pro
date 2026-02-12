import { Injectable, Inject, logger } from '@sker/core'
import { RedisClient } from '@sker/redis'
import { useEntityManager, WorkflowScheduleEntity, ScheduleStatus, ScheduleType } from '@sker/entities'
import { WorkflowExecutionService } from './WorkflowExecutionService'
import { withRetryOnNetworkError } from '../utils/retry-on-network-error'
import nodeSchedule from 'node-schedule'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

// 配置 dayjs 时区插件
dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 格式化时间为北京时间字符串
 */
function formatBeijingTime(date: Date | null | undefined): string {
  if (!date) return '无'
  return dayjs(date).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
}

type ScheduleChangeType = 'insert' | 'update' | 'delete'

interface ScheduleChangeMessage {
  type: ScheduleChangeType
  scheduleId: string
}

interface ScheduleWatcher {
  stop: () => Promise<void>
  isStopped: () => boolean
}

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
  private intervalTimers = new Map<string, NodeJS.Timeout>()
  private continuousRunning = new Set<string>() // 正在运行的持续调度任务ID
  private readonly lockTTL = 300 // 锁过期时间（秒），根据任务最长执行时间调整
  private executionCount = 0 // 执行计数器
  private readonly MAX_EXECUTIONS_BEFORE_CLEANUP = 50 // 每50次执行后清理

  constructor(
    @Inject(WorkflowExecutionService) private executionService: WorkflowExecutionService,
    @Inject(RedisClient) private redis: RedisClient
  ) { }

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
          logger.error('❌ Cron 调度缺少表达式', { scheduleId: schedule.id })
          return
        }
        job = nodeSchedule.scheduleJob(
          schedule.cronExpression,
          async () => await this.executeWithLock(schedule)
        )
        const nextInvocation = job?.nextInvocation()
        logger.info('📅 Cron 调度已启动', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          cronExpression: schedule.cronExpression,
          workflowId: schedule.workflowId,
          nextRunAt: formatBeijingTime(nextInvocation)
        })
        break

      case ScheduleType.INTERVAL:
        if (!schedule.intervalSeconds) {
          logger.error('❌ 间隔调度缺少间隔时间', { scheduleId: schedule.id })
          return
        }
        // 使用 setInterval 实现精确间隔调度，避免时间漂移
        const intervalMs = schedule.intervalSeconds * 1000
        const timer = setInterval(async () => {
          await this.executeWithLock(schedule)
        }, intervalMs)
        this.intervalTimers.set(schedule.id, timer)
        const nextIntervalRun = new Date(Date.now() + intervalMs)
        logger.info('⏱️ 间隔调度已启动', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          intervalSeconds: schedule.intervalSeconds,
          intervalMs,
          workflowId: schedule.workflowId,
          nextRunAt: formatBeijingTime(nextIntervalRun)
        })
        return

      case ScheduleType.ONCE:
        if (!schedule.startTime) {
          logger.error('❌ 一次性调度缺少开始时间', { scheduleId: schedule.id })
          return
        }
        job = nodeSchedule.scheduleJob(
          new Date(schedule.startTime),
          async () => await this.executeWithLock(schedule)
        )
        const executeDate = new Date(schedule.startTime)
        logger.info('🎯 一次性调度已设置', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          startTime: schedule.startTime,
          executeAt: formatBeijingTime(executeDate),
          workflowId: schedule.workflowId
        })
        break

      case ScheduleType.MANUAL:
        // 手动触发不需要调度
        logger.debug('🖐️ 手动触发类型，跳过调度', { scheduleId: schedule.id })
        return

      case ScheduleType.CONTINUOUS:
        // 持续模式：立即启动第一次执行
        // 后续执行在 executeContinuous 中处理（执行完毕后立即重新执行）
        this.startContinuousSchedule(schedule)
        return

      default:
        logger.error('❌ 不支持的调度类型', {
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
    // 清理 cron/once 类型的 node-schedule 任务
    const job = this.scheduleJobs.get(scheduleId)
    if (job) {
      job.cancel()
      this.scheduleJobs.delete(scheduleId)
      logger.debug('移除调度任务', { scheduleId })
    }

    // 清理 interval 类型的定时器
    const timer = this.intervalTimers.get(scheduleId)
    if (timer) {
      clearInterval(timer)
      this.intervalTimers.delete(scheduleId)
      logger.debug('移除间隔定时器', { scheduleId })
    }

    // 清理 continuous 类型的运行标记
    if (this.continuousRunning.has(scheduleId)) {
      this.continuousRunning.delete(scheduleId)
      logger.debug('移除持续调度运行标记', { scheduleId })
    }
  }

  /**
   * 启动持续调度模式
   * 持续模式会在工作流执行完毕后立即重新执行，形成无限循环
   */
  private startContinuousSchedule(schedule: WorkflowScheduleEntity): void {
    // 防止重复启动
    if (this.continuousRunning.has(schedule.id)) {
      logger.debug('持续调度已在运行中，跳过重复启动', { scheduleId: schedule.id })
      return
    }

    this.continuousRunning.add(schedule.id)
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
    if (!this.continuousRunning.has(scheduleId)) {
      logger.debug('持续调度已停止，退出循环', { scheduleId })
      return
    }

    const lockKey = `schedule:lock:${scheduleId}`
    const startTime = Date.now()

    try {
      // 🔍 在执行前检查调度状态（从数据库获取最新状态）
      const latestSchedule = await this.validateScheduleStatus(scheduleId, schedule.name)
      if (!latestSchedule) {
        this.continuousRunning.delete(scheduleId)
        return
      }

      // 🔒 尝试获取分布式锁
      const locked = await withRetryOnNetworkError(
        () => this.tryLock(lockKey, this.lockTTL),
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
        if (this.continuousRunning.has(scheduleId)) {
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
          () => this.executionService.execute(latestSchedule),
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
        if (this.executionCount >= this.MAX_EXECUTIONS_BEFORE_CLEANUP) {
          await this.triggerCleanup()
          this.executionCount = 0
        }
      } finally {
        // 释放锁
        await withRetryOnNetworkError(
          () => this.redis.del(lockKey),
          3,
          1000,
          `释放分布式锁 [持续调度 ${schedule.name}]`
        )
      }

      // 执行完毕后调度下一次执行（增加延迟给 GC 更多时间）
      if (this.continuousRunning.has(scheduleId)) {
        await this.delayBeforeNextRun(30000) // 从 5000ms 增加到 30000ms
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
      if (this.continuousRunning.has(scheduleId)) {
        await this.delayBeforeNextRun(30000) // 错误后等待30秒
        if (this.continuousRunning.has(scheduleId)) {
          setImmediate(() => this.executeContinuous(schedule))
        }
      }
    }
  }

  /**
   * 触发定期清理（浏览器实例 + GC）
   */
  private async triggerCleanup(): Promise<void> {
    logger.info('🧹 触发定期清理')

    try {
      // 清理 Playwright 浏览器实例
      const { PlaywrightService } = await import('./PlaywrightService.js')
      await PlaywrightService.cleanup()
      logger.info('✅ Playwright 浏览器实例已清理')
    } catch (error) {
      logger.error('清理 Playwright 失败', { error: (error as Error).message })
    }

    // 触发 GC（如果可用）
    if (global.gc) {
      global.gc()
      logger.info('✅ 手动触发 GC 完成')
    }

    // 记录内存使用情况
    this.logMemoryUsage()
  }

  /**
   * 记录内存使用情况
   */
  private logMemoryUsage(): void {
    const used = process.memoryUsage()
    logger.info('📊 内存使用情况', {
      rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(used.external / 1024 / 1024)}MB`
    })
  }

  /**
   * 下次执行前的延迟
   */
  private async delayBeforeNextRun(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 检查调度状态是否可以执行
   * @returns 返回最新调度信息，如果不可执行则返回 null
   */
  private async validateScheduleStatus(scheduleId: string, scheduleName: string): Promise<WorkflowScheduleEntity | null> {
    const latestSchedule = await withRetryOnNetworkError(
      async () => {
        return await useEntityManager(async (manager) => {
          return await manager.findOne(WorkflowScheduleEntity, { where: { id: scheduleId } })
        })
      },
      3,
      1000,
      `检查调度状态 [${scheduleName}]`
    )

    // 如果调度不存在，取消执行
    if (!latestSchedule) {
      logger.warn('⚠️ 调度不存在，取消执行', {
        scheduleId,
        scheduleName
      })
      this.removeSchedule(scheduleId)
      return null
    }

    // 如果调度已被禁用或过期，取消执行
    if (latestSchedule.status !== ScheduleStatus.ENABLED) {
      logger.warn('⚠️ 调度已被禁用或过期，取消执行', {
        scheduleId,
        scheduleName,
        status: latestSchedule.status
      })
      this.removeSchedule(scheduleId)
      return null
    }

    return latestSchedule
  }

  /**
   * 使用分布式锁执行任务
   */
  private async executeWithLock(schedule: WorkflowScheduleEntity): Promise<void> {
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
        () => this.tryLock(lockKey, this.lockTTL),
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
        lockTTL: this.lockTTL
      })

      // 执行任务
      try {
        await withRetryOnNetworkError(
          () => this.executionService.execute(latestSchedule),
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
          () => this.redis.del(lockKey),
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

      logger.info(`🚀 开始加载调度任务`, { count: schedules.length })

      for (const schedule of schedules) {
        await this.addSchedule(schedule)
      }

      logger.info(`✅ 调度任务加载完成`, {
        total: schedules.length,
        loaded: this.getJobCount(),
        cronJobs: this.scheduleJobs.size,
        intervalTimers: this.intervalTimers.size,
        continuousRunning: this.continuousRunning.size
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
    const totalCount = this.scheduleJobs.size + this.intervalTimers.size + this.continuousRunning.size
    logger.info('🛑 停止所有调度任务', {
      count: totalCount,
      cronJobs: this.scheduleJobs.size,
      intervalTimers: this.intervalTimers.size,
      continuousSchedules: this.continuousRunning.size
    })

    // 清理 node-schedule 任务
    for (const [scheduleId, job] of this.scheduleJobs) {
      job.cancel()
      logger.debug('取消 Cron 调度', { scheduleId })
    }
    this.scheduleJobs.clear()

    // 清理 interval 定时器
    for (const [scheduleId, timer] of this.intervalTimers) {
      clearInterval(timer)
      logger.debug('取消间隔定时器', { scheduleId })
    }
    this.intervalTimers.clear()

    // 清理持续调度运行标记（这会停止持续调度的循环）
    for (const scheduleId of this.continuousRunning) {
      logger.debug('停止持续调度', { scheduleId })
    }
    this.continuousRunning.clear()

    logger.info('✅ 所有调度任务已停止')
  }

  /**
   * 获取当前运行的调度任务数量
   */
  getJobCount(): number {
    return this.scheduleJobs.size + this.intervalTimers.size + this.continuousRunning.size
  }

  /**
   * 获取所有调度任务ID
   */
  getScheduleIds(): string[] {
    return Array.from(new Set([...this.scheduleJobs.keys(), ...this.intervalTimers.keys(), ...this.continuousRunning]))
  }

  /**
   * 启动监听数据库变更（Redis Pub/Sub）
   */
  async startWatching(): Promise<ScheduleWatcher> {
    let stopped = false

    try {
      // 使用 Redis 订阅 workflow_schedule_change 通道
      const unsubscribe = this.redis.subscribe(
        'workflow_schedule_change',
        async (_channel: string, message: string) => {
          if (stopped) return

          try {
            const { type, scheduleId } = JSON.parse(message) as ScheduleChangeMessage
            await this.handleScheduleChange(type, scheduleId)
          } catch (error) {
            logger.error('处理调度变更通知失败', {
              error: (error as Error).message,
              message
            })
          }
        }
      )

      logger.info('✅ 已启动 Redis 调度变更监听')
    } catch (error) {
      logger.error('启动 Redis 监听失败', {
        error: (error as Error).message
      })
      throw error
    }

    return {
      stop: async () => {
        if (stopped) return
        stopped = true
        logger.info('已停止 Redis 调度变更监听')
      },
      isStopped: () => stopped
    }
  }

  /**
   * 重新加载单个调度
   */
  async reloadSchedule(scheduleId: string): Promise<void> {
    const schedule = await useEntityManager(async (manager) => {
      return await manager.findOne(WorkflowScheduleEntity, { where: { id: scheduleId } })
    })

    if (!schedule) {
      // 调度不存在，移除
      this.removeSchedule(scheduleId)
      logger.info('调度已删除，移除任务', { scheduleId })
      return
    }

    if (schedule.status !== ScheduleStatus.ENABLED) {
      // 调度已禁用，移除
      this.removeSchedule(scheduleId)
      logger.info('调度已禁用，移除任务', { scheduleId })
      return
    }

    // 重新添加调度（会先移除旧的）
    await this.addSchedule(schedule)
    logger.info('重新加载调度', { scheduleId, name: schedule.name })
  }

  /**
   * 处理调度变更通知
   */
  async handleScheduleChange(type: ScheduleChangeType, scheduleId: string): Promise<void> {
    logger.debug('收到调度变更通知', { type, scheduleId })

    switch (type) {
      case 'insert':
      case 'update':
        await this.reloadSchedule(scheduleId)
        break

      case 'delete':
        this.removeSchedule(scheduleId)
        logger.info('删除调度任务', { scheduleId })
        break

      default:
        logger.warn('未知的调度变更类型', { type, scheduleId })
    }
  }
}
