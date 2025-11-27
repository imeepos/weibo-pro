interface GraphNode {
  id: string;
}

interface GraphEdge {
  source: string | { id: string };
  target: string | { id: string };
  weight?: number;
}

export interface Community {
  id: number;
  nodes: Set<string>;
  color: string;
  size: number;
  density: number;
  centrality: number;
}

const COMMUNITY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
];

const normalizeId = (id: string | { id: string }): string =>
  typeof id === 'object' ? id.id : id;

const shuffleArray = <T>(array: T[]): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

export class LouvainCommunityDetector<N extends GraphNode, E extends GraphEdge> {
  private nodes: Map<string, N>;
  private adjacency: Map<string, Map<string, number>>;

  constructor(nodes: N[], edges: E[]) {
    this.nodes = new Map(nodes.map(node => [node.id, node]));
    this.adjacency = this.buildAdjacencyMatrix(edges);
  }

  private buildAdjacencyMatrix(edges: E[]): Map<string, Map<string, number>> {
    const adjacency = new Map<string, Map<string, number>>();

    for (const nodeId of this.nodes.keys()) {
      adjacency.set(nodeId, new Map());
    }

    for (const edge of edges) {
      const sourceId = normalizeId(edge.source);
      const targetId = normalizeId(edge.target);
      const weight = edge.weight || 1;

      if (adjacency.has(sourceId) && adjacency.has(targetId)) {
        adjacency.get(sourceId)!.set(targetId, weight);
        adjacency.get(targetId)!.set(sourceId, weight);
      }
    }

    return adjacency;
  }

  private calculateDegree(nodeId: string): number {
    const neighbors = this.adjacency.get(nodeId);
    if (!neighbors) return 0;

    let degree = 0;
    for (const weight of neighbors.values()) {
      degree += weight;
    }
    return degree;
  }

  private calculateTotalWeight(): number {
    let total = 0;
    for (const neighbors of this.adjacency.values()) {
      for (const weight of neighbors.values()) {
        total += weight;
      }
    }
    return total / 2;
  }

  private calculateDeltaModularity(
    nodeId: string,
    targetCommunity: number,
    communities: Map<string, number>
  ): number {
    const m = this.calculateTotalWeight();
    const degree = this.calculateDegree(nodeId);

    let sumIn = 0;
    let sumTot = 0;

    for (const [otherNodeId, weight] of this.adjacency.get(nodeId) || new Map()) {
      if (communities.get(otherNodeId) === targetCommunity) {
        sumIn += weight;
      }
    }

    for (const [otherNodeId, community] of communities) {
      if (community === targetCommunity) {
        sumTot += this.calculateDegree(otherNodeId);
      }
    }

    return (sumIn - (sumTot * degree) / (2 * m)) / m;
  }

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

  private calculateCommunityDensity(community: Community): number {
    const nodeCount = community.nodes.size;
    if (nodeCount <= 1) return 0;

    let internalEdges = 0;
    const nodeArray = Array.from(community.nodes);

    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const weight = this.adjacency.get(nodeArray[i])?.get(nodeArray[j]) || 0;
        if (weight > 0) {
          internalEdges++;
        }
      }
    }

    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    return internalEdges / maxPossibleEdges;
  }

  private calculateCommunityCentrality(community: Community): number {
    let totalCentrality = 0;
    let nodeCount = 0;

    for (const nodeId of community.nodes) {
      totalCentrality += this.calculateDegree(nodeId);
      nodeCount++;
    }

    return nodeCount > 0 ? totalCentrality / nodeCount : 0;
  }

  private buildCommunityObjects(communities: Map<string, number>): Community[] {
    const communityMap = new Map<number, Community>();

    for (const [nodeId, communityId] of communities) {
      if (!communityMap.has(communityId)) {
        communityMap.set(communityId, {
          id: communityId,
          nodes: new Set(),
          color: COMMUNITY_COLORS[communityId % COMMUNITY_COLORS.length],
          size: 0,
          density: 0,
          centrality: 0
        });
      }
      communityMap.get(communityId)!.nodes.add(nodeId);
    }

    const result: Community[] = [];
    for (const community of communityMap.values()) {
      community.size = community.nodes.size;
      community.density = this.calculateCommunityDensity(community);
      community.centrality = this.calculateCommunityCentrality(community);
      result.push(community);
    }

    return result.sort((a, b) => b.size - a.size);
  }

  detectCommunities(maxIterations: number = 10): Community[] {
    let communities = new Map<string, number>();
    let communityId = 0;
    for (const nodeId of this.nodes.keys()) {
      communities.set(nodeId, communityId++);
    }

    let improved = true;
    let iterations = 0;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      const nodes = Array.from(this.nodes.keys());
      shuffleArray(nodes);

      for (const nodeId of nodes) {
        const currentCommunity = communities.get(nodeId)!;
        let bestCommunity = currentCommunity;
        let bestDeltaQ = 0;

        const currentDeltaQ = this.calculateDeltaModularity(nodeId, currentCommunity, communities);

        const neighborCommunities = this.getNeighborCommunities(nodeId, communities);
        for (const neighborCommunity of neighborCommunities) {
          const deltaQ = this.calculateDeltaModularity(nodeId, neighborCommunity, communities);
          if (deltaQ > bestDeltaQ) {
            bestDeltaQ = deltaQ;
            bestCommunity = neighborCommunity;
          }
        }

        if (bestCommunity !== currentCommunity && bestDeltaQ > currentDeltaQ) {
          communities.set(nodeId, bestCommunity);
          improved = true;
        }
      }
    }

    return this.buildCommunityObjects(communities);
  }
}

export interface InterCommunityRelation {
  sourceCommunity: number;
  targetCommunity: number;
  weight: number;
  edgeCount: number;
}

export const analyzeInterCommunityRelations = <E extends GraphEdge>(
  communities: Community[],
  edges: E[]
): InterCommunityRelation[] => {
  const relationMap = new Map<string, { weight: number; count: number }>();

  for (const edge of edges) {
    const sourceId = normalizeId(edge.source);
    const targetId = normalizeId(edge.target);
    const weight = edge.weight || 1;

    let sourceCommunity: number | null = null;
    let targetCommunity: number | null = null;

    for (const community of communities) {
      if (community.nodes.has(sourceId)) sourceCommunity = community.id;
      if (community.nodes.has(targetId)) targetCommunity = community.id;
      if (sourceCommunity !== null && targetCommunity !== null) break;
    }

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

  const relations: InterCommunityRelation[] = [];
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
