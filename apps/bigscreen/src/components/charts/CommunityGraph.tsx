import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { CommunityAnalysis } from '@sker/sdk';

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

// 社区颜色映射（使用不同的颜色区分社区）
const getCommunityColor = (communityId: string): string => {
  const hash = communityId.split('-')[1] || '0';
  const colors = [
    'rgba(96, 165, 250, 0.8)',   // 蓝色
    'rgba(251, 191, 36, 0.8)',   // 金色
    'rgba(156, 163, 175, 0.8)',  // 灰色
    'rgba(239, 68, 68, 0.8)',    // 红色
    'rgba(34, 197, 94, 0.8)',    // 绿色
    'rgba(168, 85, 247, 0.8)',   // 紫色
    'rgba(236, 72, 153, 0.8)',   // 粉色
    'rgba(20, 184, 166, 0.8)',   // 青色
  ];
  return colors[parseInt(hash) % colors.length];
};

const getCommunityBorderColor = (communityId: string): string => {
  const hash = communityId.split('-')[1] || '0';
  const colors = [
    '#60a5fa',
    '#fbbf24',
    '#9ca3af',
    '#ef4444',
    '#22c55e',
    '#a855f7',
    '#ec4899',
    '#14b8a6',
  ];
  return colors[parseInt(hash) % colors.length];
};

// 根据角色映射节点大小
const mapNodeSize = (role: string): number => {
  switch (role) {
    case 'leader':
      return 50;
    case 'active':
      return 35;
    case 'peripheral':
      return 20;
    default:
      return 25;
  }
};

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

    // 构建节点数据
    const graphNodes: any[] = [];
    const communityCategories: any[] = [];

    data.communities.forEach((community, index) => {
      // 添加社区分类
      communityCategories.push({
        name: community.name,
        itemStyle: { color: getCommunityBorderColor(community.id) },
      });

      // 添加社区成员节点
      community.members.forEach((member) => {
        const isBridgeUser = data.bridgeUsers.some(b => b.userId === member.userId);
        graphNodes.push({
          id: member.userId,
          name: member.screenName,
          symbolSize: isBridgeUser ? 55 : mapNodeSize(member.role), // 桥接用户节点更大
          itemStyle: {
            color: isBridgeUser
              ? 'rgba(251, 191, 36, 1)'  // 桥接用户使用金色
              : getCommunityColor(community.id),
            borderColor: isBridgeUser
              ? '#fbbf24'
              : getCommunityBorderColor(community.id),
            borderWidth: isBridgeUser ? 4 : 2,
            shadowBlur: isBridgeUser ? 15 : 0,
            shadowColor: isBridgeUser ? '#fbbf24' : 'transparent',
          },
          category: index, // 社区分类索引
          // 存储原始数据用于交互
          userId: member.userId,
          screenName: member.screenName,
          communityId: community.id,
          role: member.role,
          inDegree: member.inDegree,
          outDegree: member.outDegree,
          isBridgeUser,
        });
      });
    });

    // 构建社区间边（基于社区间连接）
    const graphLinks = data.interCommunityLinks.map(link => ({
      source: link.sourceCommunity,
      target: link.targetCommunity,
      lineStyle: {
        width: Math.min(5, Math.max(1, link.weight / 2)),
        opacity: 0.4,
        curveness: 0.2,
        type: 'dashed',
      },
      weight: link.weight,
    }));

    return {
      grid: {
        left: '3%',
        right: '25%',
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
                  ${node.isBridgeUser ? '<span style="color: #fbbf24; margin-left: 8px;">🌉 桥接用户</span>' : ''}
                </div>
                <div style="margin-bottom: 4px; color: #9ca3af;">
                  社区: <span style="color: #60a5fa; font-weight: bold;">${params.data.category + 1}</span>
                </div>
                <div style="margin-bottom: 4px; color: #9ca3af;">
                  角色: <span style="color: #34d399; font-weight: bold;">${node.role}</span>
                </div>
                <div style="margin-bottom: 4px; color: #9ca3af;">
                  入度: <span style="color: #f472b6; font-weight: bold;">${node.inDegree}</span>
                  出度: <span style="color: #a78bfa; font-weight: bold;">${node.outDegree}</span>
                </div>
              </div>
            `;
          }
          if (params.dataType === 'edge') {
            const edge = params.data;
            return `
              <div style="padding: 8px; min-width: 150px;">
                <div style="color: #9ca3af;">
                  社区间连接权重: <span style="color: #34d399; font-weight: bold;">${edge.weight}</span>
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
          links: graphLinks,
          categories: communityCategories,
          roam: true,
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              // 只显示 leader 和桥接用户的标签
              return params.data.role === 'leader' || params.data.isBridgeUser
                ? params.data.name
                : '';
            },
            color: '#e5e7eb',
            fontSize: 11,
          },
          labelLayout: {
            hideOverlap: true,
          },
          force: {
            repulsion: 400,
            edgeLength: [150, 250],
            gravity: 0.1,
            friction: 0.6,
          },
          edgeSymbol: ['none', 'arrow'],
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
            color: 'source',
            curveness: 0.2,
          },
        },
      ],
      legend: {
        show: true,
        orient: 'vertical',
        right: 10,
        top: 'middle',
        data: communityCategories,
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
      <div className="absolute top-16 left-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
        <div className="text-xs text-gray-400 mb-3 font-bold">社区统计</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">社区数:</span>
            <span className="text-white font-bold">{data.totalCommunities}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">模块度:</span>
            <span className="text-blue-400 font-bold">{data.modularity.toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">桥接用户:</span>
              <span className="text-amber-400 font-bold">{data.bridgeUsers.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 桥接用户列表 */}
      {data.bridgeUsers.length > 0 && (
        <div className="absolute top-16 right-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700 w-64">
          <div className="text-xs text-gray-400 mb-3 font-bold">桥接用户</div>
          <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
            {data.bridgeUsers.map((bridgeUser) => (
              <div
                key={bridgeUser.userId}
                className="flex items-center justify-between gap-2 p-2 rounded bg-amber-900/20 hover:bg-amber-900/30 transition-colors cursor-pointer border border-amber-700/30"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-amber-400">🌉</span>
                  <span className="text-gray-300 truncate">{bridgeUser.screenName}</span>
                </div>
                <span className="text-amber-400 font-bold flex-shrink-0">
                  {(bridgeUser.bridgeScore * 100).toFixed(0)}%
                </span>
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

export default CommunityGraph;
