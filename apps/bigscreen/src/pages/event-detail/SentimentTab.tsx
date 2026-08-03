import React from 'react';
import { Heart, Sprout, Target, TrendingUp, Users, Zap } from 'lucide-react';
import { TabsContent } from '@sker/ui/components/ui/tabs';
import { getMetricExplanation } from '@/constants/metric-explanations';
import { AnalysisWidgetCard } from '@/components/ui';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import SentimentHotnessScatterChart from '@/components/charts/SentimentHotnessScatterChart';
import SentimentIntensityChart from '@/components/charts/SentimentIntensityChart';
import { SentimentTransition } from '@/components/charts/SentimentTransition';
import { EmotionMapPanel } from '@/components/charts/EmotionMapPanel';
import { UserEmotionInsightPanel } from '@/components/charts/UserEmotionInsightPanel';
import { DetailedSentimentTrendPanel } from '@/components/charts/DetailedSentimentTrendPanel';
import type { LoadingState } from '@/types/tab-loading';
import type { SentimentWidgets } from './types';
import type { TimeSeriesDataPoint } from './types';
import { TabContentShell } from './TabContentShell';

interface SentimentTabProps {
  loadingState: LoadingState;
  sentimentWidgets: SentimentWidgets;
  timeSeriesData: TimeSeriesDataPoint[];
  eventId: string | undefined;
  onRetryTab: () => void;
  onRetryWidgets: () => void;
}

export function SentimentTab({
  loadingState,
  sentimentWidgets,
  timeSeriesData,
  eventId,
  onRetryTab,
  onRetryWidgets,
}: SentimentTabProps) {
  return (
    <TabsContent value="sentiment" className="mt-6">
      <TabContentShell loadingState={loadingState} loadingText="加载情感分析数据中..." onRetry={onRetryTab}>
        <AnalysisWidgetCard
          title="情感转变追踪"
          icon={<Heart className="h-4 w-4" />}
          explanation={getMetricExplanation('sentiment-transition')}
          state={sentimentWidgets.transition}
          emptyText="暂无情感转变数据"
          onRetry={onRetryWidgets}
        >
          {eventId && <SentimentTransition eventId={eventId} />}
        </AnalysisWidgetCard>
        <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            情感变化趋势
          </h3>
          <TimeSeriesChart data={timeSeriesData} title="" height={320} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalysisWidgetCard
            title="情感-热度关联"
            icon={<Target className="h-4 w-4" />}
            state={sentimentWidgets.scatter}
            emptyText="暂无情感热度数据"
            onRetry={onRetryWidgets}
          >
            <SentimentHotnessScatterChart title="" height={350} data={sentimentWidgets.scatter.data ?? []} />
          </AnalysisWidgetCard>
          <AnalysisWidgetCard
            title="情感强度谱"
            icon={<Zap className="h-4 w-4" />}
            state={sentimentWidgets.intensity}
            emptyText="暂无情感强度数据"
            onRetry={onRetryWidgets}
          >
            <SentimentIntensityChart title="" height={350} data={sentimentWidgets.intensity.data ?? []} />
          </AnalysisWidgetCard>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalysisWidgetCard
            title="情绪地图"
            icon={<Sprout className="h-4 w-4" />}
            state={sentimentWidgets.emotionMap}
            emptyText="暂无情绪地图数据"
            onRetry={onRetryWidgets}
          >
            <EmotionMapPanel data={sentimentWidgets.emotionMap.data ?? []} />
          </AnalysisWidgetCard>
          <AnalysisWidgetCard
            title="用户情绪洞察"
            icon={<Users className="h-4 w-4" />}
            state={sentimentWidgets.userInsights}
            emptyText="暂无用户情绪洞察"
            onRetry={onRetryWidgets}
          >
            <UserEmotionInsightPanel data={sentimentWidgets.userInsights.data ?? []} />
          </AnalysisWidgetCard>
        </div>
        <AnalysisWidgetCard
          title="详细情感趋势"
          icon={<TrendingUp className="h-4 w-4" />}
          state={sentimentWidgets.detailedTrend}
          emptyText="暂无详细情感趋势数据"
          onRetry={onRetryWidgets}
        >
          <DetailedSentimentTrendPanel data={sentimentWidgets.detailedTrend.data ?? []} />
        </AnalysisWidgetCard>
      </TabContentShell>
    </TabsContent>
  );
}
