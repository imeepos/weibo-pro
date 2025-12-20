import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无数据',
  description = '当前时间范围内没有可用数据',
  icon,
  className,
  children
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center h-full min-h-[400px] p-8",
      className
    )}>
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="rounded-full bg-muted p-4">
          {icon || <Inbox className="size-8 text-muted-foreground" />}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
};
