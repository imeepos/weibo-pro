import React from 'react';
import { Heart, Target } from 'lucide-react';
import { TabsContent } from '@sker/ui/components/ui/tabs';
import { AnalysisWidgetCard, MetricExplainPopover } from '@/components/ui';
import { getMetricExplanation } from '@/constants/metric-explanations';
import SentimentHotnessScatterChart from '@/components/charts/SentimentHotnessScatterChart';
import { SentimentTransition } from '@/components/charts/SentimentTransition';
import type { LoadingState } from '@/types/tab-loading';
import type { SentimentWidgets } from './types';
import { TabContentShell } from './TabContentShell';

interface SentimentTabProps {
  loadingState: LoadingState;
  sentimentWidgets: SentimentWidgets;
  eventId: string | undefined;
  onRetryTab: () => void;
  onRetryWidgets: () => void;
}

export function SentimentTab({
  loadingState,
  sentimentWidgets,
  eventId,
  onRetryTab,
  onRetryWidgets,
}: SentimentTabProps) {
  return (
    <TabsContent value="sentiment" className="mt-6">
      <TabContentShell loadingState={loadingState} loadingText="加载情感分析数据中..." onRetry={onRetryTab}>
        {/* 情感转变追踪：稳定性/极化指数/转折点/转变流向，自管加载态 */}
        <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Heart className="w-4 h-4" />
              情感转变追踪
            </h3>
            <MetricExplainPopover explanation={getMetricExplanation('sentiment-transition')} />
          </div>
          {eventId && <SentimentTransition eventId={eventId} />}
        </div>
        <AnalysisWidgetCard
          title="情感-热度关联"
          icon={<Target className="w-4 h-4" />}
          state={sentimentWidgets.scatter}
          emptyText="暂无情感热度数据"
          onRetry={onRetryWidgets}
        >
          <SentimentHotnessScatterChart title="" height={350} data={sentimentWidgets.scatter.data ?? []} />
        </AnalysisWidgetCard>
      </TabContentShell>
    </TabsContent>
  );
}
