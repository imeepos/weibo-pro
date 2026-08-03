import React from 'react';
import { Info } from 'lucide-react';
import { ErrorSeverity } from '@/utils/errorHandler';
import { cn } from '@/utils';

interface ErrorStatsPanelProps {
  errorStats: {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCode: Record<string, number>;
    recent: any[];
  };
  onClearHistory: () => void;
  className?: string;
}

const severityColors = {
  [ErrorSeverity.CRITICAL]: 'bg-red-500',
  [ErrorSeverity.HIGH]: 'bg-orange-500',
  [ErrorSeverity.MEDIUM]: 'bg-yellow-500',
  [ErrorSeverity.LOW]: 'bg-blue-500',
};

/**
 * 错误统计面板组件
 */
export function ErrorStatsPanel({
  errorStats,
  onClearHistory,
  className,
}: ErrorStatsPanelProps) {
  const { total, bySeverity, recent } = errorStats;

  if (total === 0) {
    return (
      <div className={cn('p-4 text-center text-gray-500', className)}>
        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>暂无错误记录</p>
      </div>
    );
  }

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* 统计概览 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-600">总错误数</div>
        </div>

        <div className="p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {bySeverity[ErrorSeverity.CRITICAL] + bySeverity[ErrorSeverity.HIGH]}
          </div>
          <div className="text-sm text-red-600">严重错误</div>
        </div>
      </div>

      {/* 严重程度分布 */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">按严重程度分布</h4>

        {Object.entries(bySeverity).map(([severity, count]) => {
          if (count === 0) return null;

          const percentage = (count / total) * 100;

          return (
            <div key={severity} className="flex items-center gap-3">
              <div className="w-16 text-xs text-gray-600 capitalize">
                {severity}
              </div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full', severityColors[severity as ErrorSeverity])}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-8 text-xs text-gray-600 text-right">
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* 最近错误 */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">最近错误</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recent.slice(0, 5).map((error, index) => (
              <div key={index} className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                <div className="font-medium">{error.code}</div>
                <div className="truncate">{error.message}</div>
                <div className="text-gray-400">
                  {new Date(error.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 清除按钮 */}
      <button
        onClick={onClearHistory}
        className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      >
        清除错误历史
      </button>
    </div>
  );
}
