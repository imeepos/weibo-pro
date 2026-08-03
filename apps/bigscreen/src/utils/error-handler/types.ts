/**
 * 错误类型定义
 * 包含统一错误处理所需的枚举与接口
 */

export enum ErrorCode {
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',

  // API错误
  API_ERROR = 'API_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',

  // WebSocket错误
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  WEBSOCKET_CONNECTION_FAILED = 'WEBSOCKET_CONNECTION_FAILED',
  WEBSOCKET_MESSAGE_ERROR = 'WEBSOCKET_MESSAGE_ERROR',

  // 业务逻辑错误
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  DATA_PROCESSING_ERROR = 'DATA_PROCESSING_ERROR',
  CHART_RENDER_ERROR = 'CHART_RENDER_ERROR',

  // 系统错误
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',

  // 用户错误
  USER_INPUT_ERROR = 'USER_INPUT_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',

  // 未知错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  LOW = 'low',       // 不影响核心功能
  MEDIUM = 'medium', // 影响部分功能
  HIGH = 'high',     // 影响核心功能
  CRITICAL = 'critical' // 系统不可用
}

export interface AppError {
  code: ErrorCode;
  message: string;
  severity: ErrorSeverity;
  timestamp: string;
  source?: string;
  details?: Record<string, unknown>;
  stack?: string;
  originalError?: Error;
  userMessage?: string; // 用户友好的错误提示
  recoverable?: boolean; // 是否可恢复
  retryable?: boolean;   // 是否可重试
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}
