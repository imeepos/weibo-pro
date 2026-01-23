import React, { useState, useMemo } from 'react';
import type { CommunityEvolutionAnalysis, EvolutionEvent } from '@sker/sdk';
import { ChevronRight, ChevronLeft, TrendingUp, Clock, Activity, Users, BarChart3, AlertCircle } from 'lucide-react';
import { EChart, type EChartsOption } from '@sker/ui/components/ui/echart';

// 事件类型中文映射
const EVENT_TYPE_MAP: Record<string, string> = {
  birth: '新生',
  death: '解散',
  split: '分裂',
  merge: '合并',
  growth: '成长',
  shrink: '衰退',
};

// 事件颜色映射
const EVENT_COLOR_MAP: Record<string, string> = {
  birth: '#22c55e', // green-500
  death: '#ef4444', // red-500
  split: '#f59e0b', // amber-500
  merge: '#8b5cf6', // violet-500
  growth: '#3b82f6', // blue-500
  shrink: '#f97316', // orange-500
};

// 事件类型颜色（用于测试）
const EVENT_COLOR_TEST_MAP: Record<string, string> = {
  birth: 'green',
  death: 'red',
  split: 'amber',
  merge: 'violet',
  growth: 'blue',
  shrink: 'orange',
};

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
    return (
      <div
        className={`bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg ${className}`}
        style={{ width: '420px' }}
      >
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            社区演化追踪
          </h3>
        </div>
        <div className="p-4 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div
        className={`bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg ${className}`}
        style={{ width: '420px' }}
      >
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            社区演化追踪
          </h3>
        </div>
        <div className="p-4 text-center text-destructive text-xs flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          加载失败: {error.message}
        </div>
      </div>
    );
  }

  // 空数据处理
  if (!data || data.timeSlices.length === 0) {
    return (
      <div
        className={`bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg ${className}`}
        style={{ width: '420px' }}
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            社区演化追踪
          </h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="evolution-collapse-button"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        {!isCollapsed && (
          <div className="p-4 text-center text-muted-foreground text-xs">
            暂无演化数据
          </div>
        )}
      </div>
    );
  }

  // 过滤事件
  const filteredEvents = data.evolutionEvents.filter(event =>
    selectedEventFilter === 'all' || event.type === selectedEventFilter
  );

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 渲染单个事件
  const renderEvent = (event: EvolutionEvent, index: number) => {
    const eventColor = EVENT_COLOR_MAP[event.type] || '#6b7280';
    const eventTypeTest = EVENT_COLOR_TEST_MAP[event.type] || 'other';

    return (
      <div
        key={`${event.type}-${index}`}
        data-testid="evolution-event"
        data-event-type={event.type}
        data-event-color={eventTypeTest}
        className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md border-border bg-muted/30`}
        onClick={() => onEventClick?.(event)}
      >
        {/* 事件头部 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: eventColor }}
            />
            <span className="text-sm font-semibold">
              {EVENT_TYPE_MAP[event.type] || event.type}
            </span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(event.timestamp)}
          </div>
        </div>

        {/* 事件描述 */}
        <div className="text-xs text-muted-foreground mb-2">
          {event.description}
        </div>

        {/* 变化幅度 */}
        {event.magnitude > 0 && (
          <div className="text-xs text-muted-foreground">
            幅度: {event.magnitude.toFixed(2)}
          </div>
        )}
      </div>
    );
  };

  // 渲染时间切片摘要
  const renderTimeSlicesSummary = () => {
    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground mb-2">时间切片</div>
        {data.timeSlices.slice(0, 5).map((slice, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs">{formatTime(slice.timestamp)}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {slice.communities.length} 个社区
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {slice.totalMembers} 成员
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染关键变化
  const renderKeyChanges = () => {
    if (data.keyChanges.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground mb-2">关键变化</div>
        {data.keyChanges.slice(0, 3).map((change, index) => (
          <div
            key={index}
            className="p-2 rounded bg-muted/30 border border-border"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">{change.communityId}</span>
              <span className="text-xs text-muted-foreground">
                {change.changeType}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {change.beforeSize} → {change.afterSize} 成员
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染统计信息
  const renderStats = () => {
    return (
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <div className="text-xs text-muted-foreground mb-1">稳定性指数</div>
          <div className="text-lg font-semibold text-primary">
            {(data.overallStability * 100).toFixed(0)}%
          </div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <div className="text-xs text-muted-foreground mb-1">预测社区数</div>
          <div className="text-lg font-semibold text-primary">
            {data.trendPrediction.predictedCommunityCount}
          </div>
        </div>
      </div>
    );
  };

  // 社区数量变化图表配置
  const communityCountChartOption: EChartsOption = useMemo(() => {
    const timestamps = data.timeSlices.map(slice => {
      const date = new Date(slice.timestamp);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const communityCounts = data.timeSlices.map(slice => slice.communities.length);
    const memberCounts = data.timeSlices.map(slice => slice.totalMembers);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333',
        textStyle: { color: '#fff', fontSize: 10 },
      },
      grid: {
        left: '8%',
        right: '8%',
        bottom: '15%',
        top: '10%',
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af', fontSize: 9 },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af', fontSize: 9 },
        splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
      },
      series: [
        {
          name: '社区数量',
          type: 'bar',
          data: communityCounts,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#1d4ed8' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '60%',
        },
      ],
    };
  }, [data.timeSlices]);

  // 模块度变化图表配置
  const modularityChartOption: EChartsOption = useMemo(() => {
    const timestamps = data.timeSlices.map(slice => {
      const date = new Date(slice.timestamp);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const modularities = data.timeSlices.map(slice => slice.modularity);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333',
        textStyle: { color: '#fff', fontSize: 10 },
        formatter: (params: any) => {
          const point = params[0];
          return `${point.name}<br/>模块度: ${point.value.toFixed(3)}`;
        },
      },
      grid: {
        left: '8%',
        right: '8%',
        bottom: '15%',
        top: '10%',
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af', fontSize: 9 },
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af', fontSize: 9 },
        splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
      },
      series: [
        {
          name: '模块度',
          type: 'line',
          data: modularities,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#10b981', width: 2 },
          itemStyle: { color: '#10b981' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
              ],
            },
          },
        },
      ],
    };
  }, [data.timeSlices]);

  return (
    <div
      className={`bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg ${className}`}
      style={{ width: '420px' }}
    >
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4" />
          社区演化追踪
        </h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid="evolution-collapse-button"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* 统计信息 */}
          {renderStats()}

          {/* 趋势预测 */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="text-xs font-semibold text-muted-foreground mb-2">趋势预测</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">预测模块度: </span>
                <span className="font-semibold">{data.trendPrediction.predictedModularity.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">置信度: </span>
                <span className="font-semibold">{(data.trendPrediction.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* 事件过滤 */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedEventFilter('all')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                selectedEventFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
              data-testid="filter-all"
            >
              全部 ({data.evolutionEvents.length})
            </button>
            {Object.keys(EVENT_TYPE_MAP)
              .filter(type => data.evolutionEvents.filter(e => e.type === type).length > 0)
              .map(type => {
                const count = data.evolutionEvents.filter(e => e.type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedEventFilter(type)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      selectedEventFilter === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                    data-testid={`filter-${type}`}
                  >
                    {EVENT_TYPE_MAP[type]} ({count})
                  </button>
                );
              })}
          </div>

          {/* 演化事件列表 */}
          {filteredEvents.length > 0 ? (
            <div className="space-y-2">
              {filteredEvents.map((event, index) => renderEvent(event, index))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-xs">
              无相关事件
            </div>
          )}

          {/* 时间切片摘要 */}
          {data.timeSlices.length > 0 && renderTimeSlicesSummary()}

          {/* 关键变化 */}
          {renderKeyChanges()}

          {/* 社区数量变化图表 */}
          <div className="pt-2 border-t border-border">
            <div className="text-xs font-semibold text-muted-foreground mb-2">社区数量变化</div>
            {data.timeSlices.length > 1 ? (
              <EChart
                option={communityCountChartOption}
                height={96}
                className="w-full"
                data-testid="community-count-chart"
              />
            ) : (
              <div
                className="h-24 rounded bg-muted/30 border border-border flex items-center justify-center text-xs text-muted-foreground"
                data-testid="community-count-chart"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                数据点不足
              </div>
            )}
          </div>

          {/* 模块度变化图表 */}
          <div className="pt-2 border-t border-border">
            <div className="text-xs font-semibold text-muted-foreground mb-2">模块度变化</div>
            {data.timeSlices.length > 1 ? (
              <EChart
                option={modularityChartOption}
                height={96}
                className="w-full"
                data-testid="modularity-chart"
              />
            ) : (
              <div
                className="h-24 rounded bg-muted/30 border border-border flex items-center justify-center text-xs text-muted-foreground"
                data-testid="modularity-chart"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                数据点不足
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
