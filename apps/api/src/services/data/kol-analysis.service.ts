import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { WeiboUserEntity, UserRelationStatistics } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';

export interface KOLData {
  userId: string;
  screenName: string;
  influenceScore: number;
  followers: number;
  engagementRate: number;
  sentimentImpact: number;
}

export interface KOLAnalysisResult {
  topKOLs: KOLData[];
  kolContributionRatio: number;
  paretoIndex: number;
}

export interface UserEngagementData {
  totalReposts: number;
  totalComments: number;
  totalLikes: number;
  totalPosts: number;
  followersCount?: number;
}

export interface SentimentData {
  positivePosts: number;
  negativePosts: number;
  totalPosts: number;
  avgSentiment: number;
}

@Injectable({ providedIn: 'root' })
export class KOLAnalysisService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  /**
   * 计算影响力得分
   * influenceScore = log(followers) * 0.3 + (reposts + comments + likes) / posts * 0.4 + verifiedBonus * 0.3
   */
  calculateInfluenceScore(
    user: Partial<WeiboUserEntity>,
    engagement: UserEngagementData
  ): number {
    const followers = user.followers_count || 0;
    const verified = user.verified || false;
    const { totalReposts, totalComments, totalLikes, totalPosts } = engagement;

    // log(followers) * 0.3
    const followerScore = followers > 0 ? Math.log10(followers) * 0.3 : 0;

    // (reposts + comments + likes) / posts * 0.4
    const engagementScore = totalPosts > 0
      ? ((totalReposts + totalComments + totalLikes) / totalPosts) * 0.4
      : 0;

    // verifiedBonus * 0.3
    const verifiedScore = verified ? 0.3 : 0;

    return followerScore + engagementScore + verifiedScore;
  }

  /**
   * 计算互动率
   * engagementRate = (reposts + comments + likes) / (posts * followers)
   */
  calculateEngagementRate(engagement: UserEngagementData): number {
    const { totalReposts, totalComments, totalLikes, totalPosts, followersCount } = engagement;

    if (!followersCount || followersCount === 0 || totalPosts === 0) {
      return 0;
    }

    const totalEngagement = totalReposts + totalComments + totalLikes;
    return totalEngagement / (totalPosts * followersCount);
  }

  /**
   * 计算帕累托指数
   * 计算前 percentage 比例的用户贡献了多少百分比的互动
   */
  calculateParetoIndex(
    users: Array<{ userId: string; totalEngagement: number }>,
    percentage: number = 0.2
  ): number {
    if (users.length === 0) {
      return 0;
    }

    // 按互动量降序排序
    const sortedUsers = [...users].sort((a, b) => b.totalEngagement - a.totalEngagement);

    // 计算总互动量
    const totalEngagement = sortedUsers.reduce((sum, user) => sum + user.totalEngagement, 0);

    if (totalEngagement === 0) {
      return 0;
    }

    // 计算前 percentage 的用户数量
    const topUserCount = Math.ceil(sortedUsers.length * percentage);

    // 计算前 topUserCount 个用户的互动量
    const topEngagement = sortedUsers
      .slice(0, topUserCount)
      .reduce((sum, user) => sum + user.totalEngagement, 0);

    return topEngagement / totalEngagement;
  }

  /**
   * 计算情感影响力
   * 基于正面和负面帖子的比例计算情感影响力分数
   */
  calculateSentimentImpact(sentiment: SentimentData): number {
    if (sentiment.totalPosts === 0) {
      return 0;
    }

    // 计算情感倾向：-1 (完全负面) 到 1 (完全正面)
    const positiveRatio = sentiment.positivePosts / sentiment.totalPosts;
    const negativeRatio = sentiment.negativePosts / sentiment.totalPosts;

    return positiveRatio - negativeRatio;
  }

  /**
   * 获取 KOL 分析结果
   */
  async getKOLAnalysis(eventId: string): Promise<KOLAnalysisResult> {
    const cacheKey = CacheService.buildKey('kol:analysis', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchKOLAnalysis(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchKOLAnalysis(eventId: string): Promise<KOLAnalysisResult> {
    return useEntityManager(async (manager) => {
      // 查询用户互动统计
      const userStats = await manager
        .getRepository(WeiboUserEntity)
        .createQueryBuilder('user')
        .select('user.id', 'user_id')
        .addSelect('user.screen_name', 'screen_name')
        .addSelect('user.followers_count', 'followers_count')
        .addSelect('user.verified', 'verified')
        .addSelect('COALESCE(SUM(CASE WHEN relation.relation_type = :repost THEN relation.weight ELSE 0 END), 0)', 'total_reposts')
        .addSelect('COALESCE(SUM(CASE WHEN relation.relation_type = :comment THEN relation.weight ELSE 0 END), 0)', 'total_comments')
        .addSelect('COALESCE(SUM(CASE WHEN relation.relation_type = :like THEN relation.weight ELSE 0 END), 0)', 'total_likes')
        .leftJoin(
          UserRelationStatistics,
          'relation',
          'relation.targetUserId = user.id AND relation.eventId = :eventId'
        )
        .where('relation.eventId = :eventId')
        .groupBy('user.id')
        .orderBy('total_reposts', 'DESC')
        .setParameter('repost', 'repost')
        .setParameter('comment', 'comment')
        .setParameter('like', 'like')
        .setParameter('eventId', eventId)
        .limit(100)
        .getRawMany();

      if (userStats.length === 0) {
        return {
          topKOLs: [],
          kolContributionRatio: 0,
          paretoIndex: 0,
        };
      }

      // 计算每个用户的影响力和互动率
      const kolData: KOLData[] = userStats.map((stat: any) => {
        const user: Partial<WeiboUserEntity> = {
          id: stat.user_id,
          screen_name: stat.screen_name,
          followers_count: stat.followers_count,
          verified: stat.verified,
        };

        const engagement: UserEngagementData = {
          totalReposts: parseInt(stat.total_reposts) || 0,
          totalComments: parseInt(stat.total_comments) || 0,
          totalLikes: parseInt(stat.total_likes) || 0,
          totalPosts: parseInt(stat.total_reposts) + parseInt(stat.total_comments) + parseInt(stat.total_likes) || 0,
          followersCount: stat.followers_count,
        };

        const influenceScore = this.calculateInfluenceScore(user, engagement);
        const engagementRate = this.calculateEngagementRate(engagement);

        // 情感影响力（暂时设为 0，后续可接入 NLP 数据）
        const sentimentImpact = this.calculateSentimentImpact({
          positivePosts: 0,
          negativePosts: 0,
          totalPosts: 0,
          avgSentiment: 0,
        });

        return {
          userId: stat.user_id,
          screenName: stat.screen_name,
          influenceScore,
          followers: stat.followers_count,
          engagementRate,
          sentimentImpact,
        };
      });

      // 按影响力得分排序
      kolData.sort((a, b) => b.influenceScore - a.influenceScore);

      // 计算帕累托指数（前 20% 用户）
      const paretoData = kolData.map(kol => ({
        userId: kol.userId,
        totalEngagement: kol.influenceScore,
      }));
      const paretoIndex = this.calculateParetoIndex(paretoData, 0.2);

      // 计算 KOL 贡献占比（前 20% 用户的影响力占比）
      const topKOLCount = Math.ceil(kolData.length * 0.2);
      const topKOLEngagement = kolData
        .slice(0, topKOLCount)
        .reduce((sum, kol) => sum + kol.influenceScore, 0);
      const totalEngagement = kolData.reduce((sum, kol) => sum + kol.influenceScore, 0);
      const kolContributionRatio = totalEngagement > 0 ? topKOLEngagement / totalEngagement : 0;

      // 只返回前 50 个 KOL
      return {
        topKOLs: kolData.slice(0, 50),
        kolContributionRatio,
        paretoIndex,
      };
    });
  }
}
