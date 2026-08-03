/**
 * 安全执行工具
 * 提供同步/异步函数的安全包装，捕获异常并转换为标准错误
 */

import { handleError } from './instance';
import type { AppError, ErrorContext } from './types';

/**
 * 安全执行异步函数
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context?: ErrorContext,
  fallback?: T
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    const appError = handleError(error, context);
    return { error: appError, data: fallback };
  }
}

/**
 * 安全执行同步函数
 */
export function safeSync<T>(
  fn: () => T,
  context?: ErrorContext,
  fallback?: T
): { data?: T; error?: AppError } {
  try {
    const data = fn();
    return { data };
  } catch (error) {
    const appError = handleError(error, context);
    return { error: appError, data: fallback };
  }
}
