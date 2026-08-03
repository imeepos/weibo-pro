import { Injectable, Inject, logger } from '@sker/core'
import { RedisClient } from '@sker/redis'
import { WorkflowScheduleEntity, ScheduleStatus } from '@sker/entities'
import { WorkflowExecutionService } from './WorkflowExecutionService'
import { WeiboAccountSyncService } from './weibo-account-sync.service'
import nodeSchedule from 'node-schedule'
import { CronJobRegistry } from './cron/cron-job-registry'
import { DistributedLock } from './cron/cron-distributed-lock'
import { CronSchedulePersistence } from './cron/cron-schedule-persistence'
import { CronExecutionEngine } from './cron/cron-execution-engine'
import { CronJobScheduler } from './cron/cron-job-scheduler'
import { triggerCleanup } from './cron/cron-cleanup'
import { formatBeijingTime } from './cron/cron-time.util'

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
 * 对外门面，职责拆分为：
 * - cron/cron-job-registry: 内存任务状态管理
 * - cron/cron-distributed-lock: Redis 分布式锁
 * - cron/cron-schedule-persistence: 数据库持久化
 * - cron/cron-execution-engine: 调度触发执行
 * - cron/cron-job-scheduler: 任务注册/注销
 * - cron/cron-cleanup: 定期清理
 * - cron/cron-time.util: 北京时间格式化
 */
@Injectable()
export class CronSchedulerService {
  private readonly lockTTL = 300 // 锁过期时间（秒），根据任务最长执行时间调整
  private readonly MAX_EXECUTIONS_BEFORE_CLEANUP = 50 // 每50次执行后清理
  private readonly registry = new CronJobRegistry()
  private readonly persistence = new CronSchedulePersistence()
  private readonly engine: CronExecutionEngine
  private readonly scheduler: CronJobScheduler

  constructor(
    @Inject(WorkflowExecutionService) executionService: WorkflowExecutionService,
    @Inject(RedisClient) private readonly redis: RedisClient,
    @Inject(WeiboAccountSyncService) private accountSyncService: WeiboAccountSyncService
  ) {
    const lock = new DistributedLock(this.redis)
    this.engine = new CronExecutionEngine({
      executionService,
      lock,
      registry: this.registry,
      persistence: this.persistence,
      lockTTL: this.lockTTL,
      maxExecutionsBeforeCleanup: this.MAX_EXECUTIONS_BEFORE_CLEANUP,
      onRemoveSchedule: (scheduleId) => this.removeSchedule(scheduleId),
      onTriggerCleanup: () => triggerCleanup()
    })
    this.scheduler = new CronJobScheduler(this.registry, this.engine, this.persistence)
  }

  /**
   * 添加调度任务
   */
  async addSchedule(schedule: WorkflowScheduleEntity): Promise<void> {
    await this.scheduler.register(schedule)
  }

  /**
   * 移除调度任务
   */
  removeSchedule(scheduleId: string): void {
    this.scheduler.unregister(scheduleId)
  }

  /**
   * 启动时从数据库加载所有启用的调度
   */
  async initializeSchedules(): Promise<void> {
    try {
      // 1. 启动时执行一次账号同步
      logger.info('🔄 启动时同步账号健康数据')
      try {
        const syncResult = await this.accountSyncService.syncAccountsToRedis()
        logger.info('✅ 账号同步完成', {
          added: syncResult.added,
          updated: syncResult.updated,
          errors: syncResult.errors.length
        })
      } catch (error) {
        logger.error('❌ 账号同步失败', {
          error: (error as Error).message
        })
      }

      // 2. 设置每小时执行一次的定期同步任务
      this.registry.setAccountSyncJob(
        nodeSchedule.scheduleJob('0 * * * *', async () => {
          logger.info('🔄 定期同步账号健康数据')
          try {
            const syncResult = await this.accountSyncService.syncAccountsToRedis()
            logger.info('✅ 定期账号同步完成', {
              added: syncResult.added,
              updated: syncResult.updated,
              errors: syncResult.errors.length
            })
          } catch (error) {
            logger.error('❌ 定期账号同步失败', {
              error: (error as Error).message
            })
          }
        })
      )

      const accountSyncJob = this.registry.getAccountSyncJob()
      if (accountSyncJob) {
        const nextSyncTime = accountSyncJob.nextInvocation()
        logger.info('📅 账号同步定时任务已设置', {
          nextSyncTime: formatBeijingTime(nextSyncTime)
        })
      }

      // 3. 加载调度任务
      const schedules = await this.persistence.findEnabledSchedules()

      logger.info(`🚀 开始加载调度任务`, { count: schedules.length })

      for (const schedule of schedules) {
        await this.addSchedule(schedule)
      }

      logger.info(`✅ 调度任务加载完成`, {
        total: schedules.length,
        loaded: this.getJobCount(),
        cronJobs: this.registry.scheduleJobs.size,
        intervalTimers: this.registry.intervalTimers.size,
        continuousRunning: this.registry.continuousRunning.size
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
    const totalCount = this.registry.getJobCount()
    logger.info('🛑 停止所有调度任务', {
      count: totalCount,
      cronJobs: this.registry.scheduleJobs.size,
      intervalTimers: this.registry.intervalTimers.size,
      continuousSchedules: this.registry.continuousRunning.size
    })

    // 清理账号同步定时任务
    if (this.registry.getAccountSyncJob()) {
      this.registry.cancelAccountSyncJob()
      logger.debug('取消账号同步定时任务')
    }

    // 清理 node-schedule 任务
    for (const [scheduleId, job] of this.registry.scheduleJobs) {
      job.cancel()
      logger.debug('取消 Cron 调度', { scheduleId })
    }
    this.registry.scheduleJobs.clear()

    // 清理 interval 定时器
    for (const [scheduleId, timer] of this.registry.intervalTimers) {
      clearInterval(timer)
      logger.debug('取消间隔定时器', { scheduleId })
    }
    this.registry.intervalTimers.clear()

    // 清理持续调度运行标记（这会停止持续调度的循环）
    for (const scheduleId of this.registry.continuousRunning) {
      logger.debug('停止持续调度', { scheduleId })
    }
    this.registry.continuousRunning.clear()

    logger.info('✅ 所有调度任务已停止')
  }

  /**
   * 获取当前运行的调度任务数量
   */
  getJobCount(): number {
    return this.registry.getJobCount()
  }

  /**
   * 获取所有调度任务ID
   */
  getScheduleIds(): string[] {
    return this.registry.getScheduleIds()
  }

  /**
   * 启动监听数据库变更（Redis Pub/Sub）
   */
  async startWatching(): Promise<ScheduleWatcher> {
    let stopped = false
    let unsubscribe: (() => void) | undefined

    try {
      // 使用 Redis 订阅 workflow_schedule_change 通道
      // 保存取消函数，stop() 时真正退订并释放连接（防止订阅连接泄漏）
      unsubscribe = this.redis.subscribe(
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
        // 真正退订并释放 Redis 订阅连接
        if (unsubscribe) {
          try {
            unsubscribe()
          } catch (error) {
            logger.error('退订 Redis 调度变更监听失败', {
              error: (error as Error).message
            })
          }
          unsubscribe = undefined
        }
        logger.info('已停止 Redis 调度变更监听')
      },
      isStopped: () => stopped
    }
  }

  /**
   * 重新加载单个调度
   */
  async reloadSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.persistence.findById(scheduleId)

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
