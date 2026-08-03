import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeiboAccountMonitorService } from './weibo-account-monitor.service'
import { RedisClient } from '@sker/redis'
import { createMockRedis, makeAccount, makeSnapshot, mockFindAccounts } from './weibo-account-monitor.test-helpers'

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

  describe('recordSnapshot - 记录快照', () => {
    it('应成功记录快照到Redis', async () => {
      // Arrange
      const snapshot = makeSnapshot()

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
      const snapshot = makeSnapshot({ timestamp: new Date() })

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
      const accounts = [makeAccount('account-1')]

      mockFindAccounts(useEntityManagerMock, accounts)

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
})
