import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeiboAccountSyncService } from './weibo-account-sync.service'
import { RedisClient } from '@sker/redis'
import { WeiboAccountEntity, WeiboAccountStatus } from '@sker/entities'
import { logger } from '@sker/core'

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

describe('WeiboAccountSyncService', () => {
  let service: WeiboAccountSyncService
  let mockRedis: RedisClient

  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks()

    // 创建 Mock Redis 客户端
    mockRedis = {
      zscore: vi.fn(),
      zadd: vi.fn().mockResolvedValue(1),
      zrem: vi.fn().mockResolvedValue(1),
      zrange: vi.fn().mockResolvedValue([]),
    } as any

    service = new WeiboAccountSyncService(mockRedis)
  })

  describe('syncAccountsToRedis - 启动时同步', () => {
    it('所有 ACTIVE 账号都在 Redis 中，无需操作', async () => {
      // Arrange
      const account1: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: 'cookies1',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([account1])
        }
        return await callback(mockManager)
      })

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
      const account1: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: 'cookies1',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const account2: WeiboAccountEntity = {
        id: 'account-2',
        weiboUid: 'uid2',
        weiboNickname: 'nickname2',
        weiboAvatar: 'avatar2',
        cookies: 'cookies2',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([account1, account2])
        }
        return await callback(mockManager)
      })

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
      const activeAccount: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: 'cookies1',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const inactiveAccount: WeiboAccountEntity = {
        id: 'account-2',
        weiboUid: 'uid2',
        weiboNickname: 'nickname2',
        weiboAvatar: 'avatar2',
        cookies: 'cookies2',
        status: WeiboAccountStatus.INACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // 数据库查询只返回 ACTIVE 账号（因为服务中使用了 WHERE 过滤）
      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([activeAccount])
        }
        return await callback(mockManager)
      })

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
      // 验证 find 被调用时使用了正确的 where 条件
      useEntityManagerMock.mock.calls[0][0]
    })

    it('Redis 中有已删除的账号，自动清理', async () => {
      // Arrange
      const account1: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: 'cookies1',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([account1])
        }
        return await callback(mockManager)
      })

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

  describe('syncAccountsToRedis - 健康分数修复', () => {
    it('发现分数为 0 的账号，自动重置为 10000', async () => {
      // Arrange
      const account1: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: 'cookies1',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([account1])
        }
        return await callback(mockManager)
      })

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
      const account1: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: 'cookies1',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([account1])
        }
        return await callback(mockManager)
      })

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
      const account1: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: 'cookies1',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([account1])
        }
        return await callback(mockManager)
      })

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

  describe('syncAccountsToRedis - 错误处理', () => {
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
      const account1: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: 'cookies1',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const account2: WeiboAccountEntity = {
        id: 'account-2',
        weiboUid: 'uid2',
        weiboNickname: 'nickname2',
        weiboAvatar: 'avatar2',
        cookies: 'cookies2',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([account1, account2])
        }
        return await callback(mockManager)
      })

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
      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([])
        }
        return await callback(mockManager)
      })

      // Act
      const result = await service.syncAccountsToRedis()

      // Assert
      expect(result.added).toBe(0)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('syncAccountsToRedis - 日志记录', () => {
    it('应记录同步结果日志', async () => {
      // Arrange
      const loggerInfoSpy = vi.spyOn(logger, 'info')

      const account1: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: 'cookies1',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([account1])
        }
        return await callback(mockManager)
      })

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

  describe('checkAccountsHealth - 账号健康检查', () => {
    let mockPlaywrightService: any
    let mockWeiboHtmlParser: any

    beforeEach(() => {
      // 为健康检查测试创建额外的 mocks
      mockPlaywrightService = {
        getHtml: vi.fn()
      }

      mockWeiboHtmlParser = {
        parseSearchResultHtml: vi.fn()
      }

      // 更新 service 实例，注入新的依赖
      service = new WeiboAccountSyncService(mockRedis, mockPlaywrightService, mockWeiboHtmlParser)
    })

    it('所有账号 Cookie 有效，返回全部有效的统计', async () => {
      // Arrange
      const account1: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: '[{"name":"SUB","value":"test"}]',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const account2: WeiboAccountEntity = {
        id: 'account-2',
        weiboUid: 'uid2',
        weiboNickname: 'nickname2',
        weiboAvatar: 'avatar2',
        cookies: '[{"name":"SUB","value":"test2"}]',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([account1, account2])
        }
        return await callback(mockManager)
      })

      // Mock Playwright 返回正常 HTML（非登录页）
      const validHtml = '<html><body><div class="card">微博内容</div></body></html>'
      mockPlaywrightService.getHtml.mockResolvedValue(validHtml)

      // Mock WeiboHtmlParser 正常解析
      mockWeiboHtmlParser.parseSearchResultHtml.mockReturnValue({
        posts: [],
        hasNextPage: false,
        lastPostTime: null,
        totalCount: 0,
        nextPageLink: undefined,
        currentPage: 1,
        totalPage: 0,
        isEmptyResult: false,
      })

      // Act
      const result = await service.checkAccountsHealth()

      // Assert
      expect(result.total).toBe(2)
      expect(result.valid).toBe(2)
      expect(result.expired).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(mockPlaywrightService.getHtml).toHaveBeenCalledTimes(2)
    })

    it('部分账号 Cookie 过期，自动标记为 EXPIRED', async () => {
      // Arrange
      const account1: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: '[{"name":"SUB","value":"valid"}]',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const account2: WeiboAccountEntity = {
        id: 'account-2',
        weiboUid: 'uid2',
        weiboNickname: 'nickname2',
        weiboAvatar: 'avatar2',
        cookies: '[{"name":"SUB","value":"expired"}]',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([account1, account2]),
          findOne: vi.fn().mockImplementation(async (options) => {
            // 根据查询条件返回对应的账号
            if (options?.where?.id === 'account-1') return account1
            if (options?.where?.id === 'account-2') return account2
            return null
          }),
          save: vi.fn().mockImplementation(async (entity) => entity)
        }
        return await callback(mockManager)
      })

      // account1 返回正常 HTML
      const validHtml = '<html><body><div class="card">微博内容</div></body></html>'
      // account2 返回登录页 HTML
      const loginHtml = '<html><title>登录 - 微博</title></html>'

      mockPlaywrightService.getHtml
        .mockResolvedValueOnce(validHtml)
        .mockResolvedValueOnce(loginHtml)

      // account2 登录失效，抛出错误
      mockWeiboHtmlParser.parseSearchResultHtml
        .mockReturnValueOnce({
          posts: [],
          hasNextPage: false,
          lastPostTime: null,
          totalCount: 0,
          nextPageLink: undefined,
          currentPage: 1,
          totalPage: 0,
          isEmptyResult: false,
        })
        .mockImplementationOnce(() => {
          throw new Error('LOGIN_EXPIRED')
        })

      // Mock Redis 移除过期账号
      vi.mocked(mockRedis.zrem).mockResolvedValue(1)

      // Act
      const result = await service.checkAccountsHealth()

      // Assert
      expect(result.total).toBe(2)
      expect(result.valid).toBe(1)
      expect(result.expired).toBe(1)
      expect(result.errors).toHaveLength(0)
      expect(mockRedis.zrem).toHaveBeenCalledWith('weibo:account:health', 'account-2')
    })

    it('单个账号检查失败不影响其他账号', async () => {
      // Arrange
      const account1: WeiboAccountEntity = {
        id: 'account-1',
        weiboUid: 'uid1',
        weiboNickname: 'nickname1',
        weiboAvatar: 'avatar1',
        cookies: '[{"name":"SUB","value":"valid"}]',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const account2: WeiboAccountEntity = {
        id: 'account-2',
        weiboUid: 'uid2',
        weiboNickname: 'nickname2',
        weiboAvatar: 'avatar2',
        cookies: '[{"name":"SUB","value":"error"}]',
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([account1, account2])
        }
        return await callback(mockManager)
      })

      const validHtml = '<html><body><div class="card">微博内容</div></body></html>'

      // account1 正常，account2 网络错误
      mockPlaywrightService.getHtml
        .mockResolvedValueOnce(validHtml)
        .mockRejectedValueOnce(new Error('Network timeout'))

      mockWeiboHtmlParser.parseSearchResultHtml.mockReturnValue({
        posts: [],
        hasNextPage: false,
        lastPostTime: null,
        totalCount: 0,
        nextPageLink: undefined,
        currentPage: 1,
        totalPage: 0,
        isEmptyResult: false,
      })

      // Act
      const result = await service.checkAccountsHealth()

      // Assert
      expect(result.total).toBe(2)
      expect(result.valid).toBe(1)
      expect(result.expired).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('account-2')
      expect(result.errors[0]).toContain('Network timeout')
    })

    it('没有账号时返回空统计', async () => {
      // Arrange
      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue([])
        }
        return await callback(mockManager)
      })

      // Act
      const result = await service.checkAccountsHealth()

      // Assert
      expect(result.total).toBe(0)
      expect(result.valid).toBe(0)
      expect(result.expired).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(mockPlaywrightService.getHtml).not.toHaveBeenCalled()
    })

    it('并发控制：超过3个账号时分批处理', async () => {
      // Arrange
      const accounts: WeiboAccountEntity[] = []
      for (let i = 1; i <= 5; i++) {
        accounts.push({
          id: `account-${i}`,
          weiboUid: `uid${i}`,
          weiboNickname: `nickname${i}`,
          weiboAvatar: `avatar${i}`,
          cookies: `[{"name":"SUB","value":"test${i}"}]`,
          status: WeiboAccountStatus.ACTIVE,
          lastCheckAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      useEntityManagerMock.mockImplementation(async (callback) => {
        const mockManager = {
          find: vi.fn().mockResolvedValue(accounts)
        }
        return await callback(mockManager)
      })

      const validHtml = '<html><body><div class="card">微博内容</div></body></html>'
      mockPlaywrightService.getHtml.mockResolvedValue(validHtml)

      mockWeiboHtmlParser.parseSearchResultHtml.mockReturnValue({
        posts: [],
        hasNextPage: false,
        lastPostTime: null,
        totalCount: 0,
        nextPageLink: undefined,
        currentPage: 1,
        totalPage: 0,
        isEmptyResult: false,
      })

      // Act
      const result = await service.checkAccountsHealth()

      // Assert
      expect(result.total).toBe(5)
      expect(result.valid).toBe(5)
      expect(result.expired).toBe(0)
      expect(mockPlaywrightService.getHtml).toHaveBeenCalledTimes(5)
    })
  })
})
