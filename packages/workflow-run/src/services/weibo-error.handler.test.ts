import { describe, it, expect, vi } from 'vitest'
import { WeiboErrorHandler, WeiboError, WeiboErrorType } from './weibo-error.handler'

describe('WeiboErrorHandler', () => {
  describe('checkResponse - error_code 特殊处理', () => {
    it('应该将 error_code=20170 视为正常业务场景（不抛出错误）', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://weibo.com/ajax/statuses/show',
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'content-type') return 'application/json'
            return null
          })
        },
        json: vi.fn().mockResolvedValue({
          ok: 0,
          message: '由于博主设置，目前内容暂不可见。',
          error_code: 20170
        })
      } as unknown as Response

      const data = await mockResponse.json()
      const error = await WeiboErrorHandler.checkResponse(mockResponse, data)

      // error_code=20170 是正常业务场景，不应返回错误
      expect(error).toBeNull()
    })

    it('应该将其他 error_code 视为 API 错误', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://weibo.com/ajax/statuses/show',
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'content-type') return 'application/json'
            return null
          })
        },
        json: vi.fn().mockResolvedValue({
          ok: 0,
          message: '参数错误',
          error_code: 10001
        })
      } as unknown as Response

      const data = await mockResponse.json()
      const error = await WeiboErrorHandler.checkResponse(mockResponse, data)

      // 其他 error_code 应该返回错误
      expect(error).not.toBeNull()
      expect(error?.type).toBe(WeiboErrorType.API_ERROR)
      expect(error?.message).toContain('API 返回错误: ok=0')
    })
  })

  describe('HTTP 418 反爬虫错误处理', () => {
    it('应该将 HTTP 418 错误识别为可重试', () => {
      const error = new WeiboError(
        WeiboErrorType.HTTP_ERROR,
        "HTTP 418: I'm a teapot",
        418
      )

      const shouldRetry = WeiboErrorHandler.shouldRetry(error)

      expect(shouldRetry).toBe(true)
    })

    it('应该将 HTTP 418 错误不转换为 NoRetryError（保持可重试）', () => {
      const error = new WeiboError(
        WeiboErrorType.HTTP_ERROR,
        "HTTP 418: I'm a teapot",
        418
      )

      const result = WeiboErrorHandler.toNoRetryErrorIfNeeded(error)

      // 418 是可重试的，不应转换为 NoRetryError
      expect(result).toBe(error)
      expect(result.name).toBe('WeiboError')
    })

    it('应该将其他 4xx 错误保持为不可重试', () => {
      const error400 = new WeiboError(WeiboErrorType.HTTP_ERROR, 'HTTP 400', 400)
      const error403 = new WeiboError(WeiboErrorType.HTTP_ERROR, 'HTTP 403', 403)
      const error404 = new WeiboError(WeiboErrorType.HTTP_ERROR, 'HTTP 404', 404)

      expect(WeiboErrorHandler.shouldRetry(error400)).toBe(false)
      expect(WeiboErrorHandler.shouldRetry(error403)).toBe(false)
      expect(WeiboErrorHandler.shouldRetry(error404)).toBe(false)
    })

    it('应该保持 5xx 错误可重试', () => {
      const error500 = new WeiboError(WeiboErrorType.HTTP_ERROR, 'HTTP 500', 500)
      const error502 = new WeiboError(WeiboErrorType.HTTP_ERROR, 'HTTP 502', 502)
      const error503 = new WeiboError(WeiboErrorType.HTTP_ERROR, 'HTTP 503', 503)

      expect(WeiboErrorHandler.shouldRetry(error500)).toBe(true)
      expect(WeiboErrorHandler.shouldRetry(error502)).toBe(true)
      expect(WeiboErrorHandler.shouldRetry(error503)).toBe(true)
    })
  })

  describe('checkResponse - HTTP 418 错误检测', () => {
    it('应该从 Response 中检测 HTTP 418 错误', async () => {
      const mockResponse = {
        ok: false,
        status: 418,
        statusText: "I'm a teapot",
        url: 'https://weibo.com/ajax/test',
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'content-type') return 'text/plain; charset=utf-8'
            return null
          })
        }
      } as unknown as Response

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const error = await WeiboErrorHandler.checkResponse(mockResponse)

      expect(error).not.toBeNull()
      expect(error?.type).toBe(WeiboErrorType.HTTP_ERROR)
      expect(error?.statusCode).toBe(418)
      expect(error?.message).toContain("HTTP 418: I'm a teapot")
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('HTTP 418 错误经过完整流程后应保持可重试', async () => {
      const mockResponse = {
        ok: false,
        status: 418,
        statusText: "I'm a teapot",
        url: 'https://weibo.com/ajax/test',
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'content-type') return 'text/plain; charset=utf-8'
            return null
          })
        }
      } as unknown as Response

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // 1. checkResponse 检测错误
      const error = await WeiboErrorHandler.checkResponse(mockResponse)
      expect(error).not.toBeNull()

      // 2. shouldRetry 判断可重试
      const shouldRetry = WeiboErrorHandler.shouldRetry(error!)
      expect(shouldRetry).toBe(true)

      // 3. toNoRetryErrorIfNeeded 不应转换
      const finalError = WeiboErrorHandler.toNoRetryErrorIfNeeded(error!)
      expect(finalError.name).toBe('WeiboError')
      expect(finalError).not.toHaveProperty('code', 'NoRetryError')

      consoleWarnSpy.mockRestore()
    })
  })
})
