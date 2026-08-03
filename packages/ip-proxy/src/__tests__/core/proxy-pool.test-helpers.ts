/**
 * ProxyPool 测试辅助工具
 *
 * 提供共享的 mock 数据与测试上下文工厂，供各 ProxyPool 测试文件复用，
 * 避免在每个测试文件中重复创建相同的 mock 与 pool 实例。
 */

import { vi } from 'vitest'
import { ProxyPool } from '../../core/proxy-pool'
import { ProxyCache } from '../../core/proxy-cache'
import { ProxyValidator } from '../../core/proxy-validator'
import { createMockLogger } from '../../__mocks__/logger.mock'
import type { ProxyProvider, RawProxyData } from '../../types'

/**
 * 生成原始代理数据
 */
export const createRawProxy = (index: number): RawProxyData => ({
  ip: `192.168.1.${index}`,
  port: 8080,
  protocol: 'http',
  username: 'user',
  password: 'pass',
  expireTime: 60, // 60 seconds
})

/**
 * 创建 ProxyPool 测试上下文
 *
 * 每次调用返回全新的 mocks 与 pool 实例，行为与原测试 beforeEach 完全一致：
 * 1. 创建 cache / provider / validator / logger 的 mock
 * 2. 用这些 mock 构造 ProxyPool
 * 3. 清空 mock 调用记录（保留默认实现）
 */
export function createPoolTestContext() {
  const mockCache: any = {
    addProxy: vi.fn(),
    getLeastUsedProxy: vi.fn(),
    incrementUseCount: vi.fn(),
    decrementUseCount: vi.fn(),
    removeProxy: vi.fn(),
    getAllProxies: vi.fn().mockResolvedValue([]),
  }

  const mockProvider: ProxyProvider = {
    name: 'test-provider',
    fetchProxy: vi.fn(),
    fetchProxies: vi.fn(),
  }

  const mockValidator: any = {
    validateProxy: vi.fn(),
    validateProxies: vi.fn(),
  }

  const mockLogger = createMockLogger()

  const pool = new ProxyPool(
    mockCache as ProxyCache,
    mockProvider,
    mockValidator as ProxyValidator,
    mockLogger as any
  )

  vi.clearAllMocks()

  return {
    pool,
    mockCache,
    mockProvider,
    mockValidator,
    mockLogger,
  }
}
