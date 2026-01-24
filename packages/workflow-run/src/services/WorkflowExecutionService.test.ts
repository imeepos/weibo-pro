import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WorkflowExecutionService } from './WorkflowExecutionService'
import { ScheduleType, ScheduleStatus, WorkflowScheduleEntity } from '@sker/entities'

describe('WorkflowExecutionService - calculateNextRunTime', () => {
  let service: WorkflowExecutionService

  beforeEach(() => {
    service = new WorkflowExecutionService()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('CRON 类型调度', () => {
    it('应根据 cron 表达式正确计算下次执行时间 - 每小时第20分钟', () => {
      // Arrange
      vi.useFakeTimers()
      // 设置当前时间为 2026-01-24 02:20:12 UTC
      vi.setSystemTime(new Date('2026-01-24T02:20:12.000Z'))

      const schedule: WorkflowScheduleEntity = {
        id: 'test-cron-1',
        name: '测试 CRON',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '20 * * * *', // 每小时第20分钟
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const nextRunAt = (service as any).calculateNextRunTime(schedule)

      // Assert - 下次执行应该是 03:20:00 UTC
      expect(nextRunAt).not.toBeNull()
      expect(nextRunAt?.getUTCHours()).toBe(3)
      expect(nextRunAt?.getUTCMinutes()).toBe(20)
      expect(nextRunAt?.getUTCSeconds()).toBe(0)
    })

    it('应根据 cron 表达式正确计算下次执行时间 - 每5分钟', () => {
      // Arrange
      vi.useFakeTimers()
      // 设置当前时间为 2026-01-24 02:22:00 UTC
      vi.setSystemTime(new Date('2026-01-24T02:22:00.000Z'))

      const schedule: WorkflowScheduleEntity = {
        id: 'test-cron-2',
        name: '测试 CRON 每5分钟',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '*/5 * * * *', // 每5分钟
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const nextRunAt = (service as any).calculateNextRunTime(schedule)

      // Assert - 下次执行应该是 02:25:00 UTC
      expect(nextRunAt).not.toBeNull()
      expect(nextRunAt?.getUTCHours()).toBe(2)
      expect(nextRunAt?.getUTCMinutes()).toBe(25)
    })

    it('缺少 cron 表达式时应返回 null', () => {
      // Arrange
      const schedule: WorkflowScheduleEntity = {
        id: 'test-cron-no-expr',
        name: '测试无表达式',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: undefined,
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const nextRunAt = (service as any).calculateNextRunTime(schedule)

      // Assert
      expect(nextRunAt).toBeNull()
    })

    it('无效的 cron 表达式应返回 null', () => {
      // Arrange
      const schedule: WorkflowScheduleEntity = {
        id: 'test-cron-invalid',
        name: '测试无效表达式',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: 'invalid-cron',
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const nextRunAt = (service as any).calculateNextRunTime(schedule)

      // Assert
      expect(nextRunAt).toBeNull()
    })
  })

  describe('INTERVAL 类型调度', () => {
    it('应正确计算间隔调度的下次执行时间', () => {
      // Arrange
      vi.useFakeTimers()
      const now = new Date('2026-01-24T02:20:00.000Z')
      vi.setSystemTime(now)

      const schedule: WorkflowScheduleEntity = {
        id: 'test-interval-1',
        name: '测试间隔',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.INTERVAL,
        intervalSeconds: 3600, // 1小时
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const nextRunAt = (service as any).calculateNextRunTime(schedule)

      // Assert - 下次执行应该是 1 小时后
      expect(nextRunAt).not.toBeNull()
      expect(nextRunAt?.getTime()).toBe(now.getTime() + 3600 * 1000)
    })
  })

  describe('ONCE 类型调度', () => {
    it('一次性调度执行后应返回 null', () => {
      // Arrange
      const schedule: WorkflowScheduleEntity = {
        id: 'test-once-1',
        name: '测试一次性',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.ONCE,
        startTime: new Date('2026-01-24T03:00:00.000Z'),
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const nextRunAt = (service as any).calculateNextRunTime(schedule)

      // Assert
      expect(nextRunAt).toBeNull()
    })
  })

  describe('过期调度', () => {
    it('已过期的调度应返回 null', () => {
      // Arrange
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-24T10:00:00.000Z'))

      const schedule: WorkflowScheduleEntity = {
        id: 'test-expired-1',
        name: '测试过期',
        workflowId: 'workflow-1',
        scheduleType: ScheduleType.CRON,
        cronExpression: '20 * * * *',
        endTime: new Date('2026-01-24T08:00:00.000Z'), // 已过期
        status: ScheduleStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const nextRunAt = (service as any).calculateNextRunTime(schedule)

      // Assert
      expect(nextRunAt).toBeNull()
    })
  })
})
