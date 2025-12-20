import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@sker/ui/components/ui/button';
import { cn } from '@/utils';

interface ErrorStateProps {
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  className
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center h-full min-h-[400px] p-8",
      className
    )}>
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="size-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            数据加载失败
          </h3>
          <p className="text-sm text-muted-foreground">
            {error || '无法获取数据，请检查网络连接后重试'}
          </p>
        </div>

        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            重试
          </Button>
        )}
      </div>
    </div>
  );
};
