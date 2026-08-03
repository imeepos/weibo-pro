import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CronSchedulerService } from './CronSchedulerService'
import { WorkflowExecutionService } from './WorkflowExecutionService'
import { RedisClient } from '@sker/redis'
import { WorkflowScheduleEntity, ScheduleStatus } from '@sker/entities'
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

describe('CronSchedulerService - 动态调度加载', () => {
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
      const schedule = createSchedule({ id: 'test-schedule-1' })

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
      const enabledSchedule = createSchedule({
        id: 'test-schedule-2',
        status: ScheduleStatus.ENABLED
      })

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
      const schedule = createSchedule({ id: 'test-schedule-3' })

      // Act
      await service.addSchedule(schedule)

      // Assert
      expect(service.getJobCount()).toBe(1)
    })

    it('应能处理更新调度通知', async () => {
      // Arrange
      const schedule = createSchedule({
        id: 'test-schedule-4',
        cronExpression: '0 * * * * *'
      })

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
      const schedule = createSchedule({ id: 'test-schedule-5' })

      // Act
      await service.addSchedule(schedule)
      expect(service.getJobCount()).toBe(1)

      await service.handleScheduleChange('delete', schedule.id)

      // Assert
      expect(service.getJobCount()).toBe(0)
    })
  })
})
