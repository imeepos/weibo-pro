import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CronSchedulerService } from './CronSchedulerService'
import { WorkflowExecutionService } from './WorkflowExecutionService'
import { RedisClient } from '@sker/redis'
import { DataSource, WorkflowScheduleEntity, ScheduleStatus, ScheduleType } from '@sker/entities'

describe('CronSchedulerService - 动态调度加载', () => {
  let service: CronSchedulerService
  let mockExecutionService: WorkflowExecutionService
  let mockRedis: RedisClient
  let mockDataSource: DataSource

  beforeEach(() => {
    mockExecutionService = {
      execute: vi.fn()
    } as any

    mockRedis = {
      setnx: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(true),
      del: vi.fn().mockResolvedValue(1)
    } as any

    mockDataSource = {
      getRepository: vi.fn().mockReturnValue({
        find: vi.fn().mockResolvedValue([])
      })
    } as any

    service = new CronSchedulerService(mockExecutionService, mockRedis, mockDataSource)
  })

  afterEach(async () => {
    await service.stopAll()
  })

  describe('startWatching - 启动监听数据库变更', () => {
    it('应能启动和停止监听', async () => {
      // Arrange
      const stopWatching = vi.fn()

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

      mockDataSource.getRepository = vi.fn().mockReturnValue({
        find: vi.fn().mockResolvedValue([schedule]),
        findOne: vi.fn().mockResolvedValue(schedule)
      }) as any

      await service.initializeSchedules()
      expect(service.getJobCount()).toBe(1)

      // Act
      await service.reloadSchedule(schedule.id)

      // Assert
      expect(service.getJobCount()).toBe(1)
    })

    it('重新加载已禁用的调度应移除', async () => {
      // Arrange
      const schedule: WorkflowScheduleEntity = {
        id: 'test-schedule-2',
        name: '测试调度',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '* * * * * *',
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDataSource.getRepository = vi.fn().mockReturnValue({
        find: vi.fn().mockResolvedValue([schedule]),
        findOne: vi.fn().mockResolvedValue({ ...schedule, status: ScheduleStatus.DISABLED })
      }) as any

      await service.initializeSchedules()
      expect(service.getJobCount()).toBe(1)

      // Act
      await service.reloadSchedule(schedule.id)

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

      mockDataSource.getRepository = vi.fn().mockReturnValue({
        find: vi.fn().mockResolvedValue([]),
        findOne: vi.fn().mockResolvedValue(schedule)
      }) as any

      await service.initializeSchedules()

      // Act
      await service.handleScheduleChange('insert', schedule.id)

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

      mockDataSource.getRepository = vi.fn().mockReturnValue({
        find: vi.fn().mockResolvedValue([schedule]),
        findOne: vi.fn().mockResolvedValue({ ...schedule, cronExpression: '* * * * * *' })
      }) as any

      await service.initializeSchedules()
      expect(service.getJobCount()).toBe(1)

      // Act
      await service.handleScheduleChange('update', schedule.id)

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

      mockDataSource.getRepository = vi.fn().mockReturnValue({
        find: vi.fn().mockResolvedValue([schedule]),
        findOne: vi.fn().mockResolvedValue(null)
      }) as any

      await service.initializeSchedules()
      expect(service.getJobCount()).toBe(1)

      // Act
      await service.handleScheduleChange('delete', schedule.id)

      // Assert
      expect(service.getJobCount()).toBe(0)
    })
  })
})
