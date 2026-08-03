/**
 * 代理测试通用 fixtures
 */

import type { ProxyInfo } from '../../types'

export const PROXY_URL = 'http://192.168.1.1:8080'

export function createMockProxy(
  url: string = PROXY_URL,
  overrides: Partial<ProxyInfo> = {}
): ProxyInfo {
  return {
    url,
    expiresAt: Date.now() + 60000,
    provider: 'test',
    createdAt: Date.now(),
    ...overrides,
  }
}

export function createMockProxies(count: number): ProxyInfo[] {
  return Array.from({ length: count }, (_, i) =>
    createMockProxy(`http://192.168.1.${i}:8080`)
  )
}
