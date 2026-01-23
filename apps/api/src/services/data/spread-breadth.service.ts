import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { WeiboRepostEntity, WeiboPostEntity, WeiboUserEntity } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type {
  SpreadBreadthAnalysis,
  PropagationPath,
  SpreadTimelinePoint,
  UserTypeDistribution,
  AggregatedPropagation,
  AggregatedNode,
  LevelStats,
  TopUser,
} from '@sker/sdk';

@Injectable({ providedIn: 'root' })
export class SpreadBreadthService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getBreadthAnalysis(eventId: string): Promise<SpreadBreadthAnalysis> {
    const cacheKey = CacheService.buildKey('spread:breadth', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchBreadthAnalysis(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchBreadthAnalysis(eventId: string): Promise<SpreadBreadthAnalysis> {
    try {
      return await useEntityManager(async (manager) => {
        // 查询事件相关的所有帖子，并关联作者信息
        const posts = await manager
          .getRepository(WeiboPostEntity)
          .createQueryBuilder('post')
          .select('post.id', 'postId')
          .addSelect('postUser.screen_name', 'postAuthorName')
          .leftJoin(WeiboUserEntity, 'postUser', 'postUser.id = post.user_id')
          .where('post.event_id = :eventId', { eventId })
          .getRawMany<{ postId: string; postAuthorName: string }>();

        if (posts.length === 0) {
          return this.getDefaultBreadthAnalysis();
        }

        const postIds = posts.map((p) => String(p.postId));

        // 创建帖子ID到作者名称的映射
        const postAuthorMap = new Map<string, string>();
        for (const post of posts) {
          postAuthorMap.set(String(post.postId), post.postAuthorName || `帖子${post.postId}`);
        }

        // 查询所有转发记录，并关联用户信息
        const reposts = await manager
          .getRepository(WeiboRepostEntity)
          .createQueryBuilder('repost')
          .select('repost.post_id', 'postId')
          .addSelect('repost.id', 'repostId')
          .addSelect('repost.user_id', 'userId')
          .addSelect('user.screen_name', 'screenName')
          .addSelect('user.class', 'userClass')
          .addSelect('user.verified', 'verified')
          .addSelect('repost.created_at', 'createdAt')
          .innerJoin(WeiboUserEntity, 'user', 'user.id = repost.user_id')
          .where('repost.post_id IN (:...postIds)', { postIds })
          .orderBy('repost.created_at', 'ASC')
          .getRawMany();

        if (reposts.length === 0) {
          return this.getDefaultBreadthAnalysis();
        }

        // 构建转发链映射
        const repostMap = new Map<string, typeof reposts[0]>();
        for (const repost of reposts) {
          repostMap.set(repost.repostId, repost);
        }

        // 计算传播深度和层级
        const { depth, leveledReposts } = this.calculateSpreadDepth(reposts, repostMap, postIds);

        // 计算统计指标
        const uniqueReposters = new Set(reposts.map((r) => String(r.userId))).size;
        const totalReposts = reposts.length;
        const spreadWidth = this.calculateSpreadWidth(leveledReposts);
        const breadthIndex = this.calculateBreadthIndex(
          uniqueReposters,
          totalReposts,
          depth,
          spreadWidth
        );

        // 构建传播路径（限制数量防止性能问题），传入帖子作者映射
        const propagationPaths = this.buildPropagationPaths(leveledReposts, 500, postAuthorMap);

        // 生成传播时间线
        const spreadTimeline = this.buildSpreadTimeline(reposts);

        // 按用户类型统计
        const repostByUserType = this.calculateUserTypeDistribution(reposts);

        // 构建聚合传播数据
        const aggregatedPropagation = this.buildAggregatedPropagation(leveledReposts, postAuthorMap);

        return {
          totalReposts,
          uniqueReposters,
          spreadDepth: depth,
          spreadWidth,
          breadthIndex,
          propagationPaths,
          spreadTimeline,
          repostByUserType,
          aggregatedPropagation,
        };
      });
    } catch (error) {
      console.error('Error in SpreadBreadthService:', error);
      return this.getDefaultBreadthAnalysis();
    }
  }

  /**
   * 计算传播深度和层级
   */
  private calculateSpreadDepth(
    reposts: Array<any>,
    repostMap: Map<string, any>,
    postIds: string[]
  ): { depth: number; leveledReposts: Array<any & { level: number }> } {
    // 构建子转发映射（每个转发被哪些人转发）
    const childrenMap = new Map<string, string[]>();
    for (const repost of reposts) {
      const postId = String(repost.postId);
      if (!childrenMap.has(postId)) {
        childrenMap.set(postId, []);
      }
      childrenMap.get(postId)!.push(String(repost.repostId));
    }

    // BFS 计算层级
    const visited = new Set<string>();
    const queue: Array<{ postId: string; level: number }> = [];
    const leveledReposts: Array<any & { level: number; rootPostId: string }> = [];

    // 找到所有根转发（直接转发原始帖子的）
    for (const repost of reposts) {
      const postId = String(repost.postId);
      // 检查是否是转发原始帖子
      if (postIds.includes(postId)) {
        queue.push({ postId: String(repost.repostId), level: 1 });
        visited.add(String(repost.repostId));
      }
    }

    // 如果没有找到根转发，所有转发都是第一层
    if (queue.length === 0) {
      for (const repost of reposts) {
        queue.push({ postId: String(repost.repostId), level: 1 });
        visited.add(String(repost.repostId));
      }
    }

    let maxDepth = 0;
    const rootPostId = reposts[0]?.postId || 'unknown';

    while (queue.length > 0) {
      const { postId, level } = queue.shift()!;
      maxDepth = Math.max(maxDepth, level);

      const repost = repostMap.get(postId);
      if (repost) {
        leveledReposts.push({
          ...repost,
          level,
          rootPostId,
        });
      }

      // 添加子节点
      const children = childrenMap.get(postId) || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push({ postId: childId, level: level + 1 });
        }
      }
    }

    return { depth: maxDepth, leveledReposts };
  }

  /**
   * 计算传播宽度（每层平均转发数）
   */
  private calculateSpreadWidth(leveledReposts: Array<any & { level: number }>): number {
    if (leveledReposts.length === 0) return 0;

    // 统计每层的转发数
    const levelCounts = new Map<number, number>();
    for (const repost of leveledReposts) {
      const level = repost.level;
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    }

    // 计算平均宽度
    const totalLevels = levelCounts.size;
    if (totalLevels === 0) return 0;

    const totalCount = leveledReposts.length;
    return totalCount / totalLevels;
  }

  /**
   * 计算传播广度指数
   * breadthIndex = (uniqueReposters / totalReposts) * 0.3
   *              + (spreadDepth / maxDepth) * 0.3
   *              + (spreadWidth / avgWidth) * 0.4
   */
  private calculateBreadthIndex(
    uniqueReposters: number,
    totalReposts: number,
    spreadDepth: number,
    spreadWidth: number
  ): number {
    // 假设最大深度为 10，平均宽度为 5
    const maxDepth = 10;
    const avgWidth = 5;

    const coverageRatio = totalReposts > 0 ? uniqueReposters / totalReposts : 0;
    const depthRatio = maxDepth > 0 ? Math.min(spreadDepth / maxDepth, 1) : 0;
    const widthRatio = avgWidth > 0 ? Math.min(spreadWidth / avgWidth, 1) : 0;

    return coverageRatio * 0.3 + depthRatio * 0.3 + widthRatio * 0.4;
  }

  /**
   * 构建传播路径
   */
  private buildPropagationPaths(
    leveledReposts: Array<any & { level: number; rootPostId: string }>,
    maxPaths: number,
    postAuthorMap: Map<string, string>
  ): PropagationPath[] {
    const paths: PropagationPath[] = [];
    const limit = Math.min(leveledReposts.length, maxPaths);

    for (let i = 0; i < limit; i++) {
      const repost = leveledReposts[i];
      // 使用帖子作者名称而不是帖子ID
      const postAuthor = postAuthorMap.get(String(repost.postId)) || `帖子${repost.postId}`;
      // 使用 screenName 而不是 userId，如果没有 screenName 则使用 userId 作为后备
      const userName = repost.screenName || `用户${repost.userId}`;
      paths.push({
        source: postAuthor,
        target: userName,
        weight: 1, // 可以根据需要计算权重
        level: repost.level,
      });
    }

    return paths;
  }

  /**
   * 构建传播时间线
   */
  private buildSpreadTimeline(reposts: Array<any>): SpreadTimelinePoint[] {
    if (reposts.length === 0) return [];

    // 按时间排序
    const sortedReposts = [...reposts].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // 按小时聚合
    const timelineMap = new Map<string, number>();
    for (const repost of sortedReposts) {
      const date = new Date(repost.createdAt);
      const hourKey = date.toISOString().slice(0, 13) + ':00:00';
      timelineMap.set(hourKey, (timelineMap.get(hourKey) || 0) + 1);
    }

    // 生成时间线
    const timeline: SpreadTimelinePoint[] = [];
    let cumulative = 0;
    for (const [timestamp, count] of timelineMap.entries()) {
      cumulative += count;
      timeline.push({ timestamp, count, cumulative });
    }

    return timeline;
  }

  /**
   * 计算用户类型分布
   */
  private calculateUserTypeDistribution(reposts: Array<any>): UserTypeDistribution[] {
    const typeCounts = {
      vip: 0,
      ordinary: 0,
      verified: 0,
    };

    for (const repost of reposts) {
      const userClass = repost.userClass;
      const verified = repost.verified;

      if (verified) {
        typeCounts.verified++;
      } else if (userClass === 1 || userClass === 2) {
        typeCounts.vip++;
      } else {
        typeCounts.ordinary++;
      }
    }

    const total = reposts.length;
    if (total === 0) {
      return [
        { type: 'vip', count: 0, percentage: 0 },
        { type: 'ordinary', count: 0, percentage: 0 },
        { type: 'verified', count: 0, percentage: 0 },
      ];
    }

    return [
      {
        type: 'vip',
        count: typeCounts.vip,
        percentage: (typeCounts.vip / total) * 100,
      },
      {
        type: 'ordinary',
        count: typeCounts.ordinary,
        percentage: (typeCounts.ordinary / total) * 100,
      },
      {
        type: 'verified',
        count: typeCounts.verified,
        percentage: (typeCounts.verified / total) * 100,
      },
    ];
  }

  /**
   * 返回默认的空数据结构
   */
  private getDefaultBreadthAnalysis(): SpreadBreadthAnalysis {
    return {
      totalReposts: 0,
      uniqueReposters: 0,
      spreadDepth: 0,
      spreadWidth: 0,
      breadthIndex: 0,
      propagationPaths: [],
      spreadTimeline: [],
      repostByUserType: [
        { type: 'vip', count: 0, percentage: 0 },
        { type: 'ordinary', count: 0, percentage: 0 },
        { type: 'verified', count: 0, percentage: 0 },
      ],
    };
  }

  /**
   * 用户类型名称映射
   */
  private readonly userTypeNameMap: Record<string, string> = {
    vip: 'VIP用户',
    ordinary: '普通用户',
    verified: '认证用户',
  };

  /**
   * 获取用户类型
   */
  private getUserType(repost: any): 'vip' | 'ordinary' | 'verified' {
    if (repost.verified) {
      return 'verified';
    } else if (repost.userClass === 1 || repost.userClass === 2) {
      return 'vip';
    }
    return 'ordinary';
  }

  /**
   * 构建聚合传播数据
   * @param leveledReposts 带层级的转发数据
   * @param postAuthorMap 帖子作者映射
   * @returns 聚合传播数据
   */
  private buildAggregatedPropagation(
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

    // 获取源节点（帖子作者）
    const rootPostId = leveledReposts[0]?.rootPostId;
    const sourceAuthor = postAuthorMap.get(rootPostId) || `帖子${rootPostId}`;
    const sourceNodeId = `source_${rootPostId}`;

    // 添加源节点
    nodes.push({
      id: sourceNodeId,
      name: sourceAuthor,
      type: 'source',
      level: 0,
      count: 1,
      totalWeight: leveledReposts.length,
    });

    // 2. 处理每个层级
    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
    let totalNodesCount = 1; // 源节点已经算1个
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
        const userType = this.getUserType(repost);
        typeGroups[userType].push(repost);
      }

      // 计算层级统计
      const levelStat: LevelStats = {
        level,
        totalUsers: levelReposts.length,
        totalReposts: levelReposts.length,
        byUserType: {
          vip: { count: typeGroups.vip.length, reposts: typeGroups.vip.length },
          ordinary: { count: typeGroups.ordinary.length, reposts: typeGroups.ordinary.length },
          verified: { count: typeGroups.verified.length, reposts: typeGroups.verified.length },
        },
      };
      levelStats.push(levelStat);

      // 获取该层 Top N 用户（按 followers 或 weight 排序）
      const sortedByInfluence = [...levelReposts].sort((a, b) => {
        const aFollowers = a.followers || 0;
        const bFollowers = b.followers || 0;
        return bFollowers - aFollowers;
      });
      const topUsers = sortedByInfluence.slice(0, maxTopUsersPerLevel);

      // 为每种用户类型创建聚合节点
      for (const [userType, reposts] of Object.entries(typeGroups)) {
        if (reposts.length === 0 || totalNodesCount >= maxNodes) continue;

        const typeName = this.userTypeNameMap[userType];
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
          // 第一层连接到源节点
          links.push({
            source: sourceNodeId,
            target: nodeId,
            weight: reposts.length,
            level,
          });
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
}
