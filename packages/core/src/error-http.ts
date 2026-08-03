import { AppError } from './error-base';

/**
 * 400 Bad Request - Client sent invalid data
 */
export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super("VALIDATION_ERROR", message, 400, fields ? { fields } : undefined);
  }
}

/**
 * 400 Bad Request - 客户端请求错误（通用）
 *
 * 存在即合理：
 * - ValidationError 用于数据验证错误（带字段详情）
 * - BadRequestError 用于通用请求错误（不涉及字段验证）
 *
 * 使用场景：
 * - 参数缺失："工作流名称不能为空"
 * - 逻辑错误："必须提供 workflow 或 ast 字段"
 * - 状态错误："运行实例状态不正确"
 */
export class BadRequestError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super("BAD_REQUEST", message, 400, meta);
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 */
export class ForbiddenError extends AppError {
  constructor(message = "Access forbidden") {
    super("FORBIDDEN", message, 403);
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super("NOT_FOUND", message, 404, { resource, identifier });
  }
}

/**
 * 409 Conflict - Resource already exists or conflict with current state
 */
export class ConflictError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super("CONFLICT", message, 409, meta);
  }
}

/**
 * 422 Unprocessable Entity - Request well-formed but semantically invalid
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super("UNPROCESSABLE_ENTITY", message, 422, meta);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded", retryAfter?: number) {
    super(
      "RATE_LIMIT_EXCEEDED",
      message,
      429,
      retryAfter ? { retryAfter } : undefined,
    );
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalError extends AppError {
  constructor(message: string, originalError?: unknown) {
    const meta = originalError
      ? {
        originalError:
          originalError instanceof Error
            ? originalError.message
            : String(originalError),
      }
      : undefined;
    super("INTERNAL_ERROR", message, 500, meta);
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message = "Service temporarily unavailable",
    retryAfter?: number,
  ) {
    super(
      "SERVICE_UNAVAILABLE",
      message,
      503,
      retryAfter ? { retryAfter } : undefined,
    );
  }
}
