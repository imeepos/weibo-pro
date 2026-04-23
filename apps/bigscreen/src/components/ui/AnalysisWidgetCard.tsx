import React, { type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@sker/ui/components/ui/button';
import { Spinner } from '@sker/ui/components/ui/spinner';
import type { MetricExplanation } from '@/constants/metric-explanations';
import type { AnalysisWidgetState } from '@/types/analysis-widget';
import { cn } from '@/utils';
import { MetricExplainPopover } from './MetricExplainPopover';

interface AnalysisWidgetCardProps {
  title: string;
  icon: ReactNode;
  state: AnalysisWidgetState<unknown>;
  emptyText: string;
  explanation?: MetricExplanation;
  onRetry?: () => void;
  children: ReactNode;
  className?: string;
}

export function AnalysisWidgetCard({
  title,
  icon,
  state,
  emptyText,
  explanation,
  onRetry,
  children,
  className,
}: AnalysisWidgetCardProps) {
  const renderBody = () => {
    if (state.status === 'loading' || state.status === 'idle') {
      return (
        <div className="flex min-h-[220px] items-center justify-center">
          <div className="text-center">
            <Spinner className="mx-auto h-5 w-5" />
            <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
          </div>
        </div>
      );
    }

    if (state.status === 'error') {
      return (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-destructive">{state.error ?? '加载失败'}</p>
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              aria-label={`重试${title}`}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
          ) : null}
        </div>
      );
    }

    if (state.status === 'empty') {
      return (
        <div className="flex min-h-[220px] items-center justify-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      );
    }

    return children;
  };

  return (
    <div className={cn('rounded-xl border border-border/40 bg-muted/20 p-5', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </h3>
        {explanation ? <MetricExplainPopover explanation={explanation} /> : null}
      </div>
      {renderBody()}
    </div>
  );
}
