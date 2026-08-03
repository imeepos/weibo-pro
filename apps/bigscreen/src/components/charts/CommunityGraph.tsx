import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { CommunityAnalysis } from '@sker/sdk';
import { buildCommunityGraphOption } from './CommunityGraph.options';
import { CommunityStatsOverlay, BridgeUsersOverlay } from './CommunityGraph.overlays';

interface CommunityGraphProps {
  title?: string;
  height?: number;
  className?: string;
  data?: CommunityAnalysis | null;
  isLoading?: boolean;
  error?: Error | null;
  onClick?: (node: {
    userId: string;
    screenName: string;
    communityId: string;
  }) => void;
}

const CommunityGraph: React.FC<CommunityGraphProps> = ({
  title = '社区发现分析',
  height = 500,
  className,
  data,
  isLoading = false,
  error = null,
  onClick,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 构建 ECharts graph 配置
  const chartOption = useMemo<EChartsOption>(() => {
    if (!data || data.communities.length === 0) return {};
    return buildCommunityGraphOption(data, title);
  }, [data, title]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current || !data || data.communities.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    chartInstance.current.setOption(chartOption);

    // 点击事件
    if (onClick) {
      chartInstance.current.off('click');
      chartInstance.current.on('click', (params: any) => {
        if (params.dataType === 'node' && params.data) {
          onClick({
            userId: params.data.userId,
            screenName: params.data.screenName,
            communityId: params.data.communityId,
          });
        }
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
  if (!data || data.communities.length === 0) {
    return (
      <div className={cn('w-full bg-gray-900/50 rounded-lg', className)} style={{ height }}>
        <ChartState empty emptyText="暂无社区数据" />
      </div>
    );
  }

  return (
    <div className={cn('w-full relative', className)} style={{ height }}>
      {/* 社区统计信息卡片 */}
      <CommunityStatsOverlay data={data} />

      {/* 桥接用户列表 */}
      <BridgeUsersOverlay data={data} />

      {/* 图表容器 */}
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
};

export default CommunityGraph;
