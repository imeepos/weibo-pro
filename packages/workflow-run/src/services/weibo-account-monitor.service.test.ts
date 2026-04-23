import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeiboAccountMonitorService } from './weibo-account-monitor.service'
import { RedisClient } from '@sker/redis'
import { WeiboAccountEntity, WeiboAccountStatus } from '@sker/entities'

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

    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      expire: vi.fn(),
      zcard: vi.fn(),
      zrange: vi.fn(),
      del: vi.fn(),
      lpush: vi.fn(),
      lrange: vi.fn(),
      ltrim: vi.fn(),
    } as any

    service = new WeiboAccountMonitorService(mockRedis)
  })

  describe('getMetrics - 获取监控指标', () => {
    it('应正确计算基本指标', async () => {
      // Arrange
      const accounts: WeiboAccountEntity[] = [
        {
          id: 'account-1',
          weiboUid: 'uid1',
          weiboNickname: 'nickname1',
          weiboAvatar: 'avatar1',
          cookies: 'cookies1',
          status: WeiboAccountStatus.ACTIVE,
          lastCheckAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'account-2',
          weiboUid: 'uid2',
          weiboNickname: 'nickname2',
          weiboAvatar: 'avatar2',
          cookies: 'cookies2',
          status: WeiboAccountStatus.ACTIVE,
          lastCheckAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'account-3',
          weiboUid: 'uid3',
          weiboNickname: 'nickname3',
          weiboAvatar: 'avatar3',
          cookies: 'cookies3',
          status: WeiboAccountStatus.EXPIRED,
          lastCheckAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue(accounts),
          count: vi.fn().mockResolvedValue(3),
        }
        return await callback(mockManager)
      })

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
      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        }
        return await callback(mockManager)
      })

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
      const accounts: WeiboAccountEntity[] = Array.from({ length: 3 }, (_, i) => ({
        id: `account-${i + 1}`,
        weiboUid: `uid${i + 1}`,
        weiboNickname: `nickname${i + 1}`,
        weiboAvatar: `avatar${i + 1}`,
        cookies: `cookies${i + 1}`,
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue(accounts),
          count: vi.fn().mockResolvedValue(3),
        }
        return await callback(mockManager)
      })

      vi.mocked(mockRedis.zcard).mockResolvedValue(3)
      vi.mocked(mockRedis.lrange).mockResolvedValue([])

      // Act
      const metrics = await service.getMetrics()

      // Assert
      expect(metrics.availabilityRate).toBe(100)
    })

    it('应统计所有状态的账号', async () => {
      // Arrange
      const accounts: WeiboAccountEntity[] = [
        {
          id: 'account-1',
          weiboUid: 'uid1',
          weiboNickname: 'nickname1',
          weiboAvatar: 'avatar1',
          cookies: 'cookies1',
          status: WeiboAccountStatus.ACTIVE,
          lastCheckAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'account-2',
          weiboUid: 'uid2',
          weiboNickname: 'nickname2',
          weiboAvatar: 'avatar2',
          cookies: 'cookies2',
          status: WeiboAccountStatus.INACTIVE,
          lastCheckAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'account-3',
          weiboUid: 'uid3',
          weiboNickname: 'nickname3',
          weiboAvatar: 'avatar3',
          cookies: 'cookies3',
          status: WeiboAccountStatus.EXPIRED,
          lastCheckAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue(accounts),
          count: vi.fn().mockResolvedValue(3),
        }
        return await callback(mockManager)
      })

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
      const accounts: WeiboAccountEntity[] = [
        {
          id: 'account-1',
          weiboUid: 'uid1',
          weiboNickname: 'nickname1',
          weiboAvatar: 'avatar1',
          cookies: 'cookies1',
          status: WeiboAccountStatus.ACTIVE,
          lastCheckAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue(accounts),
          count: vi.fn().mockResolvedValue(1),
        }
        return await callback(mockManager)
      })

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

  describe('recordSnapshot - 记录快照', () => {
    it('应成功记录快照到Redis', async () => {
      // Arrange
      const snapshot = {
        timestamp: new Date('2024-01-01T10:00:00.000Z'),
        total: 10,
        active: 8,
        expired: 2,
        available: 8,
        availabilityRate: 80,
      }

      vi.mocked(mockRedis.lpush).mockResolvedValue(1)

      // Act
      await service.recordSnapshot(snapshot)

      // Assert
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'weibo:account:snapshots',
        JSON.stringify(snapshot)
      )
      expect(mockRedis.ltrim).toHaveBeenCalledWith('weibo:account:snapshots', 0, 23)
    })

    it('应保留最近24小时数据（24条记录）', async () => {
      // Arrange
      const snapshot = {
        timestamp: new Date(),
        total: 10,
        active: 8,
        expired: 2,
        available: 8,
        availabilityRate: 80,
      }

      vi.mocked(mockRedis.lpush).mockResolvedValue(25)

      // Act
      await service.recordSnapshot(snapshot)

      // Assert
      expect(mockRedis.ltrim).toHaveBeenCalledWith('weibo:account:snapshots', 0, 23)
    })
  })

  describe('takeSnapshot - 采集快照', () => {
    it('应采集当前状态并记录到Redis', async () => {
      // Arrange
      const accounts: WeiboAccountEntity[] = [
        {
          id: 'account-1',
          weiboUid: 'uid1',
          weiboNickname: 'nickname1',
          weiboAvatar: 'avatar1',
          cookies: 'cookies1',
          status: WeiboAccountStatus.ACTIVE,
          lastCheckAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue(accounts),
          count: vi.fn().mockResolvedValue(1),
        }
        return await callback(mockManager)
      })

      vi.mocked(mockRedis.zcard).mockResolvedValue(1)
      vi.mocked(mockRedis.lpush).mockResolvedValue(1)

      // Act
      await service.takeSnapshot()

      // Assert
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'weibo:account:snapshots',
        expect.stringContaining('"total":1')
      )
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
      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        }
        return await callback(mockManager)
      })

      vi.mocked(mockRedis.zcard).mockRejectedValue(new Error('Redis连接失败'))

      // Act & Assert
      await expect(service.getMetrics()).rejects.toThrow('Redis连接失败')
    })
  })

  describe('checkAlerts - 告警检查', () => {
    it('当可用率 < 50% 应该返回严重告警', async () => {
      // Arrange
      const metrics = {
        total: 10,
        active: 10,
        expired: 0,
        available: 4,
        availabilityRate: 40,
        lastCheckTime: new Date(),
        trend: [],
      }

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
      const metrics = {
        total: 10,
        active: 10,
        expired: 0,
        available: 6,
        availabilityRate: 60,
        lastCheckTime: new Date(),
        trend: [],
      }

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
      const metrics = {
        total: 1,
        active: 1,
        expired: 0,
        available: 1,
        availabilityRate: 100,
        lastCheckTime: new Date(),
        trend: [],
      }

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
      const metrics = {
        total: 10,
        active: 10,
        expired: 0,
        available: 9,
        availabilityRate: 90,
        lastCheckTime: new Date(),
        trend: [],
      }

      vi.mocked(mockRedis.get).mockResolvedValue(null)

      // Act
      const alerts = await service.checkAlerts(metrics)

      // Assert
      expect(alerts).toHaveLength(0)
    })

    it('应该抑制相同的告警（1小时内）', async () => {
      // Arrange
      const metrics = {
        total: 10,
        active: 10,
        expired: 0,
        available: 4,
        availabilityRate: 40,
        lastCheckTime: new Date(),
        trend: [],
      }

      // 模拟 Redis 中已有告警记录
      vi.mocked(mockRedis.get).mockResolvedValue(new Date().toISOString())

      // Act
      const alerts = await service.checkAlerts(metrics)

      // Assert
      expect(alerts).toHaveLength(0)
    })

    it('应该记录新的告警到 Redis', async () => {
      // Arrange
      const metrics = {
        total: 10,
        active: 10,
        expired: 0,
        available: 4,
        availabilityRate: 40,
        lastCheckTime: new Date(),
        trend: [],
      }

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
