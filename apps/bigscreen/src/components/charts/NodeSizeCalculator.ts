// 节点大小计算工具函数

export interface NodeSizeWeights {
  followers: number;
  influence: number;
  postCount: number;
  connections: number;
}

export const DEFAULT_WEIGHTS: NodeSizeWeights = {
  followers: 0.3,    // 粉丝数权重30%
  influence: 0.4,    // 影响力权重40%
  postCount: 0.15,   // 发帖数权重15%
  connections: 0.15  // 连接数权重15%
};

/**
 * 计算节点的综合影响力得分
 */
export const calculateCompositeScore = (
  node: any,
  connectionCount: number,
  weights: NodeSizeWeights = DEFAULT_WEIGHTS
): number => {
  const { followers = 0, influence = 0, postCount = 0 } = node;

  // 标准化各维度指标（0-1范围）
  const normalizedFollowers = Math.min(followers / 1000000, 1); // 百万粉丝为上限
  const normalizedInfluence = Math.min(influence / 100, 1); // 影响力0-100
  const normalizedPostCount = Math.min(postCount / 10000, 1); // 万条微博为上限
  const normalizedConnections = Math.min(connectionCount / 50, 1); // 50个连接为上限

  // 加权综合得分
  const compositeScore =
    normalizedFollowers * weights.followers +
    normalizedInfluence * weights.influence +
    normalizedPostCount * weights.postCount +
    normalizedConnections * weights.connections;

  return Math.min(compositeScore, 1); // 确保不超过1
};

/**
 * 基于综合影响力计算节点大小
 */
export const calculateNodeSize = (
  compositeScore: number,
  baseSize: number = 3,
  maxSize: number = 25
): number => {
  return baseSize + compositeScore * (maxSize - baseSize);
};

/**
 * 计算所有节点的连接数
 */
export const calculateConnectionCounts = (edges: any[]): Map<string, number> => {
  const connectionCountMap = new Map<string, number>();

  edges.forEach(edge => {
    const source = edge.source.toString();
    const target = edge.target.toString();
    connectionCountMap.set(source, (connectionCountMap.get(source) || 0) + 1);
    connectionCountMap.set(target, (connectionCountMap.get(target) || 0) + 1);
  });

  return connectionCountMap;
};