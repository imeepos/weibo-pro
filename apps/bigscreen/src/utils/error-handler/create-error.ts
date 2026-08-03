/**
 * 错误创建工具
 */

import type { AppError } from './types';
import { ErrorCode, ErrorSeverity } from './types';

/**
 * 创建错误
 */
export function createError(
  code: ErrorCode,
  message: string,
  options?: Partial<AppError>
): AppError {
  return {
    code,
    message,
    severity: ErrorSeverity.MEDIUM,
    timestamp: new Date().toISOString(),
    recoverable: true,
    retryable: false,
    ...options,
  };
}
