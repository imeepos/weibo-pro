/**
 * 代理验证器测试 - 边界情况
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

  describe('Edge Cases', () => {
    it('should handle special characters in auth', async () => {
      const proxy = createMockProxy('http://user%40name:pass%23word@192.168.1.1:8080')

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
      const proxy = createMockProxy()

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
      const proxy = createMockProxy()

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
