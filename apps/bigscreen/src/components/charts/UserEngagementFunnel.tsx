import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import * as echarts from 'echarts';
import type { UserStratification } from '@sker/sdk';
import type { EChartsOption } from 'echarts';

interface UserEngagementFunnelProps {
  title?: string;
  height?: number;
  className?: string;
  data?: UserStratification | null;
  isLoading?: boolean;
  error?: Error | null;
  onClick?: (layer: { layer: string; count: number; percentage: number }) => void;
}

// 分层显示名称映射
const LAYER_NAME_MAP: Record<string, string> = {
  core: '核心用户',
  active: '活跃用户',
  casual: '普通用户',
  lurker: '潜水用户',
};

const UserEngagementFunnel: React.FC<UserEngagementFunnelProps> = ({
  title = '用户参与度分层',
  height = 500,
  className,
  data,
  isLoading = false,
  error = null,
  onClick,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 构建漏斗图配置
  const chartOption = useMemo<EChartsOption>(() => {
    if (!data || data.layers.length === 0) return {};

    const layers = data.layers;

    return {
      grid: {
        left: '15%',
        right: '10%',
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
        trigger: 'item',
        formatter: (params: any) => {
          const layer = params.data as any;
          return `
            <div style="padding: 12px; min-width: 200px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #e5e7eb;">
                ${LAYER_NAME_MAP[layer.name] || layer.name}
              </div>
              <div style="margin-bottom: 4px; color: #9ca3af;">
                用户数量: <span style="color: #fbbf24; font-weight: bold;">${layer.value}</span>
              </div>
              <div style="margin-bottom: 4px; color: #9ca3af;">
                占比: <span style="color: #60a5fa; font-weight: bold;">${layer.percentage.toFixed(1)}%</span>
              </div>
              <div style="color: #9ca3af;">
                平均互动: <span style="color: #34d399; font-weight: bold;">${layer.avgEngagement.toFixed(2)}</span>
              </div>
            </div>
          `;
        },
      },
      series: [
        {
          type: 'funnel',
          left: '10%',
          top: '15%',
          bottom: '10%',
          width: '80%',
          min: 0,
          max: Math.max(...layers.map(l => l.count)),
          minSize: '0%',
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
              return `${LAYER_NAME_MAP[params.data.name] || params.data.name}\n${params.data.value}人`;
            },
            color: '#fff',
            fontSize: 12,
          },
          labelLine: {
            length: 10,
            lineStyle: {
              width: 1,
              type: 'solid',
            },
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
          },
          emphasis: {
            label: {
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          data: layers.map(layer => ({
            name: LAYER_NAME_MAP[layer.name] || layer.name,
            value: layer.count,
            percentage: layer.percentage,
            avgEngagement: layer.avgEngagement,
            itemStyle: {
              color: layer.color,
            },
          })),
        },
      ],
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        data: layers.map(layer => LAYER_NAME_MAP[layer.name]),
        textStyle: {
          color: '#9ca3af',
          fontSize: 12,
        },
        itemWidth: 12,
        itemHeight: 12,
      },
    };
  }, [data, title]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current || !data || data.layers.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    chartInstance.current.setOption(chartOption);

    // 点击事件
    if (onClick) {
      chartInstance.current.off('click');
      chartInstance.current.on('click', (params: any) => {
        const layer = params.data as any;
        onClick({
          layer: layer.name,
          count: layer.value,
          percentage: layer.percentage,
        });
      });
    }

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chartOption, onClick, data]);

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
  if (!data || data.totalUsers === 0) {
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
            <span className="text-gray-400">总用户数:</span>
            <span className="text-white font-bold">{data.totalUsers}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">基尼系数:</span>
            <span className="text-yellow-400 font-bold">{(data.engagementGini * 100).toFixed(1)}%</span>
          </div>
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">核心用户占比:</span>
              <span className="text-amber-400 font-bold">{(data.summary.coreRatio * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">活跃用户占比:</span>
              <span className="text-blue-400 font-bold">{(data.summary.activeRatio * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">帕累托指数:</span>
              <span className="text-green-400 font-bold">{(data.summary.paretoIndex * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 图表容器 */}
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
};

export default UserEngagementFunnel;
