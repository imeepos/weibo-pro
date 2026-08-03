import React, { useMemo, useState } from 'react';
import type { CommunityEvolutionAnalysis, EvolutionEvent } from '@sker/sdk';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PanelHeader,
  StatsPanel,
  TrendPredictionPanel,
} from './CommunityEvolutionTimeline.panels';
import {
  EventFilterButtons,
  EventList,
  KeyChangesPanel,
  TimeSlicesSummaryPanel,
} from './CommunityEvolutionTimeline.content';
import { CommunityCountChartPanel, ModularityChartPanel } from './CommunityEvolutionTimeline.charts';
import {
  buildCommunityCountChartOption,
  buildModularityChartOption,
  filterEvents,
} from './CommunityEvolutionTimeline.utils';
import { PANEL_WIDTH } from './CommunityEvolutionTimeline.constants';

interface CommunityEvolutionTimelineProps {
  data?: CommunityEvolutionAnalysis | null;
  isLoading?: boolean;
  error?: Error | null;
  onEventClick?: (event: EvolutionEvent) => void;
  className?: string;
  defaultCollapsed?: boolean;
}

export const CommunityEvolutionTimeline: React.FC<CommunityEvolutionTimelineProps> = ({
  data,
  isLoading = false,
  error = null,
  onEventClick,
  className = '',
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');

  // 加载状态
  if (isLoading) {
    return <LoadingState className={className} />;
  }

  // 错误状态
  if (error) {
    return <ErrorState className={className} message={error.message} />;
  }

  // 空数据处理
  if (!data || data.timeSlices.length === 0) {
    return (
      <EmptyState
        className={className}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />
    );
  }

  // 过滤事件
  const filteredEvents = filterEvents(data.evolutionEvents, selectedEventFilter);

  // 社区数量变化图表配置
  const communityCountChartOption = useMemo(
    () => buildCommunityCountChartOption(data.timeSlices),
    [data.timeSlices],
  );

  // 模块度变化图表配置
  const modularityChartOption = useMemo(
    () => buildModularityChartOption(data.timeSlices),
    [data.timeSlices],
  );

  return (
    <div
      className={`bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg ${className}`}
      style={{ width: PANEL_WIDTH }}
    >
      {/* 标题栏 */}
      <PanelHeader isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* 统计信息 */}
          <StatsPanel data={data} />

          {/* 趋势预测 */}
          <TrendPredictionPanel data={data} />

          {/* 事件过滤 */}
          <EventFilterButtons
            data={data}
            selected={selectedEventFilter}
            onSelect={setSelectedEventFilter}
          />

          {/* 演化事件列表 */}
          <EventList events={filteredEvents} onEventClick={onEventClick} />

          {/* 时间切片摘要 */}
          {data.timeSlices.length > 0 && <TimeSlicesSummaryPanel data={data} />}

          {/* 关键变化 */}
          <KeyChangesPanel data={data} />

          {/* 社区数量变化图表 */}
          <CommunityCountChartPanel data={data} option={communityCountChartOption} />

          {/* 模块度变化图表 */}
          <ModularityChartPanel data={data} option={modularityChartOption} />
        </div>
      )}
    </div>
  );
};
