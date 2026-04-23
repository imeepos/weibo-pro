import React from 'react';
import type { EventEmotionMapItem } from '@sker/sdk';

export function EmotionMapPanel({ data }: { data: EventEmotionMapItem[] }) {
  if (!data.length) {
    return <div className="py-10 text-center text-sm text-muted-foreground">暂无情绪地图数据</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {data.map((item) => (
        <span
          key={item.label}
          className="rounded-full border border-border/50 bg-primary/10 px-3 py-1.5 text-sm text-foreground"
        >
          {item.label}
          <span className="ml-2 text-xs text-muted-foreground">{item.weight}</span>
        </span>
      ))}
    </div>
  );
}
