/**
 * 社区演化时间线 —— 纯工具函数
 *
 * 仅包含无副作用的格式化、过滤与 ECharts option 构建函数，便于单元测试与复用。
 */
import type { CommunityTimeSlice, EvolutionEvent } from '@sker/sdk';
import type { EChartsOption } from '@sker/ui/components/ui/echart';
import {
  EVENT_COLOR_MAP,
  EVENT_COLOR_TEST_MAP,
  EVENT_TYPE_MAP,
} from './CommunityEvolutionTimeline.constants';

/** 格式化短时间（月/日，用于事件与时间切片展示） */
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/** 格式化月/日（M/D，用于图表 x 轴） */
export function formatMonthDay(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** 事件类型中文标签 */
export function getEventLabel(type: string): string {
  return EVENT_TYPE_MAP[type] || type;
}

/** 事件类型渲染颜色 */
export function getEventColor(type: string): string {
  return EVENT_COLOR_MAP[type] || '#6b7280';
}

/** 事件类型测试颜色（data-event-color 属性） */
export function getEventTestColor(type: string): string {
  return EVENT_COLOR_TEST_MAP[type] || 'other';
}

/** 按事件类型过滤事件列表（'all' 表示不过滤） */
export function filterEvents(events: EvolutionEvent[], filter: string): EvolutionEvent[] {
  return events.filter(event => filter === 'all' || event.type === filter);
}

/** 统计指定类型的事件数量 */
export function countEventsByType(events: EvolutionEvent[], type: string): number {
  return events.filter(event => event.type === type).length;
}

/** 返回存在事件记录的类型及数量（按事件类型映射顺序） */
export function getEventTypesWithCounts(
  events: EvolutionEvent[],
): { type: string; count: number }[] {
  return Object.keys(EVENT_TYPE_MAP)
    .filter(type => countEventsByType(events, type) > 0)
    .map(type => ({ type, count: countEventsByType(events, type) }));
}

/** 构建社区数量变化柱状图配置 */
export function buildCommunityCountChartOption(timeSlices: CommunityTimeSlice[]): EChartsOption {
  const timestamps = timeSlices.map(slice => formatMonthDay(slice.timestamp));
  const communityCounts = timeSlices.map(slice => slice.communities.length);

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
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
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
}

/** 构建模块度变化折线图配置 */
export function buildModularityChartOption(timeSlices: CommunityTimeSlice[]): EChartsOption {
  const timestamps = timeSlices.map(slice => formatMonthDay(slice.timestamp));
  const modularities = timeSlices.map(slice => slice.modularity);

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
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
            ],
          },
        },
      },
    ],
  };
}
