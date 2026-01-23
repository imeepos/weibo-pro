import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { CentralityAnalysis } from '@sker/sdk';

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

// 影响力等级颜色映射
const getInfluenceColor = (score: number): string => {
  if (score >= 7) {
    return 'rgba(251, 191, 36, 0.8)'; // 高影响力：金色
  }
  if (score >= 4) {
    return 'rgba(96, 165, 250, 0.8)'; // 中影响力：蓝色
  }
  return 'rgba(156, 163, 175, 0.8)'; // 低影响力：灰色
};

const getInfluenceBorderColor = (score: number): string => {
  if (score >= 7) {
    return '#fbbf24';
  }
  if (score >= 4) {
    return '#60a5fa';
  }
  return '#9ca3af';
};

// 根据影响力得分映射节点大小 (10-60px)
const mapNodeSize = (influenceScore: number): number => {
  return Math.max(10, Math.min(60, influenceScore * 6));
};

// 根据权重映射边的粗细 (0.5-3px)
const mapEdgeWidth = (weight: number): number => {
  return Math.max(0.5, Math.min(3, weight * 3));
};

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
  const chartOption = useMemo<EChartsOption>(() => {
    if (!data || data.nodes.length === 0) return {};

    const { nodes, edges } = data;

    // 构建节点数据
    const graphNodes = nodes.map((node) => ({
      id: node.userId,
      name: node.screenName,
      symbolSize: mapNodeSize(node.influenceScore),
      itemStyle: {
        color: getInfluenceColor(node.influenceScore),
        borderColor: getInfluenceBorderColor(node.influenceScore),
        borderWidth: 2,
      },
      // 存储原始数据用于交互
      userId: node.userId,
      screenName: node.screenName,
      influenceScore: node.influenceScore,
      degreeCentrality: node.degreeCentrality,
    }));

    // 构建边数据
    const graphEdges = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      lineStyle: {
        width: mapEdgeWidth(edge.weight),
        opacity: 0.6,
        curveness: 0.1, // 轻微弯曲，避免重叠
      },
      weight: edge.weight,
    }));

    return {
      grid: {
        left: '3%',
        right: '25%', // 右侧留出空间显示统计信息
        bottom: '3%',
        top: '10%',
        containLabel: true,
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
          if (params.dataType === 'node') {
            const node = params.data;
            return `
              <div style="padding: 12px; min-width: 200px;">
                <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #e5e7eb;">
                  ${node.name}
                </div>
                <div style="margin-bottom: 4px; color: #9ca3af;">
                  影响力得分: <span style="color: #fbbf24; font-weight: bold;">${node.influenceScore.toFixed(2)}</span>
                </div>
                <div style="margin-bottom: 4px; color: #9ca3af;">
                  度中心性: <span style="color: #60a5fa; font-weight: bold;">${(node.degreeCentrality * 100).toFixed(1)}%</span>
                </div>
              </div>
            `;
          }
          if (params.dataType === 'edge') {
            const edge = params.data;
            return `
              <div style="padding: 8px; min-width: 150px;">
                <div style="color: #9ca3af;">
                  关系权重: <span style="color: #34d399; font-weight: bold;">${edge.weight.toFixed(2)}</span>
                </div>
              </div>
            `;
          }
          return '';
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          data: graphNodes,
          links: graphEdges,
          roam: true, // 允许缩放和平移
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              // 只显示高影响力节点的标签
              return params.data.influenceScore >= 6 ? params.data.name : '';
            },
            color: '#e5e7eb',
            fontSize: 11,
          },
          labelLayout: {
            hideOverlap: true,
          },
          force: {
            repulsion: 300, // 节点斥力
            edgeLength: [100, 200], // 边长度范围
            gravity: 0.1, // 向心力
            friction: 0.6, // 摩擦力
          },
          edgeSymbol: ['none', 'arrow'], // 边的箭头
          edgeSymbolSize: [0, 8],
          emphasis: {
            focus: 'adjacency',
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 3,
              opacity: 1,
            },
            lineStyle: {
              width: 4,
              opacity: 0.8,
            },
          },
          lineStyle: {
            color: 'source', // 边颜色跟随源节点
            curveness: 0.1,
          },
        },
      ],
      legend: {
        show: true,
        orient: 'vertical',
        right: 10,
        top: 'middle',
        data: [
          { name: '高影响力 (≥7)', icon: 'circle', itemStyle: { color: '#fbbf24' } },
          { name: '中影响力 (4-7)', icon: 'circle', itemStyle: { color: '#60a5fa' } },
          { name: '低影响力 (<4)', icon: 'circle', itemStyle: { color: '#9ca3af' } },
        ],
        textStyle: {
          color: '#9ca3af',
          fontSize: 11,
        },
        itemWidth: 12,
        itemHeight: 12,
      },
    };
  }, [data, title]);

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
