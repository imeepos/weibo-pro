/**
 * 代理验证器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyValidator, DEFAULT_VALIDATOR_CONFIG } from '../../core/proxy-validator'
import { createMockLogger } from '../../__mocks__/logger.mock'
import type { ProxyInfo } from '../../types'
import axios from 'axios'

vi.mock('axios')

describe('ProxyValidator', () => {
  let validator: ProxyValidator
  let mockLogger: ReturnType<typeof createMockLogger>

  beforeEach(() => {
    mockLogger = createMockLogger()
    validator = new ProxyValidator(undefined, mockLogger as any)
    vi.clearAllMocks()
  })

  describe('validateProxy', () => {
    it('should return valid result for successful validation', async () => {
      const proxy: ProxyInfo = {
        url: 'http://username:password@192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(axios.get).mockResolvedValueOnce({ data: { ip: '192.168.1.1' } })

      const result = await validator.validateProxy(proxy)

      expect(result.valid).toBe(true)
      expect(result.proxyUrl).toBe(proxy.url)
      // Mock 响应可能没有延迟，所以测试 >= 0
      expect(result.latency).toBeGreaterThanOrEqual(0)
      expect(result.error).toBeNull()
    })

    it('should call axios with correct proxy config', async () => {
      const proxy: ProxyInfo = {
        url: 'http://user:pass@192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(axios.get).mockResolvedValueOnce({ data: {} })

      await validator.validateProxy(proxy)

      expect(axios.get).toHaveBeenCalledWith(
        DEFAULT_VALIDATOR_CONFIG.testUrl,
        expect.objectContaining({
          proxy: {
            protocol: 'http',
            host: '192.168.1.1',
            port: 8080,
            auth: {
              username: 'user',
              password: 'pass',
            },
          },
          timeout: DEFAULT_VALIDATOR_CONFIG.timeout,
        })
      )
    })

    it('should return invalid result on connection error', async () => {
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      const error = new Error('ECONNREFUSED')
      vi.mocked(axios.get).mockRejectedValueOnce(error)

      const result = await validator.validateProxy(proxy)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('ECONNREFUSED')
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should return invalid result on timeout', async () => {
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      const error = new Error('ETIMEDOUT')
      vi.mocked(axios.get).mockRejectedValueOnce(error)

      const result = await validator.validateProxy(proxy)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('ETIMEDOUT')
    })

    it('should handle proxy without auth', async () => {
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(axios.get).mockResolvedValueOnce({ data: {} })

      await validator.validateProxy(proxy)

      expect(axios.get).toHaveBeenCalledWith(
        DEFAULT_VALIDATOR_CONFIG.testUrl,
        expect.objectContaining({
          proxy: {
            protocol: 'http',
            host: '192.168.1.1',
            port: 8080,
            auth: undefined,
          },
        })
      )
    })

    it('should use custom config when provided', async () => {
      const customConfig = {
        testUrl: 'https://custom.test/ip',
        timeout: 10000,
      }

      const customValidator = new ProxyValidator(customConfig, mockLogger as any)

      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(axios.get).mockResolvedValueOnce({ data: {} })

      await customValidator.validateProxy(proxy)

      expect(axios.get).toHaveBeenCalledWith(
        customConfig.testUrl,
        expect.objectContaining({
          timeout: customConfig.timeout,
        })
      )
    })

    it('should measure latency accurately', async () => {
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(axios.get).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: {} }), 100)
          })
      )

      const result = await validator.validateProxy(proxy)

      expect(result.latency).toBeGreaterThanOrEqual(100)
    })

    it('should handle invalid proxy URL', async () => {
      const proxy: ProxyInfo = {
        url: 'invalid-url',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      // Validator catches parse errors and returns invalid result
      const result = await validator.validateProxy(proxy)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('无法解析代理URL')
    })

    it('should handle HTTPS proxy', async () => {
      const proxy: ProxyInfo = {
        url: 'https://192.168.1.1:8443',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(axios.get).mockResolvedValueOnce({ data: {} })

      await validator.validateProxy(proxy)

      expect(axios.get).toHaveBeenCalledWith(
        DEFAULT_VALIDATOR_CONFIG.testUrl,
        expect.objectContaining({
          proxy: expect.objectContaining({
            protocol: 'https',
            port: 8443,
          }),
        })
      )
    })
  })

  describe('validateProxies', () => {
    it('should validate multiple proxies concurrently', async () => {
      const proxies: ProxyInfo[] = Array.from({ length: 5 }, (_, i) => ({
        url: `http://192.168.1.${i}:8080`,
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }))

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
        {
          url: 'http://192.168.1.1:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test',
          createdAt: Date.now(),
        },
        {
          url: 'http://192.168.1.2:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test',
          createdAt: Date.now(),
        },
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
        {
          url: 'http://192.168.1.1:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test',
          createdAt: Date.now(),
        },
        {
          url: 'http://192.168.1.2:8080',
          expiresAt: Date.now() + 60000,
          provider: 'test',
          createdAt: Date.now(),
        },
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
      const proxies: ProxyInfo[] = Array.from({ length: 3 }, (_, i) => ({
        url: `http://192.168.1.${i}:8080`,
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }))

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

  describe('Edge Cases', () => {
    it('should handle special characters in auth', async () => {
      const proxy: ProxyInfo = {
        url: 'http://user%40name:pass%23word@192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(axios.get).mockResolvedValueOnce({ data: {} })

      await validator.validateProxy(proxy)

      expect(axios.get).toHaveBeenCalledWith(
        DEFAULT_VALIDATOR_CONFIG.testUrl,
        expect.objectContaining({
          proxy: expect.objectContaining({
            auth: {
              username: 'user@name',
              password: 'pass#word',
            },
          }),
        })
      )
    })

    it('should handle very high latency', async () => {
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      vi.mocked(axios.get).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: {} }), 4000)
          })
      )

      const result = await validator.validateProxy(proxy)

      expect(result.valid).toBe(true)
      expect(result.latency).toBeGreaterThanOrEqual(4000)
    })

    it('should handle axios response error', async () => {
      const proxy: ProxyInfo = {
        url: 'http://192.168.1.1:8080',
        expiresAt: Date.now() + 60000,
        provider: 'test',
        createdAt: Date.now(),
      }

      const axiosError = {
        message: 'Request failed with status code 500',
        isAxiosError: true,
        response: {
          status: 500,
        },
      }

      vi.mocked(axios.get).mockRejectedValueOnce(axiosError)

      const result = await validator.validateProxy(proxy)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Request failed with status code 500')
    })
  })
})
