/**
 * 快代理提供商测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KuaidailiProvider } from '../../providers/kuaidaili-provider'
import { createMockLogger } from '../../__mocks__/logger.mock'
import { ProxyFetchError } from '../../errors/proxy-errors'
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

  describe('fetchProxy', () => {
    it('should fetch single proxy', async () => {
      const apiResponse = {
        data: {
          code: 0,
          msg: 'success',
          data: {
            proxy_list: ['192.168.1.1:8080,120'],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      const result = await provider.fetchProxy()

      expect(result).toEqual({
        ip: '192.168.1.1',
        port: 8080,
        username: mockConfig.username,
        password: mockConfig.password,
        expireTime: 120,
        protocol: 'http',
      })
    })

    it('should call fetchProxies with count 1', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: ['192.168.1.1:8080,120'],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      await provider.fetchProxy()

      expect(mockAxiosCreate.get).toHaveBeenCalledWith(
        '/api/getdps',
        expect.objectContaining({
          params: expect.objectContaining({
            num: 1,
          }),
        })
      )
    })
  })

  describe('fetchProxies', () => {
    it('should fetch multiple proxies', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: [
              '192.168.1.1:8080,120',
              '192.168.1.2:8080,150',
              '192.168.1.3:8080,180',
            ],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      const results = await provider.fetchProxies(3)

      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({
        ip: '192.168.1.1',
        port: 8080,
        username: mockConfig.username,
        password: mockConfig.password,
        expireTime: 120,
        protocol: 'http',
      })
    })

    it('should call API with correct parameters', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: ['192.168.1.1:8080,120'],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      await provider.fetchProxies(5)

      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/api/getdps', {
        params: {
          secret_id: mockConfig.secretId,
          signature: mockConfig.secretKey,
          num: 5,
          pt: 1,
          format: 'json',
          sep: 1,
          f_et: 1,
        },
      })
    })

    it('should throw error when API returns error code', async () => {
      const apiResponse = {
        data: {
          code: 10001,
          msg: 'Invalid secret_id',
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      await expect(provider.fetchProxies(1)).rejects.toThrow(ProxyFetchError)
      await expect(provider.fetchProxies(1)).rejects.toThrow(
        'Invalid secret_id'
      )
    })

    it('should throw error when proxy list is empty', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: [],
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      await expect(provider.fetchProxies(1)).rejects.toThrow(ProxyFetchError)
      await expect(provider.fetchProxies(1)).rejects.toThrow('快代理返回空列表')
    })

    it('should throw error when proxy list is null', async () => {
      const apiResponse = {
        data: {
          code: 0,
          data: {
            proxy_list: null,
          },
        },
      }

      mockAxiosCreate.get.mockResolvedValueOnce(apiResponse)

      await expect(provider.fetchProxies(1)).rejects.toThrow(ProxyFetchError)
    })

    it('should handle network error', async () => {
      mockAxiosCreate.get.mockRejectedValueOnce(new Error('Network error'))

      await expect(provider.fetchProxies(1)).rejects.toThrow(ProxyFetchError)
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should rethrow ProxyFetchError without wrapping', async () => {
      const error = new ProxyFetchError('Test error', 'kuaidaili')
      mockAxiosCreate.get.mockRejectedValueOnce(error)

      await expect(provider.fetchProxies(1)).rejects.toThrow(error)
    })
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
