import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshIndicatorProps {
  isStale: boolean;
  onRefresh?: () => void;
  className?: string;
}

const RefreshIndicator: React.FC<RefreshIndicatorProps> = ({
  isStale,
  onRefresh,
  className = ''
}) => {
  if (!isStale) return null;

  return (
    <button
      onClick={onRefresh}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors ${className}`}
      aria-label="数据已过期，点击刷新"
    >
      <RefreshCw className="size-4" />
      <span>数据已过期，点击刷新</span>
    </button>
  );
};

export default RefreshIndicator;
