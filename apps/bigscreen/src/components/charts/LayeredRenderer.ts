/**
 * 分层渲染策略 - 支持百万级节点
 *
 * 核心层：前1000个高影响力节点，完整渲染
 * 中间层：1000-10000节点，简化渲染
 * 背景层：10000+节点，聚合为热力图
 */

export interface LayeredData {
  coreNodes: any[];
  coreEdges: any[];
  middleNodes: any[];
  middleEdges: any[];
  backgroundNodes: any[];
  stats: {
    total: number;
    core: number;
    middle: number;
    background: number;
  };
}

export const LAYER_THRESHOLDS = {
  CORE: 2000,
  MIDDLE: 10000,
  BACKGROUND: 100000,
};

/**
 * 将节点分层
 */
export function stratifyNodes(
  nodes: any[],
  edges: any[],
  scoreKey: string = 'compositeScore'
): LayeredData {
  const sortedNodes = [...nodes].sort((a, b) => (b[scoreKey] || 0) - (a[scoreKey] || 0));

  const coreNodes = sortedNodes.slice(0, LAYER_THRESHOLDS.CORE);
  const middleNodes = sortedNodes.slice(LAYER_THRESHOLDS.CORE, LAYER_THRESHOLDS.MIDDLE);
  const backgroundNodes = sortedNodes.slice(LAYER_THRESHOLDS.MIDDLE);

  const coreNodeIds = new Set(coreNodes.map(n => n.id.toString()));
  const middleNodeIds = new Set(middleNodes.map(n => n.id.toString()));

  const coreEdges = edges.filter(e =>
    coreNodeIds.has(e.source.toString()) && coreNodeIds.has(e.target.toString())
  );

  const middleEdges = edges.filter(e => {
    const src = e.source.toString();
    const tgt = e.target.toString();
    return (coreNodeIds.has(src) || middleNodeIds.has(src)) &&
           (coreNodeIds.has(tgt) || middleNodeIds.has(tgt));
  });

  return {
    coreNodes,
    coreEdges,
    middleNodes,
    middleEdges,
    backgroundNodes,
    stats: {
      total: nodes.length,
      core: coreNodes.length,
      middle: middleNodes.length,
      background: backgroundNodes.length,
    },
  };
}

/**
 * 获取渲染数据（根据节点数量自动选择策略）
 *
 * 策略：
 * - ≤2000: 全量渲染
 * - 2000-10000: 核心层 + 中间层
 * - 10000-100000: 仅核心层（中间层和背景层使用点云）
 * - >100000: 核心层 + 采样（背景层使用点云）
 */
export function getRenderData(
  nodes: any[],
  edges: any[],
  scoreKey: string = 'compositeScore'
): { nodes: any[]; edges: any[]; isLayered: boolean; stats?: any; backgroundNodes?: any[] } {
  if (nodes.length <= LAYER_THRESHOLDS.CORE) {
    return { nodes, edges, isLayered: false };
  }

  const layered = stratifyNodes(nodes, edges, scoreKey);

  if (nodes.length <= LAYER_THRESHOLDS.MIDDLE) {
    return {
      nodes: [...layered.coreNodes, ...layered.middleNodes],
      edges: layered.middleEdges,
      isLayered: true,
      stats: layered.stats,
    };
  }

  // 超过 10000 节点：核心层用 InstancedMesh，背景层用点云
  return {
    nodes: layered.coreNodes,
    edges: layered.coreEdges,
    isLayered: true,
    stats: layered.stats,
    backgroundNodes: [...layered.middleNodes, ...layered.backgroundNodes],
  };
}
