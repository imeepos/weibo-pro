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

      // TODO: 实现网络分析逻辑
      return this.getDefaultCentralityAnalysis();
    });
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

