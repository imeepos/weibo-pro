/**
 * 原生错误映射
 * 将原生 Error 对象按消息内容映射为标准化错误信息
 */

import type { AppError, ErrorContext } from './types';
import { ErrorCode, ErrorSeverity } from './types';

/**
 * 映射原生错误到标准格式
 */
export function mapNativeError(error: Error, context?: ErrorContext): Partial<AppError> {
  const message = error.message.toLowerCase();

  // 网络错误
  if (message.includes('network') || message.includes('fetch')) {
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: error.message,
      severity: ErrorSeverity.HIGH,
      userMessage: '网络连接异常，请检查网络设置',
      retryable: true,
    };
  }

  // 超时错误
  if (message.includes('timeout') || message.includes('aborted')) {
    return {
      code: ErrorCode.TIMEOUT_ERROR,
      message: error.message,
      severity: ErrorSeverity.MEDIUM,
      userMessage: '请求超时，请重试',
      retryable: true,
    };
  }

  // API错误
  if (message.includes('unauthorized') || message.includes('401')) {
    return {
      code: ErrorCode.UNAUTHORIZED,
      message: error.message,
      severity: ErrorSeverity.HIGH,
      userMessage: '登录已过期，请重新登录',
      recoverable: false,
    };
  }

  if (message.includes('forbidden') || message.includes('403')) {
    return {
      code: ErrorCode.FORBIDDEN,
      message: error.message,
      severity: ErrorSeverity.HIGH,
      userMessage: '没有访问权限',
      recoverable: false,
    };
  }

  if (message.includes('not found') || message.includes('404')) {
    return {
      code: ErrorCode.NOT_FOUND,
      message: error.message,
      severity: ErrorSeverity.LOW,
      userMessage: '请求的资源不存在',
    };
  }

  // 业务逻辑错误
  if (context?.component?.includes('Chart')) {
    return {
      code: ErrorCode.CHART_RENDER_ERROR,
      message: error.message,
      severity: ErrorSeverity.MEDIUM,
      userMessage: '图表渲染失败，正在重试',
      retryable: true,
    };
  }

  // WebSocket错误
  if (message.includes('websocket') || message.includes('socket')) {
    return {
      code: ErrorCode.WEBSOCKET_ERROR,
      message: error.message,
      severity: ErrorSeverity.MEDIUM,
      userMessage: '实时连接异常，正在重连',
      retryable: true,
    };
  }

  // 默认错误映射
  return {
    code: ErrorCode.SYSTEM_ERROR,
    message: error.message,
    severity: ErrorSeverity.MEDIUM,
  };
}
