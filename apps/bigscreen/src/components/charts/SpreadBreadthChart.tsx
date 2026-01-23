import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { SpreadBreadthAnalysis } from '@sker/sdk';

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

  // 构建 ECharts sankey 配置
  const chartOption = useMemo<EChartsOption>(() => {
    if (!data || data.propagationPaths.length === 0) return {};

    // 构建节点和边
    const nodes = new Map<string, { name: string; itemStyle: { color: string } }>();
    const links: Array<{ source: string; target: string; value: number; lineStyle: { color: string } }> = [];

    // 根据层级分配颜色
    const getLevelColor = (level: number): string => {
      const colors = ['#fbbf24', '#60a5fa', '#34d399', '#f472b6', '#a78bfa'];
      return colors[level % colors.length];
    };

    for (const path of data.propagationPaths) {
      if (!nodes.has(path.source)) {
        nodes.set(path.source, {
          name: path.source,
          itemStyle: { color: getLevelColor(path.level) },
        });
      }
      if (!nodes.has(path.target)) {
        nodes.set(path.target, {
          name: path.target,
          itemStyle: { color: getLevelColor(path.level + 1) },
        });
      }
      links.push({
        source: path.source,
        target: path.target,
        value: path.weight,
        lineStyle: { color: getLevelColor(path.level) },
      });
    }

    const nodeArray = Array.from(nodes.values());

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          color: '#ffffff',
          fontSize: 16,
        },
      },
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          data: nodeArray,
          links: links,
          itemStyle: {
            color: '#1f77b4',
            borderColor: '#1f77b4',
          },
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
          },
          label: {
            show: true,
            position: 'right',
            formatter: '{b}',
            color: '#ffffff',
          },
          emphasis: {
            focus: 'adjacency',
          },
        },
      ],
    };
  }, [data, title]);

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

  if (isLoading || error || !data || data.propagationPaths.length === 0) {
    return (
      <div className={cn('w-full', className)} style={{ height }}>
        <ChartState
          loading={isLoading}
          error={error?.message}
          empty={!data || data.propagationPaths.length === 0}
          emptyText="暂无传播广度数据"
        />
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export { SpreadBreadthChart };
