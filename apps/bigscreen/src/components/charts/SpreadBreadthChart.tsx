import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import { useEChartTheme } from '@sker/ui/hooks/use-echart-theme';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { SpreadBreadthAnalysis, AggregatedNode, TopUser, LevelStats } from '@sker/sdk';

// 聚合节点颜色配置
const NODE_COLORS = {
  source: '#fbbf24',      // 金色 - 源节点
  top_user: '#f472b6',    // 粉色 - Top 用户
  vip: '#a78bfa',         // 紫色 - VIP 用户
  ordinary: '#60a5fa',    // 蓝色 - 普通用户
  verified: '#34d399',    // 绿色 - 认证用户
} as const;

// 获取聚合节点颜色
const getAggregatedNodeColor = (node: AggregatedNode): string => {
  if (node.type === 'source') return NODE_COLORS.source;
  if (node.type === 'top_user') return NODE_COLORS.top_user;
  if (node.type === 'aggregated' && node.userType) {
    return NODE_COLORS[node.userType] || NODE_COLORS.ordinary;
  }
  return NODE_COLORS.ordinary;
};

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

  // 检查是否有聚合数据
  const hasAggregatedData = useMemo(() => {
    return data?.aggregatedPropagation && data.aggregatedPropagation.nodes.length > 0;
  }, [data]);

  // 构建聚合数据的图表配置
  const buildAggregatedChartOption = useMemo<EChartsOption>(() => {
    if (!data?.aggregatedPropagation) return {};

    const { nodes, links } = data.aggregatedPropagation;

    // 构建节点数据，包含额外的元数据用于 tooltip
    const nodeArray = nodes.map((node) => ({
      name: node.id,
      displayName: node.name,
      nodeType: node.type,
      userType: node.userType,
      count: node.count,
      totalWeight: node.totalWeight,
      topUsers: node.topUsers,
      level: node.level,
      itemStyle: { color: getAggregatedNodeColor(node) },
      label: {
        show: node.type === 'aggregated' || node.type === 'top_user',
        formatter: node.name,
      },
    }));

    // 构建连线数据
    const linkArray = links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.weight,
      level: link.level,
      lineStyle: { color: 'gradient' },
    }));

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
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: {
          color: colors.text,
        },
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const node = params.data;
            if (node.nodeType === 'aggregated') {
              let html = `<strong>${node.displayName}</strong><br/>`;
              html += `用户数: ${node.count}<br/>`;
              html += `总转发: ${node.totalWeight}`;
              if (node.topUsers && node.topUsers.length > 0) {
                html += '<br/><br/>Top 用户:';
                node.topUsers.slice(0, 5).forEach((u: TopUser) => {
                  html += `<br/>- ${u.screenName} (${u.weight}次)`;
                });
              }
              return html;
            }
            return node.displayName || node.name;
          } else if (params.dataType === 'edge') {
            return `传播路径<br/>权重: ${params.value}`;
          }
          return params.name;
        },
      },
      toolbox: {
        feature: {
          saveAsImage: {
            title: '保存为图片',
            name: '传播广度分析',
            backgroundColor: colors.chartBg,
          },
        },
        iconStyle: {
          borderColor: colors.toolbox,
        },
        emphasis: {
          iconStyle: {
            borderColor: colors.emphasis,
          },
        },
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          data: nodeArray,
          links: linkArray,
          top: '5%',
          bottom: '5%',
          left: '5%',
          right: '5%',
          nodeWidth: 20,
          nodeGap: 12,
          itemStyle: {
            borderColor: 'transparent',
          },
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
          },
          label: {
            show: false, // 默认不显示标签
            position: 'right',
            color: colors.text,
            fontSize: 12,
          },
          emphasis: {
            focus: 'adjacency',
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
        },
      ],
    };
  }, [data, title, colors]);

  // 构建原有数据的图表配置（回退逻辑）
  const buildOriginalChartOption = useMemo<EChartsOption>(() => {
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
      // 使用原始值作为节点名称，确保唯一性（ECharts Sankey 要求节点名称唯一）
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
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: {
          color: colors.text,
        },
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            // 节点悬停：显示完整名称
            return params.name;
          } else if (params.dataType === 'edge') {
            // 连线悬停：显示传播关系
            return `${params.data.source} → ${params.data.target}<br/>权重: ${params.value}`;
          }
          return params.name;
        },
      },
      toolbox: {
        feature: {
          saveAsImage: {
            title: '保存为图片',
            name: '传播广度分析',
            backgroundColor: colors.chartBg,
          },
        },
        iconStyle: {
          borderColor: colors.toolbox,
        },
        emphasis: {
          iconStyle: {
            borderColor: colors.emphasis,
          },
        },
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          data: nodeArray,
          links: links,
          top: '5%',
          bottom: '5%',
          left: '5%',
          right: '5%',
          nodeWidth: 20,
          nodeGap: 12,
          itemStyle: {
            color: '#1f77b4',
            borderColor: '#1f77b4',
          },
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
          },
          label: {
            show: false, // 默认不显示标签
            position: 'right',
            formatter: '{b}',
            color: colors.text,
            fontSize: 12,
          },
          emphasis: {
            focus: 'adjacency',
            label: {
              show: true, // 鼠标悬停时显示标签
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
        },
      ],
    };
  }, [data, title, colors]);

  // 选择使用哪个图表配置：优先使用聚合数据
  const chartOption = useMemo<EChartsOption>(() => {
    if (hasAggregatedData) {
      return buildAggregatedChartOption;
    }
    return buildOriginalChartOption;
  }, [hasAggregatedData, buildAggregatedChartOption, buildOriginalChartOption]);

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

      {levelStats.length > 0 && (
        <div className="mb-4 rounded-lg border bg-card p-4">
          <h4 className="mb-3 text-sm font-medium text-foreground">层级分布</h4>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {levelStats.map((stat) => (
              <div key={stat.level} className="rounded-md border border-border/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">第{stat.level}层</span>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(stat.totalUsers)} 用户 / {formatNumber(stat.totalReposts)} 转发
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded bg-muted/50 px-2 py-1.5">
                    <div className="text-muted-foreground">VIP</div>
                    <div className="font-medium">
                      VIP {formatNumber(stat.byUserType.vip.count)}人 / {formatNumber(stat.byUserType.vip.reposts)}转发
                    </div>
                  </div>
                  <div className="rounded bg-muted/50 px-2 py-1.5">
                    <div className="text-muted-foreground">普通</div>
                    <div className="font-medium">
                      普通 {formatNumber(stat.byUserType.ordinary.count)}人 / {formatNumber(stat.byUserType.ordinary.reposts)}转发
                    </div>
                  </div>
                  <div className="rounded bg-muted/50 px-2 py-1.5">
                    <div className="text-muted-foreground">认证</div>
                    <div className="font-medium">
                      认证 {formatNumber(stat.byUserType.verified.count)}人 / {formatNumber(stat.byUserType.verified.reposts)}转发
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图表 */}
      <div ref={chartRef} style={{ width: '100%', flex: 1 }} />
    </div>
  );
};

export { SpreadBreadthChart };
