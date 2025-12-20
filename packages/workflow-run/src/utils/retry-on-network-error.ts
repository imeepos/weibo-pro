import { logger } from '@sker/core'

/**
 * 网络错误关键词
 * 存在即合理：只针对临时性网络故障重试
 */
const NETWORK_ERROR_KEYWORDS = [
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'Connection terminated unexpectedly',
  'Connection closed unexpectedly',
  'Connection refused',
  'Network error',
  'read ECONNRESET',
  'connect ETIMEDOUT'
]

/**
 * 判断是否为可重试的网络错误
 */
function isNetworkError(error: unknown): boolean {
  if (!error) return false

  const message = error instanceof Error ? error.message : String(error)
  return NETWORK_ERROR_KEYWORDS.some(keyword => message.includes(keyword))
}

/**
 * 使用指数退避策略重试网络操作
 *
 * 优雅设计：
 * - 只重试网络错误，其他错误直接抛出
 * - 指数退避：每次重试延迟时间翻倍
 * - 日志记录：记录重试过程，便于追踪问题
 *
 * @param operation 要执行的操作
 * @param maxRetries 最大重试次数（默认 3）
 * @param baseDelayMs 基础延迟时间（默认 1000ms）
 * @param operationName 操作名称，用于日志记录
 */
export async function withRetryOnNetworkError<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
  operationName = '操作'
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // 非网络错误，直接抛出
      if (!isNetworkError(error)) {
        throw error
      }

      // 最后一次重试失败
      if (attempt === maxRetries) {
        logger.error(`${operationName}达到最大重试次数`, {
          maxRetries,
          error: error instanceof Error ? error.message : String(error)
        })
        throw error
      }

      // 计算延迟时间（指数退避）
      const delayMs = baseDelayMs * Math.pow(2, attempt)

      logger.warn(`${operationName}遇到网络错误，准备重试`, {
        attempt: attempt + 1,
        maxRetries,
        delayMs,
        error: error instanceof Error ? error.message : String(error)
      })

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  // 理论上不会到达这里，但 TypeScript 需要一个返回值
  throw lastError
}
