/**
 * 全局错误处理器实例与便捷函数
 */

import { ErrorHandler } from './ErrorHandler';
import type { AppError, ErrorContext } from './types';

/**
 * 全局错误处理器实例
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * 处理错误的便捷函数
 */
export function handleError(
  error: unknown,
  context?: ErrorContext,
  customMapping?: Partial<AppError>
): AppError {
  return errorHandler.handleError(error, context, customMapping);
}
