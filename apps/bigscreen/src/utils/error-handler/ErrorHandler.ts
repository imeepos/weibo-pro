/**
 * 错误处理器类
 * 提供标准化的错误转换、日志记录、历史追踪与监听器通知
 */

import { createLogger } from '../logger';
import { mapNativeError } from './native-error-mapper';
import type { AppError, ErrorContext } from './types';
import { ErrorCode, ErrorSeverity } from './types';

const logger = createLogger('ErrorHandler');

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: ((error: AppError) => void)[] = [];
  private errorHistory: AppError[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 处理错误
   */
  handleError(
    error: unknown,
    context?: ErrorContext,
    customMapping?: Partial<AppError>
  ): AppError {
    const appError = this.transformError(error, context, customMapping);

    // 记录错误
    this.logError(appError);

    // 添加到历史记录
    this.addToHistory(appError);

    // 通知监听器
    this.notifyListeners(appError);

    return appError;
  }

  /**
   * 转换错误为标准格式
   */
  private transformError(
    error: unknown,
    context?: ErrorContext,
    customMapping?: Partial<AppError>
  ): AppError {
    const baseError: AppError = {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'An unknown error occurred',
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date().toISOString(),
      source: context?.component,
      recoverable: true,
      retryable: false,
    };

    // 处理已知的AppError
    if (this.isAppError(error)) {
      return { ...baseError, ...error };
    }

    // 处理原生Error对象
    if (error instanceof Error) {
      const mappedError = mapNativeError(error, context);
      return {
        ...baseError,
        ...mappedError,
        originalError: error,
        stack: error.stack,
      };
    }

    // 处理字符串错误
    if (typeof error === 'string') {
      return {
        ...baseError,
        message: error,
        code: ErrorCode.SYSTEM_ERROR,
      };
    }

    // 处理其他类型的错误
    return {
      ...baseError,
      message: String(error),
      details: { originalError: error },
      ...customMapping,
    };
  }

  /**
   * 检查是否为AppError
   */
  private isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'severity' in error
    );
  }

  /**
   * 记录错误日志
   */
  private logError(error: AppError): void {
    const logData = {
      code: error.code,
      message: error.message,
      severity: error.severity,
      source: error.source,
      timestamp: error.timestamp,
      details: error.details,
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        logger.warn('Low severity error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error', error.originalError || logData);
        break;
      case ErrorSeverity.CRITICAL:
        logger.error('Critical error', error.originalError || logData);
        break;
    }
  }

  /**
   * 添加到错误历史
   */
  private addToHistory(error: AppError): void {
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 通知错误监听器
   */
  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        logger.error('Error in error listener', listenerError);
      }
    });
  }

  /**
   * 添加错误监听器
   */
  addErrorListener(listener: (error: AppError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * 移除错误监听器
   */
  removeErrorListener(listener: (error: AppError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(limit?: number): AppError[] {
    return limit ? this.errorHistory.slice(0, limit) : [...this.errorHistory];
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCode: Record<ErrorCode, number>;
    recent: AppError[];
  } {
    const bySeverity = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    const byCode: Record<ErrorCode, number> = {} as Record<ErrorCode, number>;

    this.errorHistory.forEach(error => {
      bySeverity[error.severity]++;
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    });

    return {
      total: this.errorHistory.length,
      bySeverity,
      byCode,
      recent: this.errorHistory.slice(0, 10),
    };
  }
}
