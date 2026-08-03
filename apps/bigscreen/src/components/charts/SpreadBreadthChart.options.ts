import type { EChartsOption } from 'echarts';
import type { SpreadBreadthAnalysis, AggregatedNode, TopUser } from '@sker/sdk';

// 聚合节点颜色配置
export const NODE_COLORS = {
  source: '#fbbf24',      // 金色 - 源节点
  top_user: '#f472b6',    // 粉色 - Top 用户
  vip: '#a78bfa',         // 紫色 - VIP 用户
  ordinary: '#60a5fa',    // 蓝色 - 普通用户
  verified: '#34d399',    // 绿色 - 认证用户
} as const;

// 获取聚合节点颜色
export const getAggregatedNodeColor = (node: AggregatedNode): string => {
  if (node.type === 'source') return NODE_COLORS.source;
  if (node.type === 'top_user') return NODE_COLORS.top_user;
  if (node.type === 'aggregated' && node.userType) {
    return NODE_COLORS[node.userType] || NODE_COLORS.ordinary;
  }
  return NODE_COLORS.ordinary;
};

export interface ChartThemeColors {
  text: string;
  textMuted: string;
  border: string;
  splitLine: string;
  tooltipBg: string;
  tooltipBorder: string;
  toolbox: string;
  emphasis: string;
  chartBg: string;
}

// 构建聚合数据的图表配置
export function buildAggregatedChartOption(
  data: SpreadBreadthAnalysis,
  title: string,
  colors: ChartThemeColors
): EChartsOption {
  const { nodes, links } = data.aggregatedPropagation!;

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
}

// 构建原有数据的图表配置（回退逻辑）
export function buildOriginalChartOption(
  data: SpreadBreadthAnalysis,
  title: string,
  colors: ChartThemeColors
): EChartsOption {
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
}
