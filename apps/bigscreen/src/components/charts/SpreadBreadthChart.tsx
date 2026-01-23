import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import { useEChartTheme } from '@sker/ui/hooks/use-echart-theme';
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
  const { colors } = useEChartTheme();

  // 格式化数字（添加千分位分隔符）
  const formatNumber = (num: number): string => {
    return num.toLocaleString('zh-CN');
  };

  // 构建 ECharts sankey 配置
  const chartOption = useMemo<EChartsOption>(() => {
    if (!data || data.propagationPaths.length === 0) return {};

    // 构建节点和边
    const nodes = new Map<string, { name: string; itemStyle: { color: string } }>();
    const links: Array<{ source: string; target: string; value: number; lineStyle: { color: string } }> = [];

    // 根据层级分配颜色（使用主题感知的颜色）
    const getLevelColor = (level: number): string => {
      const themeColors = ['#fbbf24', '#60a5fa', '#34d399', '#f472b6', '#a78bfa'];
      return themeColors[level % themeColors.length];
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
          color: colors.text,
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
            color: colors.text,
          },
          emphasis: {
            focus: 'adjacency',
          },
        },
      ],
    };
  }, [data, title, colors]);

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
    <div className={cn('w-full flex flex-col', className)} style={{ height }}>
      {/* 统计指标卡片 */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">总转发数</div>
          <div className="text-2xl font-semibold">{formatNumber(data.totalReposts)}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">独立转发者</div>
          <div className="text-2xl font-semibold">{formatNumber(data.uniqueReposters)}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">传播深度</div>
          <div className="text-2xl font-semibold">{data.spreadDepth}层</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">传播宽度</div>
          <div className="text-2xl font-semibold">{data.spreadWidth.toFixed(1)}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">广度指数</div>
          <div className="text-2xl font-semibold">{data.breadthIndex.toFixed(2)}</div>
        </div>
      </div>
      {/* 图表 */}
      <div ref={chartRef} style={{ width: '100%', flex: 1 }} />
    </div>
  );
};

export { SpreadBreadthChart };
