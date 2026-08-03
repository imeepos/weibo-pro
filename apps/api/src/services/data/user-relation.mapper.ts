import type {
  UserRelationNetwork,
  UserRelationNode,
  UserRelationEdge,
  UserRelationType,
} from '@sker/sdk';

const VALID_USER_TYPES = new Set(['official', 'media', 'kol', 'normal']);

function toValidUserId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

function toPositiveWeight(value: unknown): number | null {
  const weight = Number.parseInt(String(value), 10);
  return Number.isFinite(weight) && weight > 0 ? weight : null;
}

function toSafeUserType(value: unknown): UserRelationNode['userType'] {
  return typeof value === 'string' && VALID_USER_TYPES.has(value)
    ? (value as UserRelationNode['userType'])
    : 'normal';
}

/**
 * 从边数据构建用户关系网络（节点、边、统计信息）
 */
export async function buildNetworkFromEdges(
  edgesData: any[],
  type: UserRelationType,
  manager: any
): Promise<UserRelationNetwork> {
  const candidateEdges = edgesData
    .map((edge) => {
      const source = toValidUserId(edge.source_user_id);
      const target = toValidUserId(edge.target_user_id);
      const weight = toPositiveWeight(edge.weight);

      if (!source || !target || !weight || source === target) {
        return null;
      }

      return { edge, source, target, weight };
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));

  if (candidateEdges.length === 0) {
    return {
      nodes: [],
      edges: [],
      statistics: {
        totalUsers: 0,
        totalRelations: 0,
        avgDegree: 0,
        density: 0,
        communities: 0,
      },
    };
  }

  const userIds = new Set<string>();
  candidateEdges.forEach(({ source, target }) => {
    userIds.add(source);
    userIds.add(target);
  });

  const userIdsArray = Array.from(userIds);

  await manager.query('SET statement_timeout = 30000');

  const BATCH_SIZE = 1000;
  const usersData: any[] = [];
  for (let i = 0; i < userIdsArray.length; i += BATCH_SIZE) {
    const batch = userIdsArray.slice(i, i + BATCH_SIZE);
    const batchResult = await manager.query(
      `SELECT * FROM weibo_users WHERE id = ANY($1::bigint[])`,
      [batch]
    );
    usersData.push(...batchResult);
  }

  const usersMap = new Map<string, any>(
    usersData.map((u: any) => [u.id.toString(), u])
  );

  const validEdges = candidateEdges.filter(
    ({ source, target }) => usersMap.has(source) && usersMap.has(target)
  );
  const visibleUserIds = new Set<string>();
  validEdges.forEach(({ source, target }) => {
    visibleUserIds.add(source);
    visibleUserIds.add(target);
  });

  const nodes: UserRelationNode[] = Array.from(visibleUserIds).map((userId) => {
    const userData = usersMap.get(userId);
    const followers = parseInt(userData.followers_count) || 0;
    const posts = parseInt(userData.statuses_count) || 0;
    const influence = Math.min(
      100,
      Math.floor((Math.log10(followers + 1) * 10 + Math.log10(posts + 1) * 5) * 2)
    );

    return {
      id: userId,
      name: userData.screen_name || userData.name || `用户_${userId}`,
      avatar: userData.avatar,
      followers,
      influence,
      postCount: posts,
      verified: userData.verified || false,
      userType: toSafeUserType(userData.user_type),
      location: userData.location,
    };
  });

  const edges: UserRelationEdge[] = validEdges.map(({ edge, source, target, weight }) => ({
    source,
    target,
    weight,
    type,
    interactions: {
      likes: edge.like_count ? parseInt(edge.like_count) : undefined,
      comments: edge.comment_count ? parseInt(edge.comment_count) : undefined,
      reposts: edge.repost_count ? parseInt(edge.repost_count) : undefined,
    },
  }));

  const totalUsers = nodes.length;
  const totalRelations = edges.length;
  const avgDegree = totalUsers > 0 ? (totalRelations * 2) / totalUsers : 0;
  const maxPossibleEdges = (totalUsers * (totalUsers - 1)) / 2;
  const density = maxPossibleEdges > 0 ? totalRelations / maxPossibleEdges : 0;

  return {
    nodes,
    edges,
    statistics: {
      totalUsers,
      totalRelations,
      avgDegree: Number(avgDegree.toFixed(2)),
      density: Number(density.toFixed(4)),
      communities: 0,
    },
  };
}
