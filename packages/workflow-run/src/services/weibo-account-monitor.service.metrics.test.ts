import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeiboAccountMonitorService } from './weibo-account-monitor.service'
import { RedisClient } from '@sker/redis'
import { WeiboAccountStatus } from '@sker/entities'
import { createMockRedis, makeAccount, makeAccounts, mockFindAccounts } from './weibo-account-monitor.test-helpers'

const {
  useEntityManagerMock,
} = vi.hoisted(() => ({
  useEntityManagerMock: vi.fn(),
}))

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual<typeof import('@sker/entities')>('@sker/entities')
  return {
    ...actual,
    useEntityManager: useEntityManagerMock
  }
})

describe('WeiboAccountMonitorService', () => {
  let service: WeiboAccountMonitorService
  let mockRedis: RedisClient

  beforeEach(() => {
    vi.clearAllMocks()

    mockRedis = createMockRedis()

    service = new WeiboAccountMonitorService(mockRedis)
  })

  describe('getMetrics - 获取监控指标', () => {
    it('应正确计算基本指标', async () => {
      // Arrange
      const accounts = [
        makeAccount('account-1'),
        makeAccount('account-2'),
        makeAccount('account-3', { status: WeiboAccountStatus.EXPIRED }),
      ]

      mockFindAccounts(useEntityManagerMock, accounts)

      vi.mocked(mockRedis.zcard).mockResolvedValue(2)
      vi.mocked(mockRedis.lrange).mockResolvedValue([])

      // Act
      const metrics = await service.getMetrics()

      // Assert
      expect(metrics.total).toBe(3)
      expect(metrics.active).toBe(2)
      expect(metrics.expired).toBe(1)
      expect(metrics.available).toBe(2)
      expect(metrics.availabilityRate).toBe(66.67)
      expect(metrics.lastCheckTime).toBeInstanceOf(Date)
      expect(metrics.trend).toEqual([])
    })

    it('应正确处理空账号列表', async () => {
      // Arrange
      mockFindAccounts(useEntityManagerMock, [])

      vi.mocked(mockRedis.zcard).mockResolvedValue(0)
      vi.mocked(mockRedis.lrange).mockResolvedValue([])

      // Act
      const metrics = await service.getMetrics()

      // Assert
      expect(metrics.total).toBe(0)
      expect(metrics.active).toBe(0)
      expect(metrics.expired).toBe(0)
      expect(metrics.available).toBe(0)
      expect(metrics.availabilityRate).toBe(0)
      expect(metrics.trend).toEqual([])
    })

    it('应正确计算可用率（四舍五入到两位小数）', async () => {
      // Arrange
      const accounts = makeAccounts(3)

      mockFindAccounts(useEntityManagerMock, accounts)

      vi.mocked(mockRedis.zcard).mockResolvedValue(3)
      vi.mocked(mockRedis.lrange).mockResolvedValue([])

      // Act
      const metrics = await service.getMetrics()

      // Assert
      expect(metrics.availabilityRate).toBe(100)
    })

    it('应统计所有状态的账号', async () => {
      // Arrange
      const accounts = [
        makeAccount('account-1'),
        makeAccount('account-2', { status: WeiboAccountStatus.INACTIVE }),
        makeAccount('account-3', { status: WeiboAccountStatus.EXPIRED }),
      ]

      mockFindAccounts(useEntityManagerMock, accounts)

      vi.mocked(mockRedis.zcard).mockResolvedValue(1)
      vi.mocked(mockRedis.lrange).mockResolvedValue([])

      // Act
      const metrics = await service.getMetrics()

      // Assert
      expect(metrics.total).toBe(3)
      expect(metrics.active).toBe(1)
      expect(metrics.expired).toBe(1)
    })
  })

  describe('getMetrics - 趋势数据', () => {
    it('应返回历史趋势数据', async () => {
      // Arrange
      const accounts = [makeAccount('account-1')]

      mockFindAccounts(useEntityManagerMock, accounts)

      const snapshots = [
        JSON.stringify({
          timestamp: '2024-01-01T10:00:00.000Z',
          total: 10,
          active: 8,
          expired: 2,
          available: 8,
          availabilityRate: 80,
        }),
        JSON.stringify({
          timestamp: '2024-01-01T11:00:00.000Z',
          total: 10,
          active: 9,
          expired: 1,
          available: 9,
          availabilityRate: 90,
        }),
      ]

      vi.mocked(mockRedis.zcard).mockResolvedValue(1)
      vi.mocked(mockRedis.lrange).mockResolvedValue(snapshots)

      // Act
      const metrics = await service.getMetrics()

      // Assert
      expect(metrics.trend).toHaveLength(2)
      expect(metrics.trend[0]).toEqual({
        timestamp: new Date('2024-01-01T10:00:00.000Z'),
        total: 10,
        active: 8,
        expired: 2,
        available: 8,
        availabilityRate: 80,
      })
    })
  })

  describe('错误处理', () => {
    it('数据库查询失败时应抛出错误', async () => {
      // Arrange
      useEntityManagerMock.mockRejectedValue(new Error('数据库连接失败'))

      // Act & Assert
      await expect(service.getMetrics()).rejects.toThrow('数据库连接失败')
    })

    it('Redis操作失败时应抛出错误', async () => {
      // Arrange
      mockFindAccounts(useEntityManagerMock, [])

      vi.mocked(mockRedis.zcard).mockRejectedValue(new Error('Redis连接失败'))

      // Act & Assert
      await expect(service.getMetrics()).rejects.toThrow('Redis连接失败')
    })
  })
})
