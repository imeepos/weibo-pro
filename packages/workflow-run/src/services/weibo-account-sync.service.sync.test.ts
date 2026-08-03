import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeiboAccountSyncService } from './weibo-account-sync.service'
import { RedisClient } from '@sker/redis'
import { WeiboAccountStatus } from '@sker/entities'
import { logger } from '@sker/core'
import {
  makeAccount,
  createMockRedis,
  mockFindAccounts,
} from './weibo-account-sync.test-helpers'

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

describe('WeiboAccountSyncService - syncAccountsToRedis', () => {
  let service: WeiboAccountSyncService
  let mockRedis: RedisClient

  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks()

    // 创建 Mock Redis 客户端
    mockRedis = createMockRedis()

    service = new WeiboAccountSyncService(mockRedis)
  })

  describe('启动时同步', () => {
    it('所有 ACTIVE 账号都在 Redis 中，无需操作', async () => {
      // Arrange
      const account1 = makeAccount('account-1')
      mockFindAccounts(useEntityManagerMock, [account1])

      // Mock Redis 已经有这个账号
      vi.mocked(mockRedis.zscore).mockResolvedValueOnce('10000')

      // Act
      const result = await service.syncAccountsToRedis()

      // Assert
      expect(result.added).toBe(0)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(mockRedis.zadd).not.toHaveBeenCalled()
    })

    it('部分账号缺失，自动添加到 Redis', async () => {
      // Arrange
      const account1 = makeAccount('account-1')
      const account2 = makeAccount('account-2')
      mockFindAccounts(useEntityManagerMock, [account1, account2])

      // Mock Redis 只有 account1，account2 缺失
      vi.mocked(mockRedis.zscore)
        .mockResolvedValueOnce('10000') // account1 存在
        .mockResolvedValueOnce(null) // account2 缺失

      // Act
      const result = await service.syncAccountsToRedis()

      // Assert
      expect(result.added).toBe(1)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(mockRedis.zadd).toHaveBeenCalledWith('weibo:account:health', 10000, 'account-2')
    })

    it('只同步 ACTIVE 状态的账号', async () => {
      // Arrange
      const activeAccount = makeAccount('account-1')
      const _inactiveAccount = makeAccount('account-2', { status: WeiboAccountStatus.INACTIVE })

      // 数据库查询只返回 ACTIVE 账号（因为服务中使用了 WHERE 过滤）
      mockFindAccounts(useEntityManagerMock, [activeAccount])

      // Mock Redis 都有记录
      vi.mocked(mockRedis.zscore).mockResolvedValueOnce('10000')

      // Act
      const result = await service.syncAccountsToRedis()

      // Assert
      expect(result.added).toBe(0)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(0)
      // 只检查了 ACTIVE 账号
      expect(mockRedis.zscore).toHaveBeenCalledTimes(1)
      expect(mockRedis.zscore).toHaveBeenCalledWith('weibo:account:health', 'account-1')
    })

    it('Redis 中有已删除的账号，自动清理', async () => {
      // Arrange
      const account1 = makeAccount('account-1')
      mockFindAccounts(useEntityManagerMock, [account1])

      // Mock Redis 中有一个已删除的账号
      vi.mocked(mockRedis.zscore).mockResolvedValueOnce('10000')
      vi.mocked(mockRedis.zrange).mockResolvedValueOnce(['account-1', 'deleted-account'])

      // Act
      const result = await service.syncAccountsToRedis()

      // Assert
      expect(result.added).toBe(0)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(mockRedis.zrem).toHaveBeenCalledWith('weibo:account:health', 'deleted-account')
    })
  })

  describe('健康分数修复', () => {
    it('发现分数为 0 的账号，自动重置为 10000', async () => {
      // Arrange
      const account1 = makeAccount('account-1')
      mockFindAccounts(useEntityManagerMock, [account1])

      // Mock Redis 分数为 0
      vi.mocked(mockRedis.zscore).mockResolvedValueOnce('0')

      // Act
      const result = await service.syncAccountsToRedis()

      // Assert
      expect(result.added).toBe(0)
      expect(result.updated).toBe(1)
      expect(result.errors).toHaveLength(0)
      expect(mockRedis.zadd).toHaveBeenCalledWith('weibo:account:health', 10000, 'account-1')
    })

    it('发现负分数的账号，自动重置为 10000', async () => {
      // Arrange
      const account1 = makeAccount('account-1')
      mockFindAccounts(useEntityManagerMock, [account1])

      // Mock Redis 分数为负数
      vi.mocked(mockRedis.zscore).mockResolvedValueOnce('-10')

      // Act
      const result = await service.syncAccountsToRedis()

      // Assert
      expect(result.added).toBe(0)
      expect(result.updated).toBe(1)
      expect(result.errors).toHaveLength(0)
      expect(mockRedis.zadd).toHaveBeenCalledWith('weibo:account:health', 10000, 'account-1')
    })

    it('正常分数的账号不需要更新', async () => {
      // Arrange
      const account1 = makeAccount('account-1')
      mockFindAccounts(useEntityManagerMock, [account1])

      // Mock Redis 分数正常
      vi.mocked(mockRedis.zscore).mockResolvedValueOnce('5000')

      // Act
      const result = await service.syncAccountsToRedis()

      // Assert
      expect(result.added).toBe(0)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(mockRedis.zadd).not.toHaveBeenCalled()
    })
  })

  describe('错误处理', () => {
    it('数据库查询失败时记录错误', async () => {
      // Arrange
      useEntityManagerMock.mockRejectedValueOnce(new Error('数据库连接失败'))

      // Act
      const result = await service.syncAccountsToRedis()

      // Assert
      expect(result.added).toBe(0)
      expect(result.updated).toBe(0)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('数据库连接失败')
    })

    it('部分账号处理失败时继续处理其他账号', async () => {
      // Arrange
      const account1 = makeAccount('account-1')
      const account2 = makeAccount('account-2')
      mockFindAccounts(useEntityManagerMock, [account1, account2])

      // account1 正常，account2 抛出错误
      vi.mocked(mockRedis.zscore)
        .mockResolvedValueOnce('10000')
        .mockRejectedValueOnce(new Error('Redis 错误'))

      // Act
      const result = await service.syncAccountsToRedis()

      // Assert
      expect(result.added).toBe(0)
      expect(result.updated).toBe(0)
      expect(result.errors.length).toBe(1)
      expect(result.errors[0]).toContain('account-2')
      expect(result.errors[0]).toContain('Redis 错误')
    })

    it('空账号列表时正常返回', async () => {
      // Arrange
      mockFindAccounts(useEntityManagerMock, [])

      // Act
      const result = await service.syncAccountsToRedis()

      // Assert
      expect(result.added).toBe(0)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('日志记录', () => {
    it('应记录同步结果日志', async () => {
      // Arrange
      const loggerInfoSpy = vi.spyOn(logger, 'info')

      const account1 = makeAccount('account-1')
      mockFindAccounts(useEntityManagerMock, [account1])

      vi.mocked(mockRedis.zscore).mockResolvedValueOnce(null)

      // Act
      await service.syncAccountsToRedis()

      // Assert
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        '[WeiboAccountSyncService] 账号同步完成',
        expect.objectContaining({
          added: expect.any(Number),
          updated: expect.any(Number),
          errors: expect.any(Number),
        })
      )

      loggerInfoSpy.mockRestore()
    })
  })
})
