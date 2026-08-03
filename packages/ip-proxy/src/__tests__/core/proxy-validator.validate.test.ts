/**
 * 代理验证器测试 - validateProxy
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyValidator, DEFAULT_VALIDATOR_CONFIG } from '../../core/proxy-validator'
import { createMockLogger } from '../../__mocks__/logger.mock'
import axios from 'axios'
import { createMockProxy } from './proxy.fixtures'

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
      const proxy = createMockProxy('http://username:password@192.168.1.1:8080')

      vi.mocked(axios.get).mockResolvedValueOnce({ data: { ip: '192.168.1.1' } })

      const result = await validator.validateProxy(proxy)

      expect(result.valid).toBe(true)
      expect(result.proxyUrl).toBe(proxy.url)
      // Mock 响应可能没有延迟，所以测试 >= 0
      expect(result.latency).toBeGreaterThanOrEqual(0)
      expect(result.error).toBeNull()
    })

    it('should call axios with correct proxy config', async () => {
      const proxy = createMockProxy('http://user:pass@192.168.1.1:8080')

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
      const proxy = createMockProxy()

      const error = new Error('ECONNREFUSED')
      vi.mocked(axios.get).mockRejectedValueOnce(error)

      const result = await validator.validateProxy(proxy)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('ECONNREFUSED')
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should return invalid result on timeout', async () => {
      const proxy = createMockProxy()

      const error = new Error('ETIMEDOUT')
      vi.mocked(axios.get).mockRejectedValueOnce(error)

      const result = await validator.validateProxy(proxy)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('ETIMEDOUT')
    })

    it('should handle proxy without auth', async () => {
      const proxy = createMockProxy()

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

      const proxy = createMockProxy()

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
      const proxy = createMockProxy()

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
      const proxy = createMockProxy('invalid-url')

      // Validator catches parse errors and returns invalid result
      const result = await validator.validateProxy(proxy)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('无法解析代理URL')
    })

    it('should handle HTTPS proxy', async () => {
      const proxy = createMockProxy('https://192.168.1.1:8443')

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
})
