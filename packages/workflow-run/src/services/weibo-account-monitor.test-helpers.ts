import { vi } from 'vitest'
import { WeiboAccountEntity, WeiboAccountStatus } from '@sker/entities'
import type { AccountMetrics, HourlySnapshot } from './weibo-account-monitor.service'

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

/** 批量构造 count 个账号（account-1 ~ account-N），默认 ACTIVE */
export function makeAccounts(count: number): WeiboAccountEntity[] {
  return Array.from({ length: count }, (_, i) => makeAccount(`account-${i + 1}`))
}

/** 创建 Mock Redis 客户端（覆盖监控服务使用的全部方法） */
export function createMockRedis() {
  return {
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
}

/**
 * 让 useEntityManagerMock 返回只包含 find/count 的 mock manager，
 * find 解析为给定的账号列表。
 */
export function mockFindAccounts(useEntityManagerMock: any, accounts: WeiboAccountEntity[] = []) {
  useEntityManagerMock.mockImplementation(async (callback: (manager: any) => Promise<unknown>) => {
    const mockManager = {
      find: vi.fn().mockResolvedValue(accounts),
      count: vi.fn().mockResolvedValue(accounts.length),
    }
    return await callback(mockManager)
  })
}

/** 构造一个 HourlySnapshot 测试夹具 */
export function makeSnapshot(overrides: Partial<HourlySnapshot> = {}): HourlySnapshot {
  return {
    timestamp: new Date('2024-01-01T10:00:00.000Z'),
    total: 10,
    active: 8,
    expired: 2,
    available: 8,
    availabilityRate: 80,
    ...overrides,
  }
}

/** 构造一个 AccountMetrics 测试夹具（默认全部正常） */
export function makeMetrics(overrides: Partial<AccountMetrics> = {}): AccountMetrics {
  return {
    total: 10,
    active: 10,
    expired: 0,
    available: 9,
    availabilityRate: 90,
    lastCheckTime: new Date(),
    trend: [],
    ...overrides,
  }
}
