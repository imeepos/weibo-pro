import React from 'react';
import { Filter } from 'lucide-react';

/** 事件列表空状态 */
export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-muted/30 mb-4">
        <Filter className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">暂无事件数据</h3>
      <p className="text-sm text-muted-foreground">请尝试调整筛选条件</p>
    </div>
  );
};
