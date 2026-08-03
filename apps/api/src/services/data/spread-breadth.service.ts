import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { WeiboRepostEntity, WeiboPostEntity, WeiboUserEntity } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type { SpreadBreadthAnalysis } from '@sker/sdk';
import { calculateSpreadDepth, calculateSpreadWidth, calculateBreadthIndex } from './spread-breadth.metrics';
import { buildPropagationPaths } from './spread-breadth.paths';
import { buildSpreadTimeline } from './spread-breadth.timeline';
import { calculateUserTypeDistribution } from './spread-breadth.user-type';
import { buildAggregatedPropagation } from './spread-breadth.aggregation';
import { getDefaultBreadthAnalysis } from './spread-breadth.default';

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
          return getDefaultBreadthAnalysis();
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
          return getDefaultBreadthAnalysis();
        }

        // 构建转发链映射
        const repostMap = new Map<string, typeof reposts[0]>();
        for (const repost of reposts) {
          repostMap.set(repost.repostId, repost);
        }

        // 计算传播深度和层级
        const { depth, leveledReposts } = calculateSpreadDepth(reposts, repostMap, postIds);

        // 计算统计指标
        const uniqueReposters = new Set(reposts.map((r) => String(r.userId))).size;
        const totalReposts = reposts.length;
        const spreadWidth = calculateSpreadWidth(leveledReposts);
        const breadthIndex = calculateBreadthIndex(
          uniqueReposters,
          totalReposts,
          depth,
          spreadWidth
        );

        // 构建传播路径（限制数量防止性能问题），传入帖子作者映射
        const propagationPaths = buildPropagationPaths(leveledReposts, 500, postAuthorMap);

        // 生成传播时间线
        const spreadTimeline = buildSpreadTimeline(reposts);

        // 按用户类型统计
        const repostByUserType = calculateUserTypeDistribution(reposts);

        // 构建聚合传播数据
        const aggregatedPropagation = buildAggregatedPropagation(leveledReposts, postAuthorMap);

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
      return getDefaultBreadthAnalysis();
    }
  }
}
