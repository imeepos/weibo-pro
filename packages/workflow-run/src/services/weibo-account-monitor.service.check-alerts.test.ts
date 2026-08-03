import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeiboAccountMonitorService } from './weibo-account-monitor.service'
import { RedisClient } from '@sker/redis'
import { createMockRedis, makeMetrics } from './weibo-account-monitor.test-helpers'

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

  describe('checkAlerts - 告警检查', () => {
    it('当可用率 < 50% 应该返回严重告警', async () => {
      // Arrange
      const metrics = makeMetrics({ available: 4, availabilityRate: 40 })

      vi.mocked(mockRedis.get).mockResolvedValue(null)

      // Act
      const alerts = await service.checkAlerts(metrics)

      // Assert
      expect(alerts).toHaveLength(1)
      expect(alerts[0]).toMatchObject({
        level: 'critical',
        metric: 'availabilityRate',
        value: 40,
        threshold: 50,
      })
      expect(alerts[0].message).toContain('40%')
    })

    it('当可用率 < 70% 应该返回警告', async () => {
      // Arrange
      const metrics = makeMetrics({ available: 6, availabilityRate: 60 })

      vi.mocked(mockRedis.get).mockResolvedValue(null)

      // Act
      const alerts = await service.checkAlerts(metrics)

      // Assert
      expect(alerts).toHaveLength(1)
      expect(alerts[0]).toMatchObject({
        level: 'warning',
        metric: 'availabilityRate',
        value: 60,
        threshold: 70,
      })
    })

    it('当 ACTIVE 账号 < 2 应该返回紧急告警', async () => {
      // Arrange
      const metrics = makeMetrics({ total: 1, active: 1, available: 1, availabilityRate: 100 })

      vi.mocked(mockRedis.get).mockResolvedValue(null)

      // Act
      const alerts = await service.checkAlerts(metrics)

      // Assert
      expect(alerts).toHaveLength(1)
      expect(alerts[0]).toMatchObject({
        level: 'emergency',
        metric: 'activeAccounts',
        value: 1,
        threshold: 2,
      })
    })

    it('当所有指标正常时应该不返回告警', async () => {
      // Arrange
      const metrics = makeMetrics()

      vi.mocked(mockRedis.get).mockResolvedValue(null)

      // Act
      const alerts = await service.checkAlerts(metrics)

      // Assert
      expect(alerts).toHaveLength(0)
    })

    it('应该抑制相同的告警（1小时内）', async () => {
      // Arrange
      const metrics = makeMetrics({ available: 4, availabilityRate: 40 })

      // 模拟 Redis 中已有告警记录
      vi.mocked(mockRedis.get).mockResolvedValue(new Date().toISOString())

      // Act
      const alerts = await service.checkAlerts(metrics)

      // Assert
      expect(alerts).toHaveLength(0)
    })

    it('应该记录新的告警到 Redis', async () => {
      // Arrange
      const metrics = makeMetrics({ available: 4, availabilityRate: 40 })

      vi.mocked(mockRedis.get).mockResolvedValue(null)
      vi.mocked(mockRedis.set).mockResolvedValue('OK')
      vi.mocked(mockRedis.expire).mockResolvedValue(1)

      // Act
      const alerts = await service.checkAlerts(metrics)

      // Assert
      expect(alerts).toHaveLength(1)
      expect(mockRedis.set).toHaveBeenCalledWith(
        'weibo:account:last_alert:critical:availabilityRate',
        expect.any(String)
      )
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'weibo:account:last_alert:critical:availabilityRate',
        3600
      )
    })
  })
})
