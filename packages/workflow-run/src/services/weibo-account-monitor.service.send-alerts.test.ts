import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeiboAccountMonitorService } from './weibo-account-monitor.service'
import { RedisClient } from '@sker/redis'
import { createMockRedis } from './weibo-account-monitor.test-helpers'

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

  describe('sendAlerts - 发送告警', () => {
    it('应该输出严重告警到控制台', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const alert = {
        level: 'critical' as const,
        message: '账号可用率过低: 40% (阈值: 50%)',
        metric: 'availabilityRate',
        value: 40,
        threshold: 50,
        timestamp: new Date(),
      }

      // Act
      service.sendAlerts([alert])

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('🚨 [CRITICAL] 账号可用率过低: 40% (阈值: 50%)')
      consoleSpy.mockRestore()
    })

    it('应该输出警告到控制台', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const alert = {
        level: 'warning' as const,
        message: '账号可用率偏低: 65% (阈值: 70%)',
        metric: 'availabilityRate',
        value: 65,
        threshold: 70,
        timestamp: new Date(),
      }

      // Act
      service.sendAlerts([alert])

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('⚠️  [WARNING] 账号可用率偏低: 65% (阈值: 70%)')
      consoleSpy.mockRestore()
    })

    it('应该输出紧急告警到控制台', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const alert = {
        level: 'emergency' as const,
        message: '账号数量过少: 1 个 (阈值: 2)',
        metric: 'activeAccounts',
        value: 1,
        threshold: 2,
        timestamp: new Date(),
      }

      // Act
      service.sendAlerts([alert])

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('🚨 [EMERGENCY] 账号数量过少: 1 个 (阈值: 2)')
      consoleSpy.mockRestore()
    })

    it('应该支持多个告警同时输出', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const alerts = [
        {
          level: 'emergency' as const,
          message: '账号数量过少: 1 个 (阈值: 2)',
          metric: 'activeAccounts',
          value: 1,
          threshold: 2,
          timestamp: new Date(),
        },
        {
          level: 'critical' as const,
          message: '账号可用率过低: 40% (阈值: 50%)',
          metric: 'availabilityRate',
          value: 40,
          threshold: 50,
          timestamp: new Date(),
        },
      ]

      // Act
      service.sendAlerts(alerts)

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('🚨 [EMERGENCY] 账号数量过少: 1 个 (阈值: 2)')
      expect(consoleSpy).toHaveBeenCalledWith('🚨 [CRITICAL] 账号可用率过低: 40% (阈值: 50%)')
      consoleSpy.mockRestore()
    })

    it('当没有告警时不应该输出', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Act
      service.sendAlerts([])

      // Assert
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
