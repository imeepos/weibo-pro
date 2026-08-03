/**
 * 快代理提供商测试 - parseProxyString
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

  describe('parseProxyString', () => {
    it('should parse valid proxy string', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: ['192.168.1.1:8080,120'],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      const results = await provider.fetchProxies(1)

      expect(results[0]).toEqual({
        ip: '192.168.1.1',
        port: 8080,
        username: mockConfig.username,
        password: mockConfig.password,
        expireTime: 120,
        protocol: 'http',
      })
    })

    it('should handle different port numbers', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: ['192.168.1.1:9999,120'],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      const results = await provider.fetchProxies(1)

      expect(results[0]?.port).toBe(9999)
    })

    it('should throw error for invalid proxy string format', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: ['invalid-format'],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      await expect(provider.fetchProxies(1)).rejects.toThrow()
    })

    it('should throw error for invalid IP:PORT format', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: ['invalid-ip-port,120'],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      await expect(provider.fetchProxies(1)).rejects.toThrow()
    })

    it('should throw error for missing port', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: ['192.168.1.1:,120'],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      await expect(provider.fetchProxies(1)).rejects.toThrow()
    })

    it('should throw error for non-numeric port', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: ['192.168.1.1:abc,120'],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      await expect(provider.fetchProxies(1)).rejects.toThrow()
    })

    it('should parse expire time correctly', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: ['192.168.1.1:8080,300'],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      const results = await provider.fetchProxies(1)

      expect(results[0]?.expireTime).toBe(300)
    })
  })
})
