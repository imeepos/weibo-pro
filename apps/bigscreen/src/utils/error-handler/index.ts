/**
 * 统一错误处理工具
 * 提供标准化的错误处理、报告和恢复机制
 */

export { ErrorCode, ErrorSeverity } from './types';
export type { AppError, ErrorContext } from './types';
export { ErrorHandler } from './ErrorHandler';
export { errorHandler, handleError } from './instance';
export { createError } from './create-error';
export { safeAsync, safeSync } from './safety';
export { withRetry } from './retry';
export { withErrorBoundary } from './boundary';
