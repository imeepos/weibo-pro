import { vi } from 'vitest'
import { WeiboAccountEntity, WeiboAccountStatus } from '@sker/entities'

/**
 * 构造一个 WeiboAccountEntity 测试夹具。
 * 默认根据 id 后缀派生 weiboUid / weiboNickname / weiboAvatar / cookies，
 * 可用 overrides 覆盖任意字段。
 */
export function makeAccount(id = 'account-1', overrides: Partial<WeiboAccountEntity> = {}): WeiboAccountEntity {
  const suffix = id.split('-').pop() ?? '1'
  return {
    id,
    weiboUid: `uid${suffix}`,
    weiboNickname: `nickname${suffix}`,
    weiboAvatar: `avatar${suffix}`,
    cookies: `cookies${suffix}`,
    status: WeiboAccountStatus.ACTIVE,
    lastCheckAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/** 批量构造 count 个账号（account-1 ~ account-N） */
export function makeAccounts(
  count: number,
  cookieFor: (n: number) => string = (n) => `cookies${n}`
): WeiboAccountEntity[] {
  return Array.from({ length: count }, (_, i) => makeAccount(`account-${i + 1}`, { cookies: cookieFor(i + 1) }))
}

/** 创建 Mock Redis 客户端 */
export function createMockRedis() {
  return {
    zscore: vi.fn(),
    zadd: vi.fn().mockResolvedValue(1),
    zrem: vi.fn().mockResolvedValue(1),
    zrange: vi.fn().mockResolvedValue([]),
  } as any
}

/**
 * 让 useEntityManagerMock 返回只包含 find 的 mock manager，
 * find 解析为给定的账号列表。
 */
export function mockFindAccounts(useEntityManagerMock: any, accounts: WeiboAccountEntity[] = []) {
  useEntityManagerMock.mockImplementation(async (callback: (manager: any) => Promise<unknown>) => {
    const mockManager = {
      find: vi.fn().mockResolvedValue(accounts)
    }
    return await callback(mockManager)
  })
}

/** 有效微博首页 HTML（非登录页） */
export const validHtml = '<html><body><div class="card">微博内容</div></body></html>'

/** 登录页 HTML（Cookie 失效） */
export const loginHtml = '<html><title>登录 - 微博</title></html>'

/** 空的搜索结果解析结果 */
export const emptyParseResult = {
  posts: [],
  hasNextPage: false,
  lastPostTime: null,
  totalCount: 0,
  nextPageLink: undefined,
  currentPage: 1,
  totalPage: 0,
  isEmptyResult: false,
}
