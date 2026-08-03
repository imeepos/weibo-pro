/**
 * 重试机制
 * 为异步函数提供带退避策略的自动重试
 */

import { handleError } from './instance';
import type { ErrorContext } from './types';

/**
 * 重试执行异步函数
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
    context?: ErrorContext;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true, context } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw handleError(error, context);
      }

      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw handleError(lastError, context);
}
