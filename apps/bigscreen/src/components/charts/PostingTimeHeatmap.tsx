import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
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

    return {
      grid: {
        left: '5%',
        right: '15%',
        bottom: '10%',
        top: '15%',
      },
      title: {
        text: title,
        left: 'center',
        top: 10,
        textStyle: {
          color: '#e5e7eb',
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const hour = params.data[0] as number;
          const weekday = params.data[1] as number;
          const value = params.data[2] as number;
          return `
            <div style="padding: 12px; min-width: 200px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #e5e7eb;">
                ${WEEKDAY_NAME_MAP[weekday]} ${hour.toString().padStart(2, '0')}:00
              </div>
              <div style="margin-bottom: 4px; color: #9ca3af;">
                发帖热度: <span style="color: #fbbf24; font-weight: bold;">${(value * 100).toFixed(1)}%</span>
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
        bottom: '5%',
        textStyle: {
          color: '#9ca3af',
        },
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
        },
      },
      xAxis: {
        type: 'category',
        data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        splitArea: {
          show: true,
        },
        axisLabel: {
          color: '#9ca3af',
          fontSize: 11,
        },
        axisLine: {
          lineStyle: {
            color: '#4b5563',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: Array.from({ length: 7 }, (_, i) => WEEKDAY_NAME_MAP[i]),
        splitArea: {
          show: true,
        },
        axisLabel: {
          color: '#9ca3af',
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: '#4b5563',
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
  }, [data, heatmapData, title]);

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
      <div className={cn('w-full bg-gray-900/50 rounded-lg', className)} style={{ height }}>
        <ChartState loading loadingText="加载中..." />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={cn('w-full bg-gray-900/50 rounded-lg', className)} style={{ height }}>
        <ChartState error={error.message} />
      </div>
    );
  }

  // 空数据状态
  if (!data || data.totalPosts === 0) {
    return (
      <div className={cn('w-full bg-gray-900/50 rounded-lg', className)} style={{ height }}>
        <ChartState empty emptyText="暂无数据" />
      </div>
    );
  }

  return (
    <div className={cn('w-full relative', className)} style={{ height }}>
      {/* 统计信息面板 */}
      <div className="absolute top-16 right-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
        <div className="text-xs text-gray-400 mb-3">统计信息</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">总发帖数:</span>
            <span className="text-white font-bold">{data.totalPosts}</span>
          </div>
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">峰值时间:</span>
              <span className="text-red-400 font-bold">{data.peakTime.label}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">峰值发帖数:</span>
              <span className="text-red-400 font-bold">{data.peakTime.count}</span>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">低谷时间:</span>
              <span className="text-blue-400 font-bold">{data.offPeakTime.label}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">低谷发帖数:</span>
              <span className="text-blue-400 font-bold">{data.offPeakTime.count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 洞察信息面板 */}
      {data.insights && data.insights.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700 max-w-sm">
          <div className="text-xs text-gray-400 mb-3">数据洞察</div>
          <div className="space-y-2 text-xs">
            {data.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span className="text-gray-300">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图表容器 */}
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
};

export default PostingTimeHeatmap;
