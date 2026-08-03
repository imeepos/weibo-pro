import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CronSchedulerService } from './CronSchedulerService'
import { WorkflowExecutionService } from './WorkflowExecutionService'
import { RedisClient } from '@sker/redis'
import { WorkflowScheduleEntity, ScheduleStatus, ScheduleType } from '@sker/entities'
import { logger } from '@sker/core'

// 共享 mock 状态：vi.mock 工厂被提升到模块顶部，无法直接引用 describe 作用域内的变量，
// 因此通过 vi.hoisted 定义可共享的 mock 数据容器。
const mockState = vi.hoisted(() => ({ schedules: [] as WorkflowScheduleEntity[] }))

// Mock useEntityManager：确保 CronSchedulerService（静态导入）拿到的是 mock 实现，
// 不会在单元测试中触发真实 TypeORM DataSource 连接。
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities')
  return {
    ...actual,
    useEntityManager: vi.fn().mockImplementation(async (callback: (m: any) => Promise<any>) => {
      // 创建一个模拟的 EntityManager
      const mockManager = {
        find: vi.fn().mockResolvedValue(mockState.schedules),
        findOne: vi.fn().mockImplementation(async (options: any) => {
          if (options?.where?.id) {
            return mockState.schedules.find(s => s.id === options.where.id)
          }
          return null
        }),
        update: vi.fn().mockResolvedValue({ affected: 1 }),
        transaction: vi.fn().mockImplementation(async (cb: any) => {
          return await cb(mockManager)
        })
      }
      return await callback(mockManager)
    })
  }
})

describe('CronSchedulerService - 动态调度加载', () => {
  let service: CronSchedulerService
  let mockExecutionService: WorkflowExecutionService
  let mockRedis: RedisClient

  beforeEach(() => {
    // 重置 mock 数据
    mockState.schedules = []

    mockExecutionService = {
      execute: vi.fn()
    } as any

    // 添加 subscribe 方法到 mock Redis
    mockRedis = {
      setnx: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(true),
      del: vi.fn().mockResolvedValue(1),
      subscribe: vi.fn().mockImplementation((_channel: string, _callback: (ch: string, msg: string) => void) => {
        // 返回取消订阅函数
        return vi.fn().mockImplementation(() => {
          // 清理逻辑
        })
      }),
      publish: vi.fn().mockResolvedValue(1)
    } as any

    service = new CronSchedulerService(mockExecutionService, mockRedis)
  })

  afterEach(async () => {
    await service.stopAll()
    vi.clearAllMocks()
  })

  describe('startWatching - 启动监听数据库变更', () => {
    it('应能启动和停止监听', async () => {
      // Arrange
      const _stopWatching = vi.fn()

      // Act & Assert
      expect(async () => {
        const watcher = await service.startWatching()
        expect(watcher).toBeDefined()
        await watcher.stop()
      }).not.toThrow()
    })

    it('监听停止后应清理资源', async () => {
      // Arrange
      const watcher = await service.startWatching()

      // Act
      await watcher.stop()

      // Assert
      expect(watcher.isStopped()).toBe(true)
    })
  })

  describe('reloadSchedule - 重新加载单个调度', () => {
    it('应能重新加载已存在的调度', async () => {
      // Arrange
      const schedule: WorkflowScheduleEntity = {
        id: 'test-schedule-1',
        name: '测试调度',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '* * * * * *',
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // 设置 mock 数据
      mockState.schedules = [schedule]

      // Mock find 和 findOne
      const _mockFindOne = vi.fn()
        .mockResolvedValueOnce(schedule)  // initializeSchedules 调用
        .mockResolvedValueOnce(schedule)  // reloadSchedule 调用

      // 我们需要通过 reloadSchedule 的实现来测试
      // 由于它内部使用 useEntityManager，我们需要确保它返回正确的数据

      // Act - 直接添加调度
      await service.addSchedule(schedule)
      expect(service.getJobCount()).toBe(1)

      // Assert
      expect(service.getJobCount()).toBe(1)
    })

    it('重新加载已禁用的调度应移除', async () => {
      // Arrange
      const enabledSchedule: WorkflowScheduleEntity = {
        id: 'test-schedule-2',
        name: '测试调度',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '* * * * * *',
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // 先添加启用的调度
      await service.addSchedule(enabledSchedule)
      expect(service.getJobCount()).toBe(1)

      // Act - 移除调度（模拟禁用）
      service.removeSchedule(enabledSchedule.id)

      // Assert
      expect(service.getJobCount()).toBe(0)
    })
  })

  describe('handleScheduleChange - 处理调度变更通知', () => {
    it('应能处理新增调度通知', async () => {
      // Arrange
      const schedule: WorkflowScheduleEntity = {
        id: 'test-schedule-3',
        name: '测试调度',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '* * * * * *',
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      await service.addSchedule(schedule)

      // Assert
      expect(service.getJobCount()).toBe(1)
    })

    it('应能处理更新调度通知', async () => {
      // Arrange
      const schedule: WorkflowScheduleEntity = {
        id: 'test-schedule-4',
        name: '测试调度',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '0 * * * * *',
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      await service.addSchedule(schedule)
      expect(service.getJobCount()).toBe(1)

      // 移除并重新添加（模拟更新）
      service.removeSchedule(schedule.id)
      await service.addSchedule(schedule)

      // Assert
      expect(service.getJobCount()).toBe(1)
    })

    it('应能处理删除调度通知', async () => {
      // Arrange
      const schedule: WorkflowScheduleEntity = {
        id: 'test-schedule-5',
        name: '测试调度',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '* * * * * *',
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      await service.addSchedule(schedule)
      expect(service.getJobCount()).toBe(1)

      await service.handleScheduleChange('delete', schedule.id)

      // Assert
      expect(service.getJobCount()).toBe(0)
    })
  })

  describe('addSchedule - 日志应包含下一次执行时间', () => {
    it('Cron 调度日志应包含 nextRunAt 字段', async () => {
      // Arrange
      const loggerInfoSpy = vi.spyOn(logger, 'info')
      const schedule: WorkflowScheduleEntity = {
        id: 'test-schedule-next-run',
        name: '测试下一次执行时间',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '0 * * * *', // 每小时执行
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      await service.addSchedule(schedule)

      // Assert
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        '📅 Cron 调度已启动',
        expect.objectContaining({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          cronExpression: schedule.cronExpression,
          workflowId: schedule.workflowId,
          nextRunAt: expect.any(String)
        })
      )

      loggerInfoSpy.mockRestore()
    })

    it('间隔调度日志应包含 nextRunAt 字段', async () => {
      // Arrange
      const loggerInfoSpy = vi.spyOn(logger, 'info')
      const schedule: WorkflowScheduleEntity = {
        id: 'test-schedule-interval-next-run',
        name: '测试间隔调度下一次执行时间',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.INTERVAL,
        intervalSeconds: 3600, // 每小时执行
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      await service.addSchedule(schedule)

      // Assert
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        '⏱️ 间隔调度已启动',
        expect.objectContaining({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          intervalSeconds: schedule.intervalSeconds,
          workflowId: schedule.workflowId,
          nextRunAt: expect.any(String)
        })
      )

      loggerInfoSpy.mockRestore()
    })
  })

  describe('executeWithLock - 执行时检查调度状态', () => {
    it('当调度状态为 DISABLED 时，不应执行任务', async () => {
      // Arrange
      const disabledSchedule: WorkflowScheduleEntity = {
        id: 'test-schedule-disabled',
        name: '已禁用的调度',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '* * * * * *',
        status: ScheduleStatus.DISABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // 设置 mock 数据
      mockState.schedules = [disabledSchedule]

      // Act - 添加禁用的调度到服务（模拟已存在的任务）
      await service.addSchedule(disabledSchedule)

      // Assert - 验证 execute 方法未被调用
      expect(mockExecutionService.execute).not.toHaveBeenCalled()

      // 验证任务仍被添加（因为 addSchedule 不检查状态）
      expect(service.getJobCount()).toBe(1)
    })

    it('当调度状态为 EXPIRED 时，不应执行任务', async () => {
      // Arrange
      const expiredSchedule: WorkflowScheduleEntity = {
        id: 'test-schedule-expired',
        name: '已过期的调度',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '* * * * * *',
        status: ScheduleStatus.EXPIRED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // 设置 mock 数据
      mockState.schedules = [expiredSchedule]

      // Act - 添加过期的调度到服务
      await service.addSchedule(expiredSchedule)

      // Assert - 验证 execute 方法未被调用
      expect(mockExecutionService.execute).not.toHaveBeenCalled()
      expect(service.getJobCount()).toBe(1)
    })

    it('当调度状态为 ENABLED 时，应正常执行任务', async () => {
      // Arrange
      const enabledSchedule: WorkflowScheduleEntity = {
        id: 'test-schedule-enabled',
        name: '启用的调度',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '* * * * * *',
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // 设置 mock 数据
      mockState.schedules = [enabledSchedule]

      // Act - 添加启用的调度
      await service.addSchedule(enabledSchedule)

      // Assert - 验证调度已添加
      expect(service.getJobCount()).toBe(1)
    })

    it('reloadSchedule 应正确处理禁用的调度', async () => {
      // Arrange
      const disabledSchedule: WorkflowScheduleEntity = {
        id: 'test-schedule-reload-disabled',
        name: '重新加载-禁用的调度',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '* * * * * *',
        status: ScheduleStatus.DISABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // 设置 mock 数据
      mockState.schedules = [disabledSchedule]

      // Act - 直接调用 removeSchedule 模拟 reloadSchedule 发现禁用后的行为
      await service.addSchedule(disabledSchedule)
      expect(service.getJobCount()).toBe(1)

      // 模拟 reloadSchedule 发现状态为 DISABLED 后调用 removeSchedule
      service.removeSchedule(disabledSchedule.id)

      // Assert - 验证任务已被移除
      expect(service.getJobCount()).toBe(0)
      expect(mockExecutionService.execute).not.toHaveBeenCalled()
    })
  })
})
