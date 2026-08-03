import React from 'react';
import { Skeleton } from '@sker/ui/components/ui/skeleton';

/** 事件分析页面加载骨架屏 */
export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 px-6 py-6">
      {/* 头部骨架 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      {/* 统计卡片骨架 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      {/* 列表骨架 */}
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
};
