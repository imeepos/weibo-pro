// 连线长度计算工具函数

export interface LinkDistanceConfig {
  minDistance: number;
  maxDistance: number;
  useDynamicDistance: boolean;
}

export const DEFAULT_LINK_CONFIG: LinkDistanceConfig = {
  minDistance: 50,
  maxDistance: 200,
  useDynamicDistance: true
};

/**
 * 基于关系强度计算连线距离
 */
export const calculateLinkDistance = (
  edge: any,
  config: LinkDistanceConfig = DEFAULT_LINK_CONFIG
): number => {
  const { weight = 1, type = 'comprehensive' } = edge;
  const { minDistance, maxDistance, useDynamicDistance } = config;

  if (!useDynamicDistance) {
    return 100; // 固定距离
  }

  // 关系强度映射（权重越大，距离越近）
  const normalizedWeight = Math.min(weight / 100, 1); // 假设权重0-100
  const strengthFactor = 1 - normalizedWeight; // 强度越高，因子越小

  // 关系类型修正因子
  const typeFactors = {
    'like': 1.0,      // 点赞关系相对松散
    'comment': 0.8,   // 评论关系较紧密
    'repost': 0.6,    // 转发关系很紧密
    'comprehensive': 0.7 // 综合关系中等
  };

  const baseDistance = minDistance + strengthFactor * (maxDistance - minDistance);
  return baseDistance * (typeFactors[type as keyof typeof typeFactors] || 1.0);
};

/**
 * 计算连线曲率（反映关系方向性）
 */
export const calculateLinkCurvature = (
  edge: any,
  sourceNode: any,
  targetNode: any
): number => {
  const sourceInfluence = sourceNode?.influence || 0;
  const targetInfluence = targetNode?.influence || 0;
  const influenceDiff = sourceInfluence - targetInfluence;

  // 影响力差异越大，曲率越大（表示影响力流动方向）
  const normalizedDiff = Math.min(Math.abs(influenceDiff) / 50, 1);
  const baseCurvature = 0.1;

  // 确定曲率方向（从低影响力指向高影响力）
  const direction = influenceDiff > 0 ? 1 : -1;

  return baseCurvature + normalizedDiff * 0.3 * direction;
};

/**
 * 批量计算所有连线的距离
 */
export const calculateAllLinkDistances = (
  edges: any[],
  nodes: any[],
  config: LinkDistanceConfig = DEFAULT_LINK_CONFIG
): Map<string, number> => {
  const distanceMap = new Map<string, number>();
  const nodeMap = new Map(nodes.map(node => [node.id, node]));

  edges.forEach(edge => {
    const linkId = `${edge.source}-${edge.target}`;
    const distance = calculateLinkDistance(edge, config);
    distanceMap.set(linkId, distance);
  });

  return distanceMap;
};