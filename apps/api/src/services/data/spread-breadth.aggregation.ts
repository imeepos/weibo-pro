import type {
  AggregatedPropagation,
  AggregatedNode,
  PropagationPath,
  LevelStats,
  TopUser,
} from '@sker/sdk';
import { getUserType, userTypeNameMap } from './spread-breadth.user-type';

/**
 * 构建聚合传播数据
 * @param leveledReposts 带层级的转发数据
 * @param postAuthorMap 帖子作者映射
 * @returns 聚合传播数据
 */
export function buildAggregatedPropagation(
  leveledReposts: Array<any & { level: number; rootPostId: string }>,
  postAuthorMap: Map<string, string>
): AggregatedPropagation {
  if (leveledReposts.length === 0) {
    return { nodes: [], links: [], levelStats: [] };
  }

  // 1. 按层级分组
  const levelGroups = new Map<number, typeof leveledReposts>();
  for (const repost of leveledReposts) {
    const level = repost.level;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(repost);
  }

  const nodes: AggregatedNode[] = [];
  const links: PropagationPath[] = [];
  const levelStats: LevelStats[] = [];

  // 获取所有唯一的源帖子（第一层转发的来源）
  const firstLevelReposts = levelGroups.get(1) || [];
  const uniqueSourcePosts = new Set<string>();
  for (const repost of firstLevelReposts) {
    uniqueSourcePosts.add(String(repost.rootPostId));
  }

  // 为每个源帖子创建源节点
  const sourceNodeIds: string[] = [];
  for (const postId of uniqueSourcePosts) {
    const sourceAuthor = postAuthorMap.get(postId) || `帖子${postId}`;
    const sourceNodeId = `source_${postId}`;
    sourceNodeIds.push(sourceNodeId);

    // 计算该帖子的转发数
    const postReposts = leveledReposts.filter((r) => String(r.rootPostId) === postId);

    nodes.push({
      id: sourceNodeId,
      name: sourceAuthor,
      type: 'source',
      level: 0,
      count: 1,
      totalWeight: postReposts.length,
    });
  }

  // 2. 处理每个层级
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  let totalNodesCount = nodes.length; // 源节点数量
  const maxNodes = 50;
  const maxTopUsersPerLevel = 3;
  const maxTopUsersInNode = 5;

  for (const level of sortedLevels) {
    if (totalNodesCount >= maxNodes) break;

    const levelReposts = levelGroups.get(level)!;

    // 按用户类型分组
    const typeGroups: Record<string, typeof levelReposts> = {
      vip: [],
      ordinary: [],
      verified: [],
    };

    for (const repost of levelReposts) {
      const userType = getUserType(repost);
      typeGroups[userType]!.push(repost);
    }

    // 计算层级统计
    const levelStat: LevelStats = {
      level,
      totalUsers: levelReposts.length,
      totalReposts: levelReposts.length,
      byUserType: {
        vip: { count: typeGroups?.vip?.length || 0, reposts: typeGroups?.vip?.length || 0 },
        ordinary: { count: typeGroups.ordinary?.length || 0, reposts: typeGroups.ordinary?.length || 0 },
        verified: { count: typeGroups.verified?.length || 0, reposts: typeGroups.verified?.length || 0 },
      },
    };
    levelStats.push(levelStat);

    // 获取该层 Top N 用户（按 followers 或 weight 排序）
    const sortedByInfluence = [...levelReposts].sort((a, b) => {
      const aFollowers = a.followers || 0;
      const bFollowers = b.followers || 0;
      return bFollowers - aFollowers;
    });
    const _topUsers = sortedByInfluence.slice(0, maxTopUsersPerLevel);

    // 为每种用户类型创建聚合节点
    for (const [userType, reposts] of Object.entries(typeGroups)) {
      if (reposts.length === 0 || totalNodesCount >= maxNodes) continue;

      const typeName = userTypeNameMap[userType];
      const nodeId = `aggregated_L${level}_${userType}`;

      // 获取该类型的 Top 用户
      const typeTopUsers: TopUser[] = reposts
        .sort((a, b) => (b.followers || 0) - (a.followers || 0))
        .slice(0, maxTopUsersInNode)
        .map((r) => ({
          userId: String(r.userId),
          screenName: r.screenName || `用户${r.userId}`,
          weight: 1,
          followers: r.followers,
        }));

      const aggregatedNode: AggregatedNode = {
        id: nodeId,
        name: `${typeName}(${reposts.length}人)`,
        type: 'aggregated',
        level,
        userType: userType as 'vip' | 'ordinary' | 'verified',
        count: reposts.length,
        totalWeight: reposts.length,
        topUsers: typeTopUsers,
      };

      nodes.push(aggregatedNode);
      totalNodesCount++;

      // 创建连线
      if (level === 1) {
        // 第一层：连接到所有源节点
        for (const sourceNodeId of sourceNodeIds) {
          links.push({
            source: sourceNodeId,
            target: nodeId,
            weight: Math.ceil(reposts.length / sourceNodeIds.length),
            level,
          });
        }
      } else {
        // 其他层连接到上一层的同类型聚合节点
        const prevNodeId = `aggregated_L${level - 1}_${userType}`;
        const prevNodeExists = nodes.some((n) => n.id === prevNodeId);
        if (prevNodeExists) {
          links.push({
            source: prevNodeId,
            target: nodeId,
            weight: reposts.length,
            level,
          });
        } else {
          // 如果上一层没有同类型节点，连接到源节点或上一层任意节点
          const anyPrevNode = nodes.find((n) => n.level === level - 1);
          if (anyPrevNode) {
            links.push({
              source: anyPrevNode.id,
              target: nodeId,
              weight: reposts.length,
              level,
            });
          }
        }
      }
    }
  }

  return { nodes, links, levelStats };
}
