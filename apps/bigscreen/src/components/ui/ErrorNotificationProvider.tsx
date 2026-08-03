import React from 'react';
import { UseErrorHandlerReturn } from '@/hooks/useErrorHandler';
import { cn } from '@/utils';
import { ErrorNotification } from './ErrorNotification';

interface ErrorNotificationProviderProps {
  errorHandler: UseErrorHandlerReturn;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  children: React.ReactNode;
}

// 位置样式
const getPositionStyles = (pos: string) => {
  switch (pos) {
    case 'top-right':
      return 'fixed top-4 right-4 z-50';
    case 'top-left':
      return 'fixed top-4 left-4 z-50';
    case 'bottom-right':
      return 'fixed bottom-4 right-4 z-50';
    case 'bottom-left':
      return 'fixed bottom-4 left-4 z-50';
    default:
      return 'fixed top-4 right-4 z-50';
  }
};

/**
 * 错误通知提供者组件
 * 用于全局错误通知管理
 */
export function ErrorNotificationProvider({
  errorHandler,
  position = 'top-right',
  maxVisible = 3,
  children,
}: ErrorNotificationProviderProps) {
  const {
    errors,
    dismissError,
    dismissAllErrors,
    retryLastFailedOperation,
  } = errorHandler;

  // 只显示前N个错误
  const visibleErrors = errors.slice(0, maxVisible);

  return (
    <>
      {children}

      {/* 错误通知容器 */}
      {visibleErrors.length > 0 && (
        <div className={cn(getPositionStyles(position), 'w-96 max-w-[calc(100vw-2rem)]')}>
          <ErrorNotification
            errors={visibleErrors}
            onDismiss={dismissError}
            onDismissAll={dismissAllErrors}
            onRetry={retryLastFailedOperation}
          />
        </div>
      )}
    </>
  );
}
