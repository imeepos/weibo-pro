import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { UserRelationStatistics } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type { CommunityAnalysis } from '@sker/sdk';
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';

@Injectable({ providedIn: 'root' })
export class CommunityDetectionService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getCommunityAnalysis(eventId: string): Promise<CommunityAnalysis> {
    const cacheKey = CacheService.buildKey('community:detection', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchCommunityAnalysis(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchCommunityAnalysis(eventId: string): Promise<CommunityAnalysis> {
    return useEntityManager(async (manager) => {
      // 查询所有关系边（聚合相同用户对的关系）
      const relations = await manager
        .getRepository(UserRelationStatistics)
        .createQueryBuilder('relation')
        .select('relation.sourceUserId', 'sourceUserId')
        .addSelect('relation.targetUserId', 'targetUserId')
        .addSelect('SUM(relation.weight)', 'totalWeight')
        .where('relation.eventId = :eventId', { eventId })
        .groupBy('relation.sourceUserId, relation.targetUserId')
        .getRawMany();

      if (relations.length === 0) {
        return this.getDefaultCommunityAnalysis();
      }

      // 构建图结构
      const graph = new Graph();
      const userIdToScreenName = new Map<string, string>();

      // 添加节点和边
      for (const relation of relations) {
        const sourceId = relation.sourceUserId;
        const targetId = relation.targetUserId;
        const weight = parseInt(relation.totalWeight) || 0;

        // 添加节点（如果不存在）
        if (!graph.hasNode(sourceId)) {
          graph.addNode(sourceId, { screenName: sourceId });
          userIdToScreenName.set(sourceId, sourceId);
        }
        if (!graph.hasNode(targetId)) {
          graph.addNode(targetId, { screenName: targetId });
          userIdToScreenName.set(targetId, targetId);
        }

        // 添加边（避免重复）
        if (!graph.hasEdge(sourceId, targetId)) {
          graph.addEdge(sourceId, targetId, { weight });
        }
      }

      // 使用 Louvain 算法检测社区
      const communityAssignments = louvain(graph);
      const communities = this.buildCommunities(graph, communityAssignments);
      const interCommunityLinks = this.findInterCommunityLinks(graph, communityAssignments);
      const bridgeUsers = this.identifyBridgeUsers(graph, communityAssignments);

      // 计算模块度
      let modularity = 0;
      try {
        modularity = louvain.modularity(graph, {
          nodeCommunityAttribute: 'community',
          getCommunities: () => communityAssignments,
        } as any);
      } catch (e) {
        // 如果 modularity 计算失败，使用默认值
        modularity = 0;
      }

      return {
        communities,
        modularity,
        totalCommunities: communities.length,
        interCommunityLinks,
        bridgeUsers,
      };
    });
  }

  private buildCommunities(graph: Graph, assignments: Record<string, number>) {
    // 按社区分组用户
    const communityGroups = new Map<number, string[]>();

    graph.forEachNode((node) => {
      const communityId = assignments[node];
      if (!communityGroups.has(communityId)) {
        communityGroups.set(communityId, []);
      }
      communityGroups.get(communityId)!.push(node);
    });

    // 构建社区对象
    const communities = Array.from(communityGroups.entries()).map(([communityId, members]) => {
      const communityNodes = members.map((memberId) => graph.getNodeAttributes(memberId));

      // 计算社区内部边数
      let internalEdges = 0;
      members.forEach((memberId) => {
        graph.forEachNeighbor(memberId, (neighbor) => {
          if (members.includes(neighbor) && memberId < neighbor) {
            internalEdges++;
          }
        });
      });

      // 计算社区密度
      const size = members.length;
      const maxPossibleEdges = (size * (size - 1)) / 2;
      const density = maxPossibleEdges > 0 ? internalEdges / maxPossibleEdges : 0;

      // 计算平均影响力（基于度数）
      let totalInfluence = 0;
      const memberDetails = members.map((userId) => {
        const inDegree = graph.inDegree(userId);
        const outDegree = graph.outDegree(userId);
        const totalDegree = inDegree + outDegree;

        // 计算影响力得分
        const influenceScore = size > 1 ? totalDegree / (size - 1) : 0;
        totalInfluence += influenceScore;

        // 分类用户角色
        let role: 'leader' | 'active' | 'peripheral';
        if (inDegree + outDegree === 0) {
          role = 'peripheral';
        } else if (inDegree + outDegree >= size * 0.8) {
          role = 'leader';
        } else if (inDegree + outDegree >= size * 0.5) {
          role = 'active';
        } else {
          role = 'peripheral';
        }

        return {
          userId,
          screenName: graph.getNodeAttribute(userId, 'screenName') as string,
          role,
          inDegree,
          outDegree,
        };
      });

      // 按影响力排序，取前10%作为 leader
      memberDetails.sort((a, b) => (b.inDegree + b.outDegree) - (a.inDegree + a.outDegree));
      const leaderCount = Math.max(1, Math.ceil(members.length * 0.1));
      memberDetails.forEach((member, index) => {
        if (index < leaderCount) {
          member.role = 'leader';
        } else if (index < members.length * 0.5) {
          member.role = 'active';
        } else {
          member.role = 'peripheral';
        }
      });

      return {
        id: `community-${communityId}`,
        name: `Community ${communityId + 1}`,
        members: memberDetails,
        size,
        density,
        avgInfluence: size > 0 ? totalInfluence / size : 0,
        topKeywords: [], // TODO: 从 WeiboCommentEntity 提取关键词
        sentiment: { positive: 0, negative: 0, neutral: 0 }, // TODO: 计算情感分布
      };
    });

    return communities;
  }

  private findInterCommunityLinks(
    graph: Graph,
    assignments: Record<string, number>
  ): Array<{ sourceCommunity: string; targetCommunity: string; weight: number }> {
    const linksMap = new Map<string, number>();

    graph.forEachEdge((edge, attributes, source, target) => {
      const sourceCommunity = `community-${assignments[source]}`;
      const targetCommunity = `community-${assignments[target]}`;

      // 只记录跨社区的边
      if (sourceCommunity !== targetCommunity) {
        const linkKey = `${sourceCommunity}-${targetCommunity}`;
        const reverseKey = `${targetCommunity}-${sourceCommunity}`;
        const weight = attributes.weight as number;

        // 合并双向链接
        if (linksMap.has(linkKey)) {
          linksMap.set(linkKey, linksMap.get(linkKey)! + weight);
        } else if (linksMap.has(reverseKey)) {
          linksMap.set(reverseKey, linksMap.get(reverseKey)! + weight);
        } else {
          linksMap.set(linkKey, weight);
        }
      }
    });

    return Array.from(linksMap.entries()).map(([key, weight]) => {
      const [sourceCommunity, targetCommunity] = key.split('-');
      return { sourceCommunity, targetCommunity, weight };
    });
  }

  private identifyBridgeUsers(
    graph: Graph,
    assignments: Record<string, number>
  ): Array<{ userId: string; screenName: string; communities: string[]; bridgeScore: number }> {
    const bridgeUsers: Array<{
      userId: string;
      screenName: string;
      communities: string[];
      bridgeScore: number;
    }> = [];

    // 为每个用户计算跨社区连接
    graph.forEachNode((node) => {
      const connectedCommunities = new Set<number>([assignments[node]]);
      let totalEdges = 0;
      let crossCommunityEdges = 0;

      graph.forEachNeighbor(node, (neighbor) => {
        totalEdges++;
        const neighborCommunity = assignments[neighbor];
        if (neighborCommunity !== assignments[node]) {
          crossCommunityEdges++;
          connectedCommunities.add(neighborCommunity);
        }
      });

      // 如果用户连接到多个社区，则是桥接用户
      if (connectedCommunities.size > 1 && totalEdges > 0) {
        const bridgeScore = crossCommunityEdges / totalEdges;
        bridgeUsers.push({
          userId: node,
          screenName: graph.getNodeAttribute(node, 'screenName') as string,
          communities: Array.from(connectedCommunities).map((c) => `community-${c}`),
          bridgeScore,
        });
      }
    });

    // 按桥接得分排序
    return bridgeUsers.sort((a, b) => b.bridgeScore - a.bridgeScore);
  }

  private getDefaultCommunityAnalysis(): CommunityAnalysis {
    return {
      communities: [],
      modularity: 0,
      totalCommunities: 0,
      interCommunityLinks: [],
      bridgeUsers: [],
    };
  }
}
