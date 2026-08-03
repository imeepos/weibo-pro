import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { CentralityAnalysis } from '@sker/sdk';
import { buildGraphChartOption } from './NetworkCentralityGraph.utils';

interface NetworkCentralityGraphProps {
  title?: string;
  height?: number;
  className?: string;
  data?: CentralityAnalysis | null;
  isLoading?: boolean;
  error?: Error | null;
  onClick?: (node: {
    userId: string;
    screenName: string;
    influenceScore: number;
  }) => void;
}

const NetworkCentralityGraph: React.FC<NetworkCentralityGraphProps> = ({
  title = '网络中心性分析',
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
  const chartOption = useMemo<EChartsOption>(
    () => (data && data.nodes.length > 0 ? buildGraphChartOption(data, title) : {}),
    [data, title],
  );

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current || !data || data.nodes.length === 0) return;

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
            influenceScore: params.data.influenceScore,
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
  if (!data || data.nodes.length === 0) {
    return (
      <div className={cn('w-full bg-gray-900/50 rounded-lg', className)} style={{ height }}>
        <ChartState empty emptyText="暂无网络数据" />
      </div>
    );
  }

  // 取 Top 10 影响力用户
  const topInfluencers = data.topInfluencers.slice(0, 10);

  return (
    <div className={cn('w-full relative', className)} style={{ height }}>
      {/* Top 影响力用户列表 */}
      <div className="absolute top-16 right-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700 w-64">
        <div className="text-xs text-gray-400 mb-3 font-bold">Top 10 影响力用户</div>
        <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
          {topInfluencers.map((influencer) => (
            <div
              key={influencer.userId}
              className="flex items-center justify-between gap-2 p-2 rounded bg-gray-800/50 hover:bg-gray-700/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-amber-400 font-bold text-lg">#{influencer.rank}</span>
                <span className="text-gray-300 truncate">{influencer.screenName}</span>
              </div>
              <span className="text-yellow-400 font-bold flex-shrink-0">
                {influencer.score.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 网络统计信息卡片 */}
      <div className="absolute top-16 left-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
        <div className="text-xs text-gray-400 mb-3 font-bold">网络统计</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">节点数:</span>
            <span className="text-white font-bold">{data.networkStats.nodeCount}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">边数:</span>
            <span className="text-white font-bold">{data.networkStats.edgeCount}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">平均度数:</span>
            <span className="text-blue-400 font-bold">{data.networkStats.avgDegree.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">网络密度:</span>
            <span className="text-green-400 font-bold">
              {(data.networkStats.density * 100).toFixed(1)}%
            </span>
          </div>
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">最大度数:</span>
              <span className="text-purple-400 font-bold">{data.networkStats.maxDegree}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 图表容器 */}
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
};

export default NetworkCentralityGraph;
