import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeiboAccountSyncService } from './weibo-account-sync.service'
import { RedisClient } from '@sker/redis'
import {
  makeAccount,
  makeAccounts,
  createMockRedis,
  mockFindAccounts,
  validHtml,
  loginHtml,
  emptyParseResult,
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

describe('WeiboAccountSyncService - checkAccountsHealth', () => {
  let service: WeiboAccountSyncService
  let mockRedis: RedisClient
  let mockPlaywrightService: any
  let mockWeiboHtmlParser: any

  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks()

    mockRedis = createMockRedis()

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
    const account1 = makeAccount('account-1', { cookies: '[{"name":"SUB","value":"test"}]' })
    const account2 = makeAccount('account-2', { cookies: '[{"name":"SUB","value":"test2"}]' })
    mockFindAccounts(useEntityManagerMock, [account1, account2])

    // Mock Playwright 返回正常 HTML（非登录页）
    mockPlaywrightService.getHtml.mockResolvedValue(validHtml)

    // Mock WeiboHtmlParser 正常解析
    mockWeiboHtmlParser.parseSearchResultHtml.mockReturnValue(emptyParseResult)

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
    const account1 = makeAccount('account-1', { cookies: '[{"name":"SUB","value":"valid"}]' })
    const account2 = makeAccount('account-2', { cookies: '[{"name":"SUB","value":"expired"}]' })

    useEntityManagerMock.mockImplementation(async (callback: any) => {
      const mockManager = {
        find: vi.fn().mockResolvedValue([account1, account2]),
        findOne: vi.fn().mockImplementation(async (options: any) => {
          // 根据查询条件返回对应的账号
          if (options?.where?.id === 'account-1') return account1
          if (options?.where?.id === 'account-2') return account2
          return null
        }),
        save: vi.fn().mockImplementation(async (entity: any) => entity)
      }
      return await callback(mockManager)
    })

    // account1 返回正常 HTML
    // account2 返回登录页 HTML
    mockPlaywrightService.getHtml
      .mockResolvedValueOnce(validHtml)
      .mockResolvedValueOnce(loginHtml)

    // account2 登录失效，抛出错误
    mockWeiboHtmlParser.parseSearchResultHtml
      .mockReturnValueOnce(emptyParseResult)
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
    const account1 = makeAccount('account-1', { cookies: '[{"name":"SUB","value":"valid"}]' })
    const account2 = makeAccount('account-2', { cookies: '[{"name":"SUB","value":"error"}]' })
    mockFindAccounts(useEntityManagerMock, [account1, account2])

    // account1 正常，account2 网络错误
    mockPlaywrightService.getHtml
      .mockResolvedValueOnce(validHtml)
      .mockRejectedValueOnce(new Error('Network timeout'))

    mockWeiboHtmlParser.parseSearchResultHtml.mockReturnValue(emptyParseResult)

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
    mockFindAccounts(useEntityManagerMock, [])

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
    const accounts = makeAccounts(5, (n) => `[{"name":"SUB","value":"test${n}"}]`)
    mockFindAccounts(useEntityManagerMock, accounts)

    mockPlaywrightService.getHtml.mockResolvedValue(validHtml)
    mockWeiboHtmlParser.parseSearchResultHtml.mockReturnValue(emptyParseResult)

    // Act
    const result = await service.checkAccountsHealth()

    // Assert
    expect(result.total).toBe(5)
    expect(result.valid).toBe(5)
    expect(result.expired).toBe(0)
    expect(mockPlaywrightService.getHtml).toHaveBeenCalledTimes(5)
  })
})
