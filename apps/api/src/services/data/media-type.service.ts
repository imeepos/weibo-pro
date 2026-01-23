import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { WeiboPostEntity } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type { MediaTypeAnalysis } from '@sker/sdk';

// 媒体类型定义
type MediaType = 'text' | 'image' | 'video' | 'link' | 'mixed';

@Injectable({ providedIn: 'root' })
export class MediaTypeService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getMediaTypeDistribution(eventId: string): Promise<MediaTypeAnalysis> {
    const cacheKey = CacheService.buildKey('media-type:distribution', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchMediaTypeDistribution(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchMediaTypeDistribution(eventId: string): Promise<MediaTypeAnalysis> {
    return useEntityManager(async (manager) => {
      // 查询所有相关帖子
      const posts = await manager
        .getRepository(WeiboPostEntity)
        .createQueryBuilder('post')
        .select([
          'post.id',
          'post.pic_ids',
          'post.page_info',
          'post.url_struct',
          'post.attitudes_count',
          'post.comments_count',
          'post.reposts_count',
          'post.created_at',
        ])
        .where('post.event_id = :eventId', { eventId })
        .getMany();

      if (posts.length === 0) {
        return this.getDefaultMediaTypeDistribution();
      }

      // 检测每个帖子的媒体类型
      const postsWithMediaType = posts.map(post => ({
        ...post,
        mediaType: this.detectMediaType(post),
      }));

      // 统计分布
      const distribution = this.calculateDistribution(postsWithMediaType);

      // 计算趋势（按小时）
      const trend = this.calculateTrend(postsWithMediaType);

      // 计算互动量分析
      const engagementByType = this.calculateEngagementByType(postsWithMediaType);

      return {
        distribution,
        totalPosts: posts.length,
        trend,
        engagementByType,
      };
    });
  }

  /**
   * 检测媒体类型
   * 优先级：video > mixed > image > link > text
   */
  private detectMediaType(post: WeiboPostEntity): MediaType {
    const hasImages = post.pic_ids && post.pic_ids.length > 0;
    const hasVideo = post.page_info?.type === 'video';
    const hasLink = post.url_struct && post.url_struct.length > 0;

    if (hasVideo) return 'video';
    if (hasImages && hasLink) return 'mixed';
    if (hasImages) return 'image';
    if (hasLink) return 'link';
    return 'text';
  }

  /**
   * 计算媒体类型分布
   */
  private calculateDistribution(posts: Array<{ mediaType: MediaType; attitudes_count: number; comments_count: number; reposts_count: number }>) {
    const typeStats = new Map<MediaType, { count: number; totalEngagement: number }>();

    // 初始化所有类型
    ['text', 'image', 'video', 'link', 'mixed'].forEach(type => {
      typeStats.set(type as MediaType, { count: 0, totalEngagement: 0 });
    });

    // 统计
    posts.forEach(post => {
      const stats = typeStats.get(post.mediaType)!;
      stats.count++;
      const engagement = post.attitudes_count + post.comments_count + post.reposts_count;
      stats.totalEngagement += engagement;
    });

    // 转换为结果数组
    const totalPosts = posts.length;
    return Array.from(typeStats.entries())
      .filter(([_, stats]) => stats.count > 0)
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        percentage: (stats.count / totalPosts) * 100,
        avgEngagement: stats.totalEngagement / stats.count,
      }));
  }

  /**
   * 计算时间趋势（按小时聚合）
   */
  private calculateTrend(posts: Array<{ mediaType: MediaType; created_at: Date | null }>) {
    const hourlyData = new Map<string, Map<MediaType, number>>();

    posts.forEach(post => {
      if (!post.created_at) return;

      const hourKey = new Date(post.created_at);
      hourKey.setMinutes(0, 0, 0);
      const timestamp = hourKey.toISOString();

      if (!hourlyData.has(timestamp)) {
        const typeMap = new Map<MediaType, number>();
        ['text', 'image', 'video', 'link', 'mixed'].forEach(type => {
          typeMap.set(type as MediaType, 0);
        });
        hourlyData.set(timestamp, typeMap);
      }

      const typeMap = hourlyData.get(timestamp)!;
      typeMap.set(post.mediaType, (typeMap.get(post.mediaType) || 0) + 1);
    });

    // 转换为结果数组并排序
    return Array.from(hourlyData.entries())
      .map(([timestamp, typeMap]) => ({
        timestamp,
        types: {
          text: typeMap.get('text') || 0,
          image: typeMap.get('image') || 0,
          video: typeMap.get('video') || 0,
          link: typeMap.get('link') || 0,
          mixed: typeMap.get('mixed') || 0,
        },
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * 计算各类型的平均互动量
   */
  private calculateEngagementByType(posts: Array<{
    mediaType: MediaType;
    attitudes_count: number;
    comments_count: number;
    reposts_count: number;
  }>) {
    const typeEngagement = new Map<MediaType, {
      totalLikes: number;
      totalComments: number;
      totalReposts: number;
      count: number;
    }>();

    // 初始化所有类型
    ['text', 'image', 'video', 'link', 'mixed'].forEach(type => {
      typeEngagement.set(type as MediaType, {
        totalLikes: 0,
        totalComments: 0,
        totalReposts: 0,
        count: 0,
      });
    });

    // 统计
    posts.forEach(post => {
      const stats = typeEngagement.get(post.mediaType)!;
      stats.totalLikes += post.attitudes_count;
      stats.totalComments += post.comments_count;
      stats.totalReposts += post.reposts_count;
      stats.count++;
    });

    // 转换为结果数组
    return Array.from(typeEngagement.entries())
      .filter(([_, stats]) => stats.count > 0)
      .map(([type, stats]) => ({
        type,
        avgLikes: stats.totalLikes / stats.count,
        avgComments: stats.totalComments / stats.count,
        avgReposts: stats.totalReposts / stats.count,
      }));
  }

  private getDefaultMediaTypeDistribution(): MediaTypeAnalysis {
    return {
      distribution: [],
      totalPosts: 0,
      trend: [],
      engagementByType: [],
    };
  }
}
