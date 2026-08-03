/**
 * 网络中心性分析相关类型
 */
export interface CentralityNode {
  userId: string
  screenName: string
  degreeCentrality: number      // 度中心性 (0-1)
  weightedDegree: number        // 加权度
  influenceScore: number        // 综合影响力
  nodeSize: number              // 可视化节点大小
}

export interface CentralityEdge {
  source: string                // 源用户ID
  target: string                // 目标用户ID
  weight: number                // 边权重
}

export interface NetworkStats {
  nodeCount: number             // 节点总数
  edgeCount: number             // 边总数
  avgDegree: number             // 平均度数
  maxDegree: number             // 最大度数
  density: number               // 网络密度 (0-1)
}

export interface TopInfluencer {
  userId: string
  screenName: string
  score: number
  rank: number
}

export interface CentralityAnalysis {
  nodes: CentralityNode[]
  edges: CentralityEdge[]
  networkStats: NetworkStats
  topInfluencers: TopInfluencer[]
}
