/**
 * 测试环境设置
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest'

// 全局 setup
beforeAll(() => {
  // 设置测试超时
  vi.setConfig({ testTimeout: 10000 })
})

// 每个测试后清理
afterEach(() => {
  vi.clearAllMocks()
})

// 全局 teardown
afterAll(() => {
  vi.restoreAllMocks()
})
