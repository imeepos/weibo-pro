/**
 * 错误通知组件
 * 显示和管理错误通知
 */

import React from 'react';
import { X, AlertTriangle, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { ErrorNotification as ErrorNotificationType } from '@/hooks/useErrorHandler';
import { ErrorSeverity } from '@/utils/errorHandler';
import { cn } from '@/utils';

export { ErrorNotificationProvider } from './ErrorNotificationProvider';
export { ErrorStatsPanel } from './ErrorStatsPanel';

interface ErrorNotificationProps {
  errors: ErrorNotificationType[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onRetry?: () => void;
  className?: string;
}

interface SingleErrorProps {
  error: ErrorNotificationType;
  onDismiss: (id: string) => void;
  onRetry?: () => void;
}

// 根据严重程度选择样式
const getSeverityStyles = (severity: ErrorSeverity) => {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return {
        container: 'bg-red-50 border-red-200 text-red-800',
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
        iconBg: 'bg-red-100',
      };
    case ErrorSeverity.HIGH:
      return {
        container: 'bg-orange-50 border-orange-200 text-orange-800',
        icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
        iconBg: 'bg-orange-100',
      };
    case ErrorSeverity.MEDIUM:
      return {
        container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
        iconBg: 'bg-yellow-100',
      };
    case ErrorSeverity.LOW:
      return {
        container: 'bg-blue-50 border-blue-200 text-blue-800',
        icon: <Info className="w-5 h-5 text-blue-500" />,
        iconBg: 'bg-blue-100',
      };
    default:
      return {
        container: 'bg-gray-50 border-gray-200 text-gray-800',
        icon: <Info className="w-5 h-5 text-gray-500" />,
        iconBg: 'bg-gray-100',
      };
  }
};

/**
 * 单个错误通知组件
 */
function SingleError({ error, onDismiss, onRetry }: SingleErrorProps) {
  const { error: appError, id } = error;
  const styles = getSeverityStyles(appError.severity);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-sm transition-all duration-300',
        styles.container,
        error.dismissed && 'opacity-0 scale-95'
      )}
    >
      {/* 错误图标 */}
      <div className={cn('flex-shrink-0 p-1 rounded-full', styles.iconBg)}>
        {styles.icon}
      </div>

      {/* 错误内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* 错误标题 */}
            <h4 className="text-sm font-medium">
              {appError.userMessage || appError.message}
            </h4>

            {/* 错误详情 */}
            {appError.code && (
              <p className="mt-1 text-xs opacity-75">
                错误代码: {appError.code}
              </p>
            )}

            {/* 错误来源 */}
            {appError.source && (
              <p className="mt-1 text-xs opacity-75">
                来源: {appError.source}
              </p>
            )}

            {/* 时间戳 */}
            <p className="mt-1 text-xs opacity-60">
              {new Date(error.timestamp).toLocaleTimeString()}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 ml-3">
            {/* 重试按钮 */}
            {appError.retryable && onRetry && (
              <button
                onClick={onRetry}
                className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
                title="重试"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* 关闭按钮 */}
            <button
              onClick={() => onDismiss(id)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 错误通知容器组件
 */
export function ErrorNotification({
  errors,
  onDismiss,
  onDismissAll,
  onRetry,
  className,
}: ErrorNotificationProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 批量操作栏 */}
      {errors.length > 1 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <span className="text-sm text-gray-600">
            共 {errors.length} 个错误
          </span>
          <button
            onClick={onDismissAll}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            全部关闭
          </button>
        </div>
      )}

      {/* 错误列表 */}
      <div className="space-y-2">
        {errors.map((error) => (
          <SingleError
            key={error.id}
            error={error}
            onDismiss={onDismiss}
            onRetry={onRetry}
          />
        ))}
      </div>
    </div>
  );
}
