import type { UserRelationNetwork, UserRelationNode } from '@sker/sdk';

function getNodeId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function getEdgeEndpoint(value: unknown): string | null {
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return getNodeId((value as { id?: unknown }).id);
  }
  return getNodeId(value);
}

function isPlaceholderNode(node: UserRelationNode): boolean {
  return (
    /^用户_\d+$/.test(node.name) &&
    (Number(node.followers) || 0) === 0 &&
    (Number(node.postCount) || 0) === 0 &&
    (Number(node.influence) || 0) === 0 &&
    !node.verified
  );
}

function normalizeThreshold(edgeThreshold: number | undefined): number {
  if (edgeThreshold === undefined) return 100;
  if (!Number.isFinite(edgeThreshold)) return 100;
  return Math.min(100, Math.max(1, edgeThreshold));
}

export function sanitizeUserRelationNetwork(
  network: UserRelationNetwork,
  edgeThreshold?: number
): UserRelationNetwork {
  const validNodes = network.nodes.filter((node) => {
    const id = getNodeId(node.id);
    return Boolean(id) && !isPlaceholderNode(node);
  });
  const validNodeIds = new Set(validNodes.map((node) => String(node.id)));
  const visibleNodeIds = new Set<string>();

  const validEdges = network.edges
    .map((edge) => {
      const source = getEdgeEndpoint(edge.source);
      const target = getEdgeEndpoint(edge.target);
      const weight = Number(edge.weight);

      if (
        !source ||
        !target ||
        source === target ||
        !Number.isFinite(weight) ||
        weight <= 0 ||
        !validNodeIds.has(source) ||
        !validNodeIds.has(target)
      ) {
        return null;
      }

      visibleNodeIds.add(source);
      visibleNodeIds.add(target);
      return { ...edge, source, target, weight };
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));
  const threshold = normalizeThreshold(edgeThreshold);
  const visibleEdgeCount = Math.max(1, Math.ceil(validEdges.length * (threshold / 100)));
  const visibleEdges = [...validEdges]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, visibleEdgeCount);

  visibleNodeIds.clear();
  visibleEdges.forEach(({ source, target }) => {
    visibleNodeIds.add(source);
    visibleNodeIds.add(target);
  });

  const nodes = validNodes.filter((node) => visibleNodeIds.has(String(node.id)));
  const totalUsers = nodes.length;
  const totalRelations = visibleEdges.length;
  const avgDegree = totalUsers > 0 ? (totalRelations * 2) / totalUsers : 0;
  const maxPossibleEdges = (totalUsers * (totalUsers - 1)) / 2;
  const density = maxPossibleEdges > 0 ? totalRelations / maxPossibleEdges : 0;

  return {
    nodes,
    edges: visibleEdges,
    statistics: {
      ...network.statistics,
      totalUsers,
      totalRelations,
      avgDegree: Number(avgDegree.toFixed(2)),
      density: Number(density.toFixed(4)),
    },
  };
}
