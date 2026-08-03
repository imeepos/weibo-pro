/**
 * 统一错误处理工具
 * 提供标准化的错误处理、报告和恢复机制
 *
 * 该文件为兼容入口(barrel)，实现已拆分至 ./error-handler/ 子目录
 */

export {
  ErrorCode,
  ErrorSeverity,
  ErrorHandler,
  errorHandler,
  handleError,
  safeAsync,
  safeSync,
  withRetry,
  withErrorBoundary,
  createError,
} from './error-handler';
export type { AppError, ErrorContext } from './error-handler';
