import type { EChartsOption } from 'echarts';
import type { CommunityAnalysis } from '@sker/sdk';

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

// 构建 ECharts graph 配置
export function buildCommunityGraphOption(
  data: CommunityAnalysis,
  title: string
): EChartsOption {
  if (data.communities.length === 0) return {};

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
      type: 'dashed' as const,
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
  } as EChartsOption;
}
