import type { EChartsOption } from 'echarts';
import type { CentralityAnalysis } from '@sker/sdk';

// 影响力等级颜色映射
export const getInfluenceColor = (score: number): string => {
  if (score >= 7) {
    return 'rgba(251, 191, 36, 0.8)'; // 高影响力：金色
  }
  if (score >= 4) {
    return 'rgba(96, 165, 250, 0.8)'; // 中影响力：蓝色
  }
  return 'rgba(156, 163, 175, 0.8)'; // 低影响力：灰色
};

export const getInfluenceBorderColor = (score: number): string => {
  if (score >= 7) {
    return '#fbbf24';
  }
  if (score >= 4) {
    return '#60a5fa';
  }
  return '#9ca3af';
};

// 根据影响力得分映射节点大小 (10-60px)
export const mapNodeSize = (influenceScore: number): number => {
  return Math.max(10, Math.min(60, influenceScore * 6));
};

// 根据权重映射边的粗细 (0.5-3px)
export const mapEdgeWidth = (weight: number): number => {
  return Math.max(0.5, Math.min(3, weight * 3));
};

// 构建 ECharts graph 配置
export function buildGraphChartOption(data: CentralityAnalysis, title: string): EChartsOption {
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
}
