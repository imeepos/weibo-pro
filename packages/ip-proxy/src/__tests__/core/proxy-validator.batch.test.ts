/**
 * 代理验证器测试 - validateProxies 批量验证
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyValidator } from '../../core/proxy-validator'
import { createMockLogger } from '../../__mocks__/logger.mock'
import type { ProxyInfo } from '../../types'
import axios from 'axios'
import { createMockProxy, createMockProxies } from './proxy.fixtures'

vi.mock('axios')

describe('ProxyValidator', () => {
  let validator: ProxyValidator
  let mockLogger: ReturnType<typeof createMockLogger>

  beforeEach(() => {
    mockLogger = createMockLogger()
    validator = new ProxyValidator(undefined, mockLogger as any)
    vi.clearAllMocks()
  })

  describe('validateProxies', () => {
    it('should validate multiple proxies concurrently', async () => {
      const proxies: ProxyInfo[] = createMockProxies(5)

      vi.mocked(axios.get).mockResolvedValue({ data: {} })

      const results = await validator.validateProxies(proxies)

      expect(results).toHaveLength(5)
      expect(axios.get).toHaveBeenCalledTimes(5)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('开始批量验证 5 个代理')
      )
    })

    it('should return mix of valid and invalid results', async () => {
      const proxies: ProxyInfo[] = [
        createMockProxy('http://192.168.1.1:8080'),
        createMockProxy('http://192.168.1.2:8080'),
      ]

      vi.mocked(axios.get)
        .mockResolvedValueOnce({ data: {} })
        .mockRejectedValueOnce(new Error('Connection failed'))

      const results = await validator.validateProxies(proxies)

      expect(results[0]?.valid).toBe(true)
      expect(results[1]?.valid).toBe(false)
    })

    it('should log summary after batch validation', async () => {
      const proxies: ProxyInfo[] = [
        createMockProxy('http://192.168.1.1:8080'),
        createMockProxy('http://192.168.1.2:8080'),
      ]

      vi.mocked(axios.get)
        .mockResolvedValueOnce({ data: {} })
        .mockRejectedValueOnce(new Error('Failed'))

      await validator.validateProxies(proxies)

      const logCalls = mockLogger.info.mock.calls
      const summaryLog = logCalls.find((call) =>
        call[0]?.includes('批量验证完成')
      )

      expect(summaryLog).toBeDefined()
      expect(summaryLog?.[0]).toContain('1/2 有效')
    })

    it('should handle empty proxy list', async () => {
      const results = await validator.validateProxies([])

      expect(results).toEqual([])
    })

    it('should not stop on individual failures', async () => {
      const proxies: ProxyInfo[] = createMockProxies(3)

      vi.mocked(axios.get)
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockResolvedValueOnce({ data: {} })
        .mockRejectedValueOnce(new Error('Failed 2'))

      const results = await validator.validateProxies(proxies)

      expect(results).toHaveLength(3)
      expect(results[0]?.valid).toBe(false)
      expect(results[1]?.valid).toBe(true)
      expect(results[2]?.valid).toBe(false)
    })
  })
})
