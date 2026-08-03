import {
  type Community,
  type GraphEdge,
  type InterCommunityRelation,
  normalizeId,
} from './graph-community-detector-types';

export const analyzeInterCommunityRelations = <E extends GraphEdge>(
  communities: Community[],
  edges: E[]
): InterCommunityRelation[] => {
  const relationMap = new Map<string, { weight: number; count: number }>();

  // 构建节点到社群的映射
  const nodeToCommunity = new Map<string, number>();
  for (const community of communities) {
    for (const nodeId of community.nodes) {
      nodeToCommunity.set(nodeId, community.id);
    }
  }

  for (const edge of edges) {
    const sourceId = normalizeId(edge.source);
    const targetId = normalizeId(edge.target);
    const weight = edge.weight || 1;

    const sourceCommunity = nodeToCommunity.get(sourceId);
    const targetCommunity = nodeToCommunity.get(targetId);

    if (sourceCommunity !== undefined && targetCommunity !== undefined && sourceCommunity !== targetCommunity) {
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
