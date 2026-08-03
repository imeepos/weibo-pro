import React from 'react';
import { Activity, AlertTriangle, BarChart3 } from 'lucide-react';
import { TabsContent } from '@sker/ui/components/ui/tabs';
import { getMetricExplanation } from '@/constants/metric-explanations';
import { AnalysisWidgetCard } from '@/components/ui';
import { SpreadBreadthChart } from '@/components/charts/SpreadBreadthChart';
import MediaTypeDistribution from '@/components/charts/MediaTypeDistribution';
import MultiMetricTrendChart from '@/components/charts/MultiMetricTrendChart';
import AnomalyTimelineChart from '@/components/charts/AnomalyTimelineChart';
import type { LoadingState } from '@/types/tab-loading';
import type { TrendWidgets } from './types';
import type { EngagementTrendItem } from './utils';
import { TabContentShell } from './TabContentShell';

interface TrendTabProps {
  loadingState: LoadingState;
  trendWidgets: TrendWidgets;
  engagementTrendData: EngagementTrendItem[];
  onRetryTab: () => void;
  onRetryWidgets: () => void;
}

export function TrendTab({
  loadingState,
  trendWidgets,
  engagementTrendData,
  onRetryTab,
  onRetryWidgets,
}: TrendTabProps) {
  return (
    <TabsContent value="trend" className="mt-6">
      <TabContentShell loadingState={loadingState} loadingText="加载趋势分析数据中..." onRetry={onRetryTab}>
        <AnalysisWidgetCard
          title="传播广度分析"
          icon={<Activity className="h-4 w-4" />}
          explanation={getMetricExplanation('spread-breadth')}
          state={trendWidgets.spreadBreadth}
          emptyText="暂无传播广度数据"
          onRetry={onRetryWidgets}
        >
          <SpreadBreadthChart data={trendWidgets.spreadBreadth.data} height={500} />
        </AnalysisWidgetCard>
        <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            核心指标时间趋势
          </h3>
          <MultiMetricTrendChart data={engagementTrendData} height={380} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalysisWidgetCard
            title="媒体类型分布"
            icon={<BarChart3 className="h-4 w-4" />}
            state={trendWidgets.mediaType}
            emptyText="暂无媒体类型数据"
            onRetry={onRetryWidgets}
          >
            <MediaTypeDistribution data={trendWidgets.mediaType.data} height={350} />
          </AnalysisWidgetCard>
          <AnalysisWidgetCard
            title="异常检测时间线"
            icon={<AlertTriangle className="h-4 w-4" />}
            explanation={getMetricExplanation('anomaly-timeline')}
            state={trendWidgets.anomalies}
            emptyText="暂无异常检测数据"
            onRetry={onRetryWidgets}
          >
            <AnomalyTimelineChart data={trendWidgets.anomalies.data ?? []} height={350} />
          </AnalysisWidgetCard>
        </div>
      </TabContentShell>
    </TabsContent>
  );
}
