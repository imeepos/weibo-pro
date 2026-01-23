import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import { useEChartTheme } from '@sker/ui/hooks/use-echart-theme';
import * as echarts from 'echarts';
import type { PostingTimeHeatmap as PostingTimeHeatmapType } from '@sker/sdk';
import type { EChartsOption } from 'echarts';

interface PostingTimeHeatmapProps {
  title?: string;
  height?: number;
  className?: string;
  data?: PostingTimeHeatmapType | null;
  isLoading?: boolean;
  error?: Error | null;
  onClick?: (params: { hour: number; weekday: number; value: number }) => void;
}

interface TopTimeSlot {
  weekday: number;
  hour: number;
  value: number;
  label: string;
  rank: number;
}

// 星期名称映射
const WEEKDAY_NAME_MAP: Record<number, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
};

const PostingTimeHeatmap: React.FC<PostingTimeHeatmapProps> = ({
  title = '发帖时间热力图',
  height = 500,
  className,
  data,
  isLoading = false,
  error = null,
  onClick,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { isDark, colors } = useEChartTheme();

  // 计算峰值前10时间段
  const topTimeSlots = useMemo<TopTimeSlot[]>(() => {
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
  }, [data]);

  // 构建热力图数据
  const heatmapData = useMemo(() => {
    if (!data) return [];

    const result: [number, number, number][] = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      for (let hour = 0; hour < 24; hour++) {
        const value = data.heatmapMatrix[weekday]?.[hour] || 0;
        result.push([hour, weekday, value]);
      }
    }
    return result;
  }, [data]);

  // 构建图表配置
  const chartOption = useMemo<EChartsOption>(() => {
    if (!data || heatmapData.length === 0) return {};

    const maxValue = Math.max(...heatmapData.map(([, , value]) => value));

    // 主题适配的配色方案 - 密度越低颜色越暗
    const heatmapColors = isDark
      ? [
          // 暗色主题：从深蓝（低密度）到亮橙红（高密度）
          '#0d1b2a', // 最暗 - 几乎无数据
          '#1b263b',
          '#274060',
          '#3a5a7c',
          '#4a7c9b',
          '#5c9eba',
          '#7ec8e3',
          '#ffd166', // 中等
          '#f4a261',
          '#e76f51',
          '#e63946', // 最亮 - 高峰值
        ]
      : [
          // 亮色主题：从浅灰（低密度）到深红（高密度）
          '#f8f9fa', // 最浅 - 几乎无数据
          '#e9ecef',
          '#dee2e6',
          '#ced4da',
          '#adb5bd',
          '#6c757d',
          '#495057',
          '#f4a261', // 中等
          '#e76f51',
          '#d62828',
          '#9d0208', // 最深 - 高峰值
        ];

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
                <span style="font-weight: 600; color: ${isDark ? '#ffd166' : '#d62828'};">${percentage}%</span>
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
  }, [data, heatmapData, isDark, colors]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current || !data || heatmapData.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    chartInstance.current.setOption(chartOption);

    // 点击事件
    if (onClick) {
      chartInstance.current.off('click');
      chartInstance.current.on('click', (params: any) => {
        const hour = params.data[0] as number;
        const weekday = params.data[1] as number;
        const value = params.data[2] as number;
        onClick({ hour, weekday, value });
      });
    }

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chartOption, onClick, data, heatmapData]);

  // 清理
  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  // 加载状态
  if (isLoading) {
    return (
      <div className={cn('w-full bg-muted/50 rounded-lg', className)} style={{ height }}>
        <ChartState loading loadingText="加载中..." />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={cn('w-full bg-muted/50 rounded-lg', className)} style={{ height }}>
        <ChartState error={error.message} />
      </div>
    );
  }

  // 空数据状态
  if (!data || data.totalPosts === 0) {
    return (
      <div className={cn('w-full bg-muted/50 rounded-lg', className)} style={{ height }}>
        <ChartState empty emptyText="暂无数据" />
      </div>
    );
  }

  // 获取热度等级颜色
  const getHeatColor = (value: number, maxValue: number) => {
    const ratio = maxValue > 0 ? value / maxValue : 0;
    if (ratio >= 0.8) return isDark ? 'text-red-400' : 'text-red-600';
    if (ratio >= 0.6) return isDark ? 'text-orange-400' : 'text-orange-600';
    if (ratio >= 0.4) return isDark ? 'text-amber-400' : 'text-amber-600';
    if (ratio >= 0.2) return isDark ? 'text-sky-400' : 'text-sky-600';
    return isDark ? 'text-slate-400' : 'text-slate-500';
  };

  const maxSlotValue = topTimeSlots.length > 0 ? topTimeSlots[0].value : 0;

  return (
    <div className={cn('w-full flex gap-4', className)} style={{ height }}>
      {/* 左侧：峰值时间段列表 */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-3">
        <div className="bg-card border border-border rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-1">
            {topTimeSlots.map((slot) => (
              <div
                key={`${slot.weekday}-${slot.hour}`}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded transition-colors',
                  'hover:bg-muted/50 cursor-pointer'
                )}
                onClick={() => onClick?.({ hour: slot.hour, weekday: slot.weekday, value: slot.value })}
              >
                <span
                  className={cn(
                    'w-5 h-5 flex items-center justify-center rounded text-xs font-bold',
                    slot.rank <= 3
                      ? isDark
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-red-100 text-red-600'
                      : isDark
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {slot.rank}
                </span>
                <span className="flex-1 text-xs text-foreground truncate">{slot.label}</span>
                <span className={cn('text-xs font-semibold tabular-nums', getHeatColor(slot.value, maxSlotValue))}>
                  {(slot.value * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧：热力图 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="text-sm font-semibold text-foreground mb-2 px-1">{title}</div>
        <div ref={chartRef} className="flex-1" />
      </div>
    </div>
  );
};

export default PostingTimeHeatmap;
