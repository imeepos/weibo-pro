import type { NetworkEdge, NetworkNode, TopologyData, TopologyStatistics } from './types';

/**
 * 根据节点大小计算层级（越大的节点层级越高，显示在前面）
 */
export const getNodeLevel = (nodeSize: number): number => {
  if (nodeSize >= 60) return 10; // MainHub 最高层级
  if (nodeSize >= 40) return 8; // 大节点
  if (nodeSize >= 25) return 6; // 中等节点
  return 4; // 小节点
};

/**
 * 创建空的统计信息
 */
export const createEmptyStatistics = (): TopologyStatistics => ({
  efdTotal: 0,
  appTotal: 0,
  iotTotal: 0,
  cloudTotal: 0
});

/**
 * 归一化后端返回的拓扑数据
 * - 若 data 为数组，包装成 { data }
 * - 若 data 为 null/undefined，返回空结构
 */
export const normalizeTopologyData = (data: unknown): TopologyData => {
  if (Array.isArray(data)) {
    return { data };
  }
  return (data ?? { data: [] }) as TopologyData;
};

/**
 * 构建节点数组（去重 + Pompeo 特殊处理）
 */
export const buildNodesArray = (data: TopologyData): NetworkNode[] => {
  const nodes: NetworkNode[] = [];
  const nodeMap = new Map<string, boolean>(); // 用于去重

  const dataArray = data.data && Array.isArray(data.data) ? data.data : [];

  dataArray.forEach((item) => {
    // 添加 Source 节点
    if (item.Source && !nodeMap.has(item.Source)) {
      const size = typeof item.size === 'number' ? item.size : 0.1;
      const nodeSize = item.Source === 'Pompeo' ? 260 : Math.max(15, size * 50);
      nodeMap.set(item.Source, true);

      nodes.push({
        id: item.Source,
        label: '',
        type: item.Source,
        color: item.Source === 'Pompeo' ? { background: '#010E45' } : { background: '#1A4999' },
        shape: 'dot',
        size: nodeSize,
        level: getNodeLevel(nodeSize),
        font: {
          color: '#ffffff',
          size: 0,
          face: 'Microsoft YaHei'
        },
        borderWidth: 2,
        borderWidthSelected: 3
      });
    }

    // 添加 target 节点
    if (item.target && !nodeMap.has(item.target)) {
      const size = typeof item.size === 'number' ? item.size : 0.1;
      const nodeSize = Math.max(15, size * 50);
      nodeMap.set(item.target, true);

      nodes.push({
        id: item.target,
        label: '',
        type: item.target,
        color: { background: '#1A4999' },
        shape: 'dot',
        size: nodeSize,
        level: getNodeLevel(nodeSize),
        font: {
          color: '#ffffff',
          size: 0,
          face: 'Microsoft YaHei'
        },
        borderWidth: 2,
        borderWidthSelected: 3
      });
    }
  });

  return nodes;
};

/**
 * 构建边数组
 */
export const buildEdgesArray = (data: TopologyData): NetworkEdge[] => {
  const edges: NetworkEdge[] = [];
  const dataArray = data.data && Array.isArray(data.data) ? data.data : [];

  dataArray.forEach((item) => {
    if (item.Source && item.target) {
      edges.push({
        from: item.Source,
        to: item.target,
        label: '',
        width: 1,
        color: { color: '#10b981' }, // 固定绿色
        smooth: false
      });
    }
  });

  return edges;
};

/**
 * 获取模拟拓扑数据（作为后端不可用时的后备）
 */
export const getMockTopologyData = (): TopologyData => {
  const mockData = [
    // 第一层：Pompeo 的直接连接 (辐射状)
    { Source: 'Pompeo', target: 'Hub1', size: 0.4 },
    { Source: 'Pompeo', target: 'Hub2', size: 0.35 },
    { Source: 'Pompeo', target: 'Hub3', size: 0.3 },
    { Source: 'Pompeo', target: 'Hub4', size: 0.25 },
    { Source: 'Pompeo', target: 'Hub5', size: 0.2 },

    // 第二层：Hub 的扩展连接
    { Source: 'Hub1', target: 'Node1A', size: 0.18 },
    { Source: 'Hub1', target: 'Node1B', size: 0.16 },
    { Source: 'Hub1', target: 'Node1C', size: 0.14 },
    { Source: 'Hub2', target: 'Node2A', size: 0.2 },
    { Source: 'Hub2', target: 'Node2B', size: 0.18 },
    { Source: 'Hub3', target: 'Node3A', size: 0.15 },
    { Source: 'Hub3', target: 'Node3B', size: 0.13 },
    { Source: 'Hub3', target: 'Node3C', size: 0.11 },
    { Source: 'Hub4', target: 'Node4A', size: 0.12 },
    { Source: 'Hub4', target: 'Node4B', size: 0.1 },
    { Source: 'Hub5', target: 'Node5A', size: 0.14 },

    // 第三层：叶子节点
    { Source: 'Node1A', target: 'Leaf1A', size: 0.08 },
    { Source: 'Node1A', target: 'Leaf1B', size: 0.07 },
    { Source: 'Node1B', target: 'Leaf1C', size: 0.06 },
    { Source: 'Node2A', target: 'Leaf2A', size: 0.09 },
    { Source: 'Node2A', target: 'Leaf2B', size: 0.08 },
    { Source: 'Node2B', target: 'Leaf2C', size: 0.07 },
    { Source: 'Node3A', target: 'Leaf3A', size: 0.06 },
    { Source: 'Node3B', target: 'Leaf3B', size: 0.05 },
    { Source: 'Node4A', target: 'Leaf4A', size: 0.05 },
    { Source: 'Node5A', target: 'Leaf5A', size: 0.06 },

    // 跨层连接 (会生成绿色特殊连线)
    { Source: 'Node1A', target: 'Node2B', size: 0.05 },
    { Source: 'Node2A', target: 'Node3A', size: 0.04 },
    { Source: 'Node3B', target: 'Node4A', size: 0.03 },
    { Source: 'Hub1', target: 'Node3A', size: 0.06 },
    { Source: 'Hub2', target: 'Node4B', size: 0.05 }
  ];

  return { data: mockData };
};
