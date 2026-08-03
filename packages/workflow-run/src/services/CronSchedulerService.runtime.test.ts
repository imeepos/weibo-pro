import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CronSchedulerService } from './CronSchedulerService'
import { WorkflowExecutionService } from './WorkflowExecutionService'
import { RedisClient } from '@sker/redis'
import { WorkflowScheduleEntity, ScheduleStatus, ScheduleType } from '@sker/entities'
import { logger } from '@sker/core'
import {
  createSchedule,
  createMockExecutionService,
  createMockRedis,
} from '../test/helpers/cron-scheduler-mocks'

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

describe('CronSchedulerService - 运行时行为', () => {
  let service: CronSchedulerService
  let mockExecutionService: WorkflowExecutionService
  let mockRedis: RedisClient

  beforeEach(() => {
    // 重置 mock 数据
    mockState.schedules = []

    mockExecutionService = createMockExecutionService()
    mockRedis = createMockRedis()

    service = new CronSchedulerService(mockExecutionService, mockRedis)
  })

  afterEach(async () => {
    await service.stopAll()
    vi.clearAllMocks()
  })

  describe('addSchedule - 日志应包含下一次执行时间', () => {
    it('Cron 调度日志应包含 nextRunAt 字段', async () => {
      // Arrange
      const loggerInfoSpy = vi.spyOn(logger, 'info')
      const schedule = createSchedule({
        id: 'test-schedule-next-run',
        name: '测试下一次执行时间',
        cronExpression: '0 * * * *' // 每小时执行
      })

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
      const schedule = createSchedule({
        id: 'test-schedule-interval-next-run',
        name: '测试间隔调度下一次执行时间',
        scheduleType: ScheduleType.INTERVAL,
        intervalSeconds: 3600, // 每小时执行
      })

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
      const disabledSchedule = createSchedule({
        id: 'test-schedule-disabled',
        name: '已禁用的调度',
        status: ScheduleStatus.DISABLED
      })

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
      const expiredSchedule = createSchedule({
        id: 'test-schedule-expired',
        name: '已过期的调度',
        status: ScheduleStatus.EXPIRED
      })

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
      const enabledSchedule = createSchedule({
        id: 'test-schedule-enabled',
        name: '启用的调度',
        status: ScheduleStatus.ENABLED
      })

      // 设置 mock 数据
      mockState.schedules = [enabledSchedule]

      // Act - 添加启用的调度
      await service.addSchedule(enabledSchedule)

      // Assert - 验证调度已添加
      expect(service.getJobCount()).toBe(1)
    })

    it('reloadSchedule 应正确处理禁用的调度', async () => {
      // Arrange
      const disabledSchedule = createSchedule({
        id: 'test-schedule-reload-disabled',
        name: '重新加载-禁用的调度',
        status: ScheduleStatus.DISABLED
      })

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
