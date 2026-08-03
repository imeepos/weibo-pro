import type { PostingTimeHeatmap as PostingTimeHeatmapType } from '@sker/sdk';
import type { EChartsOption } from 'echarts';
import type { EChartThemeColors } from '@sker/ui/hooks/use-echart-theme';
import {
  WEEKDAY_NAME_MAP,
  HEATMAP_DARK_COLORS,
  HEATMAP_LIGHT_COLORS,
} from './PostingTimeHeatmap.constants';

export interface TopTimeSlot {
  weekday: number;
  hour: number;
  value: number;
  label: string;
  rank: number;
}

export type HeatmapDataEntry = [number, number, number];

// 计算峰值前10时间段
export function buildTopTimeSlots(data?: PostingTimeHeatmapType | null): TopTimeSlot[] {
  if (!data) return [];

  const slots: { weekday: number; hour: number; value: number }[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const value = data.heatmapMatrix[weekday]?.[hour] || 0;
      if (value > 0) {
        slots.push({ weekday, hour, value });
      }
    }
  }

  return slots
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((slot, index) => ({
      ...slot,
      label: `${WEEKDAY_NAME_MAP[slot.weekday]} ${slot.hour.toString().padStart(2, '0')}:00`,
      rank: index + 1,
    }));
}

// 构建热力图数据
export function buildHeatmapData(data?: PostingTimeHeatmapType | null): HeatmapDataEntry[] {
  if (!data) return [];

  const result: HeatmapDataEntry[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const value = data.heatmapMatrix[weekday]?.[hour] || 0;
      result.push([hour, weekday, value]);
    }
  }
  return result;
}

// 获取热度等级颜色
export function getHeatColor(value: number, maxValue: number, isDark: boolean): string {
  const ratio = maxValue > 0 ? value / maxValue : 0;
  if (ratio >= 0.8) return isDark ? 'text-red-400' : 'text-red-600';
  if (ratio >= 0.6) return isDark ? 'text-orange-400' : 'text-orange-600';
  if (ratio >= 0.4) return isDark ? 'text-amber-400' : 'text-amber-600';
  if (ratio >= 0.2) return isDark ? 'text-sky-400' : 'text-sky-600';
  return isDark ? 'text-slate-400' : 'text-slate-500';
}

export interface BuildHeatmapChartOptionParams {
  data: PostingTimeHeatmapType;
  heatmapData: HeatmapDataEntry[];
  isDark: boolean;
  colors: EChartThemeColors;
}

// 构建图表配置
export function buildHeatmapChartOption({
  data,
  heatmapData,
  isDark,
  colors,
}: BuildHeatmapChartOptionParams): EChartsOption {
  if (!data || heatmapData.length === 0) return {};

  const maxValue = Math.max(...heatmapData.map(([, , value]) => value));
  const heatmapColors = isDark ? HEATMAP_DARK_COLORS : HEATMAP_LIGHT_COLORS;
  const tooltipValueColor = isDark ? '#ffd166' : '#d62828';

  return {
    grid: {
      left: '8%',
      right: '5%',
      bottom: '15%',
      top: '10%',
    },
    tooltip: {
      position: 'top',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: {
        color: colors.text,
      },
      formatter: (params: any) => {
        const hour = params.data[0] as number;
        const weekday = params.data[1] as number;
        const value = params.data[2] as number;
        const percentage = (value * 100).toFixed(1);
        return `
          <div style="padding: 8px; min-width: 160px;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px;">
              ${WEEKDAY_NAME_MAP[weekday]} ${hour.toString().padStart(2, '0')}:00
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="opacity: 0.7;">发帖热度</span>
              <span style="font-weight: 600; color: ${tooltipValueColor};">${percentage}%</span>
            </div>
          </div>
        `;
      },
    },
    visualMap: {
      min: 0,
      max: maxValue || 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '2%',
      itemWidth: 12,
      itemHeight: 120,
      textStyle: {
        color: colors.textMuted,
        fontSize: 11,
      },
      inRange: {
        color: heatmapColors,
      },
    },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      splitArea: {
        show: true,
        areaStyle: {
          color: isDark
            ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']
            : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.04)'],
        },
      },
      axisLabel: {
        color: colors.textMuted,
        fontSize: 10,
        interval: 1,
      },
      axisLine: {
        lineStyle: {
          color: colors.border,
        },
      },
    },
    yAxis: {
      type: 'category',
      data: Array.from({ length: 7 }, (_, i) => WEEKDAY_NAME_MAP[i]),
      splitArea: {
        show: true,
        areaStyle: {
          color: isDark
            ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']
            : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.04)'],
        },
      },
      axisLabel: {
        color: colors.textMuted,
        fontSize: 11,
      },
      axisLine: {
        lineStyle: {
          color: colors.border,
        },
      },
    },
    series: [
      {
        name: '发帖热度',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
}
