// 社群检测算法
import type { UserRelationNode, UserRelationEdge } from '@sker/sdk';

export interface Community {
  id: number;
  nodes: Set<string>;
  color: string;
  size: number;
  density: number;
  centrality: number;
}

/**
 * Louvain 社群检测算法实现
 * 基于模块度优化的经典社群检测算法
 */
export class LouvainCommunityDetector {
  private nodes: Map<string, UserRelationNode>;
  private edges: UserRelationEdge[];
  private adjacency: Map<string, Map<string, number>>;

  constructor(nodes: UserRelationNode[], edges: UserRelationEdge[]) {
    this.nodes = new Map(nodes.map(node => [node.id.toString(), node]));
    this.edges = edges;
    this.buildAdjacencyMatrix();
  }

  /**
   * 构建邻接矩阵
   */
  private buildAdjacencyMatrix(): void {
    this.adjacency = new Map();

    // 初始化所有节点的邻接表
    for (const nodeId of this.nodes.keys()) {
      this.adjacency.set(nodeId, new Map());
    }

    // 填充边权重
    for (const edge of this.edges) {
      const sourceId = edge.source.toString();
      const targetId = edge.target.toString();
      const weight = edge.weight || 1;

      if (this.adjacency.has(sourceId) && this.adjacency.has(targetId)) {
        this.adjacency.get(sourceId)!.set(targetId, weight);
        this.adjacency.get(targetId)!.set(sourceId, weight);
      }
    }
  }

  /**
   * 计算模块度
   */
  private calculateModularity(communities: Map<string, number>): number {
    const m = this.calculateTotalWeight();
    let modularity = 0;

    for (const [nodeA, neighbors] of this.adjacency) {
      const communityA = communities.get(nodeA)!;
      const degreeA = this.calculateDegree(nodeA);

      for (const [nodeB, weight] of neighbors) {
        const communityB = communities.get(nodeB)!;
        const degreeB = this.calculateDegree(nodeB);

        const delta = communityA === communityB ? 1 : 0;
        const expected = (degreeA * degreeB) / (2 * m);

        modularity += (weight - expected) * delta;
      }
    }

    return modularity / (2 * m);
  }

  /**
   * 计算节点度数
   */
  private calculateDegree(nodeId: string): number {
    const neighbors = this.adjacency.get(nodeId);
    if (!neighbors) return 0;

    let degree = 0;
    for (const weight of neighbors.values()) {
      degree += weight;
    }
    return degree;
  }

  /**
   * 计算总权重
   */
  private calculateTotalWeight(): number {
    let total = 0;
    for (const neighbors of this.adjacency.values()) {
      for (const weight of neighbors.values()) {
        total += weight;
      }
    }
    return total / 2; // 每条边被计算两次
  }

  /**
   * 执行社群检测
   */
  detectCommunities(): Community[] {
    // 初始化：每个节点一个社群
    let communities = new Map<string, number>();
    let communityId = 0;
    for (const nodeId of this.nodes.keys()) {
      communities.set(nodeId, communityId++);
    }

    let improved = true;
    let iterations = 0;
    const maxIterations = 10;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      // 第一阶段：局部优化
      const nodes = Array.from(this.nodes.keys());
      this.shuffleArray(nodes);

      for (const nodeId of nodes) {
        const currentCommunity = communities.get(nodeId)!;
        let bestCommunity = currentCommunity;
        let bestDeltaQ = 0;

        // 计算当前社群的模块度变化
        const currentDeltaQ = this.calculateDeltaModularity(nodeId, currentCommunity, communities);

        // 检查邻居社群
        const neighborCommunities = this.getNeighborCommunities(nodeId, communities);
        for (const neighborCommunity of neighborCommunities) {
          const deltaQ = this.calculateDeltaModularity(nodeId, neighborCommunity, communities);
          if (deltaQ > bestDeltaQ) {
            bestDeltaQ = deltaQ;
            bestCommunity = neighborCommunity;
          }
        }

        // 如果找到更好的社群，移动节点
        if (bestCommunity !== currentCommunity && bestDeltaQ > currentDeltaQ) {
          communities.set(nodeId, bestCommunity);
          improved = true;
        }
      }
    }

    return this.buildCommunityObjects(communities);
  }

  /**
   * 计算模块度变化
   */
  private calculateDeltaModularity(
    nodeId: string,
    targetCommunity: number,
    communities: Map<string, number>
  ): number {
    const m = this.calculateTotalWeight();
    const degree = this.calculateDegree(nodeId);

    let sumIn = 0; // 社群内连接权重和
    let sumTot = 0; // 社群总权重

    for (const [otherNodeId, weight] of this.adjacency.get(nodeId) || new Map()) {
      if (communities.get(otherNodeId) === targetCommunity) {
        sumIn += weight;
      }
    }

    // 计算社群总权重
    for (const [otherNodeId, community] of communities) {
      if (community === targetCommunity) {
        sumTot += this.calculateDegree(otherNodeId);
      }
    }

    const ki_in = sumIn;
    const ki = degree;
    const sigma_tot = sumTot;

    return (ki_in - (sigma_tot * ki) / (2 * m)) / m;
  }

  /**
   * 获取邻居社群
   */
  private getNeighborCommunities(nodeId: string, communities: Map<string, number>): Set<number> {
    const neighborCommunities = new Set<number>();
    const neighbors = this.adjacency.get(nodeId);

    if (neighbors) {
      for (const neighborId of neighbors.keys()) {
        const community = communities.get(neighborId);
        if (community !== undefined) {
          neighborCommunities.add(community);
        }
      }
    }

    return neighborCommunities;
  }

  /**
   * 构建社群对象
   */
  private buildCommunityObjects(communities: Map<string, number>): Community[] {
    const communityMap = new Map<number, Community>();
    const communityColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];

    // 统计每个社群的节点
    for (const [nodeId, communityId] of communities) {
      if (!communityMap.has(communityId)) {
        communityMap.set(communityId, {
          id: communityId,
          nodes: new Set(),
          color: communityColors[communityId % communityColors.length],
          size: 0,
          density: 0,
          centrality: 0
        });
      }
      communityMap.get(communityId)!.nodes.add(nodeId);
    }

    // 计算社群统计信息
    const result: Community[] = [];
    for (const community of communityMap.values()) {
      community.size = community.nodes.size;
      community.density = this.calculateCommunityDensity(community);
      community.centrality = this.calculateCommunityCentrality(community);
      result.push(community);
    }

    // 按大小排序
    return result.sort((a, b) => b.size - a.size);
  }

  /**
   * 计算社群密度
   */
  private calculateCommunityDensity(community: Community): number {
    const nodeCount = community.nodes.size;
    if (nodeCount <= 1) return 0;

    let internalEdges = 0;
    const nodeArray = Array.from(community.nodes);

    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const nodeA = nodeArray[i];
        const nodeB = nodeArray[j];
        const weight = this.adjacency.get(nodeA)?.get(nodeB) || 0;
        if (weight > 0) {
          internalEdges++;
        }
      }
    }

    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    return internalEdges / maxPossibleEdges;
  }

  /**
   * 计算社群中心性
   */
  private calculateCommunityCentrality(community: Community): number {
    let totalCentrality = 0;
    let nodeCount = 0;

    for (const nodeId of community.nodes) {
      const degree = this.calculateDegree(nodeId);
      totalCentrality += degree;
      nodeCount++;
    }

    return nodeCount > 0 ? totalCentrality / nodeCount : 0;
  }

  /**
   * 随机打乱数组
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

/**
 * 社群间关系分析
 */
export interface InterCommunityRelation {
  sourceCommunity: number;
  targetCommunity: number;
  weight: number;
  edgeCount: number;
}

export const analyzeInterCommunityRelations = (
  communities: Community[],
  edges: UserRelationEdge[]
): InterCommunityRelation[] => {
  const relations: InterCommunityRelation[] = [];
  const communityMap = new Map<number, Community>();

  for (const community of communities) {
    communityMap.set(community.id, community);
  }

  // 统计社群间连接
  const relationMap = new Map<string, { weight: number; count: number }>();

  for (const edge of edges) {
    const sourceId = edge.source.toString();
    const targetId = edge.target.toString();
    const weight = edge.weight || 1;

    // 找到源节点和目标节点的社群
    let sourceCommunity: number | null = null;
    let targetCommunity: number | null = null;

    for (const community of communities) {
      if (community.nodes.has(sourceId)) {
        sourceCommunity = community.id;
      }
      if (community.nodes.has(targetId)) {
        targetCommunity = community.id;
      }
      if (sourceCommunity !== null && targetCommunity !== null) break;
    }

    // 如果是社群间连接
    if (sourceCommunity !== null && targetCommunity !== null && sourceCommunity !== targetCommunity) {
      const key = `${Math.min(sourceCommunity, targetCommunity)}-${Math.max(sourceCommunity, targetCommunity)}`;

      if (!relationMap.has(key)) {
        relationMap.set(key, { weight: 0, count: 0 });
      }

      const relation = relationMap.get(key)!;
      relation.weight += weight;
      relation.count++;
    }
  }

  // 构建关系对象
  for (const [key, data] of relationMap) {
    const [sourceId, targetId] = key.split('-').map(Number);
    relations.push({
      sourceCommunity: sourceId,
      targetCommunity: targetId,
      weight: data.weight,
      edgeCount: data.count
    });
  }

  return relations.sort((a, b) => b.weight - a.weight);
};