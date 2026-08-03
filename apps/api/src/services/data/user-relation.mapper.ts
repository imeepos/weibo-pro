import type {
  UserRelationNetwork,
  UserRelationNode,
  UserRelationEdge,
  UserRelationType,
} from '@sker/sdk';

/**
 * 从边数据构建用户关系网络（节点、边、统计信息）
 */
export async function buildNetworkFromEdges(
  edgesData: any[],
  type: UserRelationType,
  manager: any
): Promise<UserRelationNetwork> {
  if (edgesData.length === 0) {
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
  edgesData.forEach((edge) => {
    userIds.add(edge.source_user_id);
    userIds.add(edge.target_user_id);
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

  const nodes: UserRelationNode[] = Array.from(userIds).map((userId) => {
    const userData = usersMap.get(userId);
    if (!userData) {
      return {
        id: userId,
        name: `用户_${userId}`,
        followers: 0,
        influence: 0,
        postCount: 0,
        verified: false,
        userType: 'normal',
      };
    }

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
      userType: userData.user_type,
      location: userData.location,
    };
  });

  const edges: UserRelationEdge[] = edgesData.map((edge) => ({
    source: edge.source_user_id,
    target: edge.target_user_id,
    weight: parseInt(edge.weight),
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
