import React from 'react';
import { Activity, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@sker/ui/components/ui/button';
import { cn, formatRelativeTime } from '@/utils';

interface PageHeaderProps {
  lastUpdate: string;
  isRefreshing: boolean;
  isRefreshingCache: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onRefreshCache: () => void;
}

export function PageHeader({
  lastUpdate,
  isRefreshing,
  isRefreshingCache,
  onBack,
  onRefresh,
  onRefreshCache,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 hover:bg-muted/50"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">事件详情</h1>
            <p className="text-xs text-muted-foreground">
              更新于 {formatRelativeTime(lastUpdate)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshCache}
          disabled={isRefreshingCache}
          className="gap-2"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshingCache && "animate-spin")} />
          {isRefreshingCache ? '清除中...' : '更新缓存'}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-9 w-9 hover:bg-muted/50"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
}
