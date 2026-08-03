import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import { useEChartTheme } from '@sker/ui/hooks/use-echart-theme';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { SpreadBreadthAnalysis } from '@sker/sdk';
import {
  buildAggregatedChartOption,
  buildOriginalChartOption,
} from './SpreadBreadthChart.options';
import { StatCards, LevelStatsPanel } from './SpreadBreadthChart.stats';

interface SpreadBreadthChartProps {
  title?: string;
  height?: number;
  className?: string;
  data?: SpreadBreadthAnalysis | null;
  isLoading?: boolean;
  error?: Error | null;
  onClick?: (node: {
    source: string;
    target: string;
    level: number;
  }) => void;
}

const SpreadBreadthChart: React.FC<SpreadBreadthChartProps> = ({
  title = '传播广度分析',
  height = 500,
  className,
  data,
  isLoading = false,
  error = null,
  onClick,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { colors } = useEChartTheme();

  // 检查是否有聚合数据
  const hasAggregatedData = useMemo(() => {
    return data?.aggregatedPropagation && data.aggregatedPropagation.nodes.length > 0;
  }, [data]);

  // 构建聚合数据的图表配置
  const buildAggregatedChartOptionMemo = useMemo<EChartsOption>(
    () => {
      if (!data?.aggregatedPropagation) return {};
      return buildAggregatedChartOption(data, title, colors);
    },
    [data, title, colors]
  );

  // 构建原有数据的图表配置（回退逻辑）
  const buildOriginalChartOptionMemo = useMemo<EChartsOption>(
    () => {
      if (!data || data.propagationPaths.length === 0) return {};
      return buildOriginalChartOption(data, title, colors);
    },
    [data, title, colors]
  );

  // 选择使用哪个图表配置：优先使用聚合数据
  const chartOption = useMemo<EChartsOption>(() => {
    if (hasAggregatedData) {
      return buildAggregatedChartOptionMemo;
    }
    return buildOriginalChartOptionMemo;
  }, [hasAggregatedData, buildAggregatedChartOptionMemo, buildOriginalChartOptionMemo]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  // 更新图表选项
  useEffect(() => {
    if (!chartInstance.current) return;

    if (Object.keys(chartOption).length === 0) {
      chartInstance.current.clear();
    } else {
      chartInstance.current.setOption(chartOption, true);
    }
  }, [chartOption]);

  // 处理点击事件
  useEffect(() => {
    if (!chartInstance.current || !onClick) return;

    const handleClick = (params: any) => {
      if (params.componentType === 'series') {
        onClick({
          source: params.data.source,
          target: params.data.target,
          level: params.data.level || 0,
        });
      }
    };

    chartInstance.current.on('click', handleClick);

    return () => {
      chartInstance.current?.off('click', handleClick);
    };
  }, [onClick]);

  // 检查是否有可显示的数据
  const hasDisplayableData = useMemo(() => {
    if (!data) return false;
    if (hasAggregatedData) return true;
    return data.propagationPaths.length > 0;
  }, [data, hasAggregatedData]);

  const levelStats = data?.aggregatedPropagation?.levelStats || [];

  if (isLoading || error || !hasDisplayableData) {
    return (
      <div className={cn('w-full', className)} style={{ height }}>
        <ChartState
          loading={isLoading}
          error={error?.message}
          empty={!hasDisplayableData}
          emptyText="暂无传播广度数据"
        />
      </div>
    );
  }

  return (
    <div className={cn('w-full flex flex-col', className)} style={{ height }}>
      {/* 统计指标卡片 */}
      <StatCards data={data} />

      {/* 层级分布 */}
      <LevelStatsPanel levelStats={levelStats} />

      {/* 图表 */}
      <div ref={chartRef} style={{ width: '100%', flex: 1 }} />
    </div>
  );
};

export { SpreadBreadthChart };
