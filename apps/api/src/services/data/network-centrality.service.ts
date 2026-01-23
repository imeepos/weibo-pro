import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { UserRelationStatistics } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type { CentralityAnalysis } from '@sker/sdk';

@Injectable({ providedIn: 'root' })
export class NetworkCentralityService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getCentralityAnalysis(eventId: string): Promise<CentralityAnalysis> {
    const cacheKey = CacheService.buildKey('network:centrality', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchCentralityAnalysis(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchCentralityAnalysis(eventId: string): Promise<CentralityAnalysis> {
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
        return this.getDefaultCentralityAnalysis();
      }

      // 构建节点集合和边列表
      const nodeSet = new Set<string>();
      const edges: Array<{ source: string; target: string; weight: number }> = [];

      for (const relation of relations) {
        const sourceId = relation.sourceUserId;
        const targetId = relation.targetUserId;
        const weight = parseInt(relation.totalWeight) || 0;

        nodeSet.add(sourceId);
        nodeSet.add(targetId);

        edges.push({
          source: sourceId,
          target: targetId,
          weight,
        });
      }

      const nodeCount = nodeSet.size;
      const edgeCount = edges.length;

      // 计算每个节点的度数和加权度
      const nodeDegrees = new Map<string, number>();
      const nodeWeightedDegrees = new Map<string, number>();

      // 初始化
      for (const nodeId of nodeSet) {
        nodeDegrees.set(nodeId, 0);
        nodeWeightedDegrees.set(nodeId, 0);
      }

      // 统计度数
      for (const edge of edges) {
        nodeDegrees.set(edge.source, (nodeDegrees.get(edge.source) || 0) + 1);
        nodeDegrees.set(edge.target, (nodeDegrees.get(edge.target) || 0) + 1);
        nodeWeightedDegrees.set(edge.source, (nodeWeightedDegrees.get(edge.source) || 0) + edge.weight);
        nodeWeightedDegrees.set(edge.target, (nodeWeightedDegrees.get(edge.target) || 0) + edge.weight);
      }

      // 计算最大加权度
      const maxWeightedDegree = Math.max(...nodeWeightedDegrees.values());

      // 构建节点数据
      const nodes = Array.from(nodeSet).map(userId => {
        const degree = nodeDegrees.get(userId) || 0;
        const weightedDegree = nodeWeightedDegrees.get(userId) || 0;
        const degreeCentrality = nodeCount > 1 ? degree / (nodeCount - 1) : 0;
        const normalizedWeight = maxWeightedDegree > 0 ? weightedDegree / maxWeightedDegree : 0;
        const influenceScore = degreeCentrality * 0.4 + normalizedWeight * 0.6;
        const nodeSize = this.calculateNodeSize(influenceScore);

        return {
          userId,
          screenName: userId, // TODO: 从 weibo_user 表查询真实 screenName
          degreeCentrality,
          weightedDegree,
          influenceScore,
          nodeSize,
        };
      });

      // 计算网络统计
      const maxDegree = Math.max(...nodeDegrees.values());
      const avgDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;
      const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
      const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

      const networkStats = {
        nodeCount,
        edgeCount,
        avgDegree,
        maxDegree,
        density,
      };

      // Top 影响力用户（前10名）
      const topInfluencers = nodes
        .sort((a, b) => b.influenceScore - a.influenceScore)
        .slice(0, 10)
        .map((node, index) => ({
          userId: node.userId,
          screenName: node.screenName,
          score: node.influenceScore,
          rank: index + 1,
        }));

      return {
        nodes,
        edges,
        networkStats,
        topInfluencers,
      };
    });
  }

  private calculateNodeSize(influenceScore: number): number {
    // 将影响力得分映射到节点大小（5-50px）
    const minSize = 5;
    const maxSize = 50;
    return minSize + influenceScore * (maxSize - minSize);
  }

  private getDefaultCentralityAnalysis(): CentralityAnalysis {
    return {
      nodes: [],
      edges: [],
      networkStats: {
        nodeCount: 0,
        edgeCount: 0,
        avgDegree: 0,
        maxDegree: 0,
        density: 0,
      },
      topInfluencers: [],
    };
  }
}

