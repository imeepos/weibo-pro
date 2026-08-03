// 社群间关系分析
import type { UserRelationEdge } from '@sker/sdk';
import type { Community } from './CommunityDetector';

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
