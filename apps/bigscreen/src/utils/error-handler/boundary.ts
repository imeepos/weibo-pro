/**
 * 错误边界工具
 * 为函数提供错误边界装饰，统一处理同步与异步异常
 */

import { handleError } from './instance';
import type { ErrorContext } from './types';

/**
 * 错误边界装饰器
 */
export function withErrorBoundary<T extends (...args: any[]) => any>(
  fn: T,
  context?: ErrorContext
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);

      // 处理Promise返回值
      if (result && typeof result.catch === 'function') {
        return result.catch((error: unknown) => {
          throw handleError(error, context);
        });
      }

      return result;
    } catch (error) {
      throw handleError(error, context);
    }
  }) as T;
}
