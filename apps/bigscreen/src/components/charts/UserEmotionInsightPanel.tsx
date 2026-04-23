import React from 'react';
import { Badge } from '@sker/ui/components/ui/badge';
import type { EventUserEmotionInsight } from '@sker/sdk';

const EMOTION_LABEL: Record<EventUserEmotionInsight['emotionTilt'], string> = {
  positive: '正向',
  negative: '负向',
  neutral: '中性',
};

export function UserEmotionInsightPanel({ data }: { data: EventUserEmotionInsight[] }) {
  if (!data.length) {
    return <div className="py-10 text-center text-sm text-muted-foreground">暂无用户情绪洞察</div>;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.userId} className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-foreground">{item.screenName}</div>
            <Badge variant="secondary">{EMOTION_LABEL[item.emotionTilt]}</Badge>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">发帖 {item.postCount}</div>
          <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
        </div>
      ))}
    </div>
  );
}
