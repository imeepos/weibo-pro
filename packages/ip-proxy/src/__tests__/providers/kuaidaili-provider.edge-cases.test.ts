/**
 * 快代理提供商测试 - 属性 / 边界情况
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KuaidailiProvider } from '../../providers/kuaidaili-provider'
import { createMockLogger } from '../../__mocks__/logger.mock'
import axios from 'axios'

vi.mock('axios')

describe('KuaidailiProvider', () => {
  let provider: KuaidailiProvider
  let mockLogger: ReturnType<typeof createMockLogger>
  let mockAxiosCreate: any

  const mockConfig = {
    secretId: 'test-secret-id',
    secretKey: 'test-secret-key',
    username: 'test-user',
    password: 'test-pass',
  }

  beforeEach(() => {
    mockLogger = createMockLogger()

    mockAxiosCreate = {
      get: vi.fn(),
    }

    vi.mocked(axios.create).mockReturnValue(mockAxiosCreate)

    provider = new KuaidailiProvider(mockConfig, mockLogger as any)

    vi.clearAllMocks()
  })

  describe('Provider Properties', () => {
    it('should have correct provider name', () => {
      expect(provider.name).toBe('kuaidaili')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty response data', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {},
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      await expect(provider.fetchProxies(1)).rejects.toThrow()
    })

    it('should handle malformed JSON response', async () => {
      mockAxiosCreate.get.mockResolvedValueOnce({
        data: 'not-json',
      })

      await expect(provider.fetchProxies(1)).rejects.toThrow()
    })

    it('should handle very large proxy count', async () => {
      const proxyList = Array.from(
        { length: 100 },
        (_, i) => `192.168.1.${i}:8080,120`
      )

      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: proxyList,
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      const results = await provider.fetchProxies(100)

      expect(results).toHaveLength(100)
    })

    it('should handle IPv6 addresses', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: ['[2001:db8::1]:8080,120'],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      // This might fail depending on how parseProxyString handles IPv6
      // Include this test to document expected behavior
      await expect(provider.fetchProxies(1)).rejects.toThrow()
    })
  })
})
