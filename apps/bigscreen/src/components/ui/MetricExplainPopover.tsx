import React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@sker/ui/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@sker/ui/components/ui/popover';
import type { MetricExplanation } from '@/constants/metric-explanations';

interface MetricExplainPopoverProps {
  explanation: MetricExplanation;
}

export function MetricExplainPopover({
  explanation,
}: MetricExplainPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          aria-label={`${explanation.title}指标说明`}
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">{explanation.title}</h4>
          <p className="text-xs text-muted-foreground">{explanation.summary}</p>
        </div>
        <div className="space-y-3">
          {explanation.definitions.map((item) => (
            <div key={item.key} className="rounded-md border border-border/60 p-3">
              <div className="text-xs font-semibold text-foreground">{item.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
              <div className="mt-2 text-[11px] text-foreground/80">
                解释：{item.interpretation}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                数据源：{item.dataSource}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
