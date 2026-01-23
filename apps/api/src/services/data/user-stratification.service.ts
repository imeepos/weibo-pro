import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { UserRelationStatistics } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';

export interface UserStratificationLayer {
  name: 'core' | 'active' | 'casual' | 'lurker';
  count: number;
  percentage: number;
  avgEngagement: number;
  color: string;
}

export interface UserStratificationSummary {
  coreRatio: number;
  activeRatio: number;
  paretoIndex: number;
}

export interface UserStratification {
  layers: UserStratificationLayer[];
  engagementGini: number;
  totalUsers: number;
  summary: UserStratificationSummary;
}

// 分层阈值
const THRESHOLDS = {
  core: 10,     // weight >= 10
  active: 3,    // weight >= 3
  casual: 1,    // weight >= 1
  lurker: 0,    // weight = 0
};

// 分层颜色
const LAYER_COLORS = {
  core: '#f59e0b',      // 琥珀色 - 核心用户
  active: '#3b82f6',    // 蓝色 - 活跃用户
  casual: '#10b981',    // 绿色 - 普通用户
  lurker: '#6b7280',    // 灰色 - 潜水用户
};

@Injectable({ providedIn: 'root' })
export class UserStratificationService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  /**
   * 计算基尼系数
   * 用于衡量用户互动的不平等程度
   * 0 = 完全平等，1 = 完全不平等
   */
  private calculateGiniCoefficient(weights: number[]): number {
    if (weights.length === 0) return 0;

    const n = weights.length;
    if (n === 1) return 0;

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // 如果总权重为 0，返回 0（完全平等）
    if (totalWeight === 0) return 0;

    // 使用相对平均差计算基尼系数
    let sumAbsoluteDifferences = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumAbsoluteDifferences += Math.abs(weights[i]! - weights[j]!);
      }
    }

    // G = (sum of absolute differences) / (2 * n^2 * mean)
    // mean = totalWeight / n
    // G = (sum of absolute differences) / (2 * n * totalWeight)
    const gini = sumAbsoluteDifferences / (2 * n * totalWeight);

    return Math.max(0, Math.min(1, gini));
  }

  /**
   * 计算帕累托指数
   * 计算前 20% 用户贡献的互动占比
   */
  private calculateParetoIndex(weights: number[]): number {
    if (weights.length === 0) return 0;

    const sortedWeights = [...weights].sort((a, b) => b - a);
    const totalWeight = sortedWeights.reduce((sum, w) => sum + w, 0);

    if (totalWeight === 0) return 0;

    // 计算前 20% 的用户数量
    const topUserCount = Math.ceil(sortedWeights.length * 0.2);
    const topWeight = sortedWeights.slice(0, topUserCount).reduce((sum, w) => sum + w, 0);

    return topWeight / totalWeight;
  }

  /**
   * 根据权重对用户进行分层
   */
  private stratifyUsers(userWeights: number[]): UserStratificationLayer[] {
    const layers = {
      core: { count: 0, totalWeight: 0, name: 'core' as const },
      active: { count: 0, totalWeight: 0, name: 'active' as const },
      casual: { count: 0, totalWeight: 0, name: 'casual' as const },
      lurker: { count: 0, totalWeight: 0, name: 'lurker' as const },
    };

    // 分层统计
    for (const weight of userWeights) {
      if (weight >= THRESHOLDS.core) {
        layers.core.count++;
        layers.core.totalWeight += weight;
      } else if (weight >= THRESHOLDS.active) {
        layers.active.count++;
        layers.active.totalWeight += weight;
      } else if (weight >= THRESHOLDS.casual) {
        layers.casual.count++;
        layers.casual.totalWeight += weight;
      } else {
        layers.lurker.count++;
        layers.lurker.totalWeight += weight;
      }
    }

    const totalUsers = userWeights.length;
    const result: UserStratificationLayer[] = [];

    // 构建分层结果
    for (const layerName of ['core', 'active', 'casual', 'lurker'] as const) {
      const layer = layers[layerName];
      const avgEngagement = layer.count > 0 ? layer.totalWeight / layer.count : 0;

      result.push({
        name: layerName,
        count: layer.count,
        percentage: totalUsers > 0 ? (layer.count / totalUsers) * 100 : 0,
        avgEngagement,
        color: LAYER_COLORS[layerName],
      });
    }

    return result;
  }

  /**
   * 获取用户参与度分层结果
   */
  async getUserStratification(eventId: string): Promise<UserStratification> {
    const cacheKey = CacheService.buildKey('user:stratification', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchUserStratification(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchUserStratification(eventId: string): Promise<UserStratification> {
    return useEntityManager(async (manager) => {
      // 查询用户互动权重总和
      const userStats = await manager
        .getRepository(UserRelationStatistics)
        .createQueryBuilder('relation')
        .select('relation.targetUserId', 'target_user_id')
        .addSelect('SUM(relation.weight)', 'total_weight')
        .where('relation.eventId = :eventId', { eventId })
        .groupBy('relation.targetUserId')
        .orderBy('total_weight', 'DESC')
        .getRawMany();

      if (userStats.length === 0) {
        return this.getDefaultStratification();
      }

      // 提取用户权重
      const userWeights = userStats.map((stat: any) => parseInt(stat.total_weight) || 0);

      // 计算基尼系数
      const engagementGini = this.calculateGiniCoefficient(userWeights);

      // 计算分层
      const layers = this.stratifyUsers(userWeights);

      // 计算统计指标
      const totalUsers = userWeights.length;
      const coreLayer = layers.find(l => l.name === 'core');
      const activeLayer = layers.find(l => l.name === 'active');

      const coreRatio = totalUsers > 0 ? (coreLayer!.count / totalUsers) : 0;
      const activeRatio = totalUsers > 0 ? ((coreLayer!.count + activeLayer!.count) / totalUsers) : 0;
      const paretoIndex = this.calculateParetoIndex(userWeights);

      return {
        layers,
        engagementGini,
        totalUsers,
        summary: {
          coreRatio,
          activeRatio,
          paretoIndex,
        },
      };
    });
  }

  /**
   * 获取默认分层结构（空数据）
   */
  private getDefaultStratification(): UserStratification {
    return {
      layers: [
        { name: 'core', count: 0, percentage: 0, avgEngagement: 0, color: LAYER_COLORS.core },
        { name: 'active', count: 0, percentage: 0, avgEngagement: 0, color: LAYER_COLORS.active },
        { name: 'casual', count: 0, percentage: 0, avgEngagement: 0, color: LAYER_COLORS.casual },
        { name: 'lurker', count: 0, percentage: 0, avgEngagement: 0, color: LAYER_COLORS.lurker },
      ],
      engagementGini: 0,
      totalUsers: 0,
      summary: {
        coreRatio: 0,
        activeRatio: 0,
        paretoIndex: 0,
      },
    };
  }
}
