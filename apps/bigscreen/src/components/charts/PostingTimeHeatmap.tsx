import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import { useEChartTheme } from '@sker/ui/hooks/use-echart-theme';
import * as echarts from 'echarts';
import type { PostingTimeHeatmap as PostingTimeHeatmapType } from '@sker/sdk';
import {
  buildTopTimeSlots,
  buildHeatmapData,
  buildHeatmapChartOption,
  getHeatColor,
} from './PostingTimeHeatmap.utils';

interface PostingTimeHeatmapProps {
  title?: string;
  height?: number;
  className?: string;
  data?: PostingTimeHeatmapType | null;
  isLoading?: boolean;
  error?: Error | null;
  onClick?: (params: { hour: number; weekday: number; value: number }) => void;
}

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
  const topTimeSlots = useMemo(() => buildTopTimeSlots(data), [data]);

  // 构建热力图数据
  const heatmapData = useMemo(() => buildHeatmapData(data), [data]);

  // 构建图表配置
  const chartOption = useMemo(
    () => data ? buildHeatmapChartOption({ data, heatmapData, isDark, colors }) : {},
    [data, heatmapData, isDark, colors],
  );

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
                <span className={cn('text-xs font-semibold tabular-nums', getHeatColor(slot.value, maxSlotValue, isDark))}>
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
