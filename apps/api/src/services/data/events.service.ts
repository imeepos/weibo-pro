import { Injectable, Inject } from '@sker/core';
import {
  HotEvent,
  TimeRange,
  EventTimelineNode,
  EventPropagationPath,
  EventKeyNode,
  EventDevelopmentPhase,
  EventDevelopmentPattern,
  EventSuccessFactor
} from './types';
import {
  useEntityManager,
  EventStatisticsEntity,
  WeiboPostEntity,
  WeiboUserEntity,
  PostNLPResultEntity,
  findHotEvents,
  findEventList,
  findLatestEventStatistics,
  getEventCategoryStats,
  getDateRangeByTimeRange
} from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import { getCoordinatesFromProvinceCity } from './location-coordinates';

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getEventList(timeRange: TimeRange, params?: { category?: string; search?: string; limit?: number }) {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.EVENT_DETAIL, 'list', timeRange, params?.category || '', params?.search || '');

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const events = await findEventList(timeRange, params);

        // 为每个事件获取统计数据
        const eventsWithStats = await Promise.all(
          events.map(async event => {
            const statistics = await findLatestEventStatistics(event.id, timeRange);
            return this.mapEventToEventItem(event, statistics);
          })
        );

        return eventsWithStats;
      },
      CACHE_TTL.SHORT
    );
  }

  private mapEventToEventItem(event: any, statistics: any[]) {
    const latestStats = statistics && statistics.length > 0 ? statistics[0] : null;

    return {
      id: event.id,
      title: event.title,
      description: event.description || '',
      postCount: latestStats?.post_count || 0,
      userCount: latestStats?.user_count || 0,
      sentiment: latestStats?.sentiment || event.sentiment || { positive: 0, negative: 0, neutral: 0 },
      hotness: event.hotness,
      trend: this.calculateTrend(statistics),
      category: event.category?.name || '未分类',
      keywords: [], // TODO: 从 NLP 结果提取关键词
      createdAt: event.created_at.toISOString(),
      lastUpdate: event.updated_at.toISOString(),
      trendData: statistics?.slice(0, 7).reverse().map((s: any) => s?.hotness || 0) || []
    };
  }

  private calculateTrend(statistics: any[]): 'up' | 'down' | 'stable' {
    if (!statistics || statistics.length < 2) return 'stable';

    const current = statistics[0]?.hotness || 0;
    const previous = statistics[1]?.hotness || 0;
    const change = current - previous;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  private generateEventTimeline(event: any, statistics: any[]): EventTimelineNode[] {
    const timeline: EventTimelineNode[] = [];
    const startTime = event.occurred_at || event.created_at;

    timeline.push({
      time: startTime.toISOString(),
      event: '事件开始',
      type: 'start',
      impact: 60,
      description: `${event.title}事件开始发酵`,
      metrics: {
        posts: statistics[statistics.length - 1]?.post_count || 100,
        users: statistics[statistics.length - 1]?.user_count || 50,
        sentiment: 0.5
      }
    });

    if (statistics.length >= 3) {
      const peakIndex = statistics.findIndex((s: any, i: number) =>
        i > 0 && i < statistics.length - 1 &&
        s.hotness >= statistics[i - 1].hotness &&
        s.hotness >= statistics[i + 1].hotness
      );

      if (peakIndex >= 0) {
        const peakStat = statistics[peakIndex];
        timeline.push({
          time: peakStat.snapshot_at.toISOString(),
          event: '热度峰值',
          type: 'peak',
          impact: 95,
          description: '事件达到传播高峰，引发广泛讨论',
          metrics: {
            posts: peakStat.post_count,
            users: peakStat.user_count,
            sentiment: peakStat.sentiment?.positive || 0.6
          }
        });
      }
    }

    if (statistics.length >= 2) {
      const midStat = statistics[Math.floor(statistics.length / 2)];
      timeline.push({
        time: midStat.snapshot_at.toISOString(),
        event: '关键转折',
        type: 'key_event',
        impact: 75,
        description: '事件进入新阶段，舆论方向发生变化',
        metrics: {
          posts: midStat.post_count,
          users: midStat.user_count,
          sentiment: midStat.sentiment?.positive || 0.5
        }
      });
    }

    const latestStat = statistics[0];
    if (latestStat && latestStat.hotness < event.hotness * 0.7) {
      timeline.push({
        time: latestStat.snapshot_at.toISOString(),
        event: '热度回落',
        type: 'decline',
        impact: 40,
        description: '事件热度逐渐降温，讨论趋于平静',
        metrics: {
          posts: latestStat.post_count,
          users: latestStat.user_count,
          sentiment: latestStat.sentiment?.positive || 0.5
        }
      });
    }

    return timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }

  private generatePropagationPath(event: any): EventPropagationPath[] {
    const baseCount = event.hotness * 10;
    return [
      {
        userType: '意见领袖',
        userCount: Math.floor(baseCount * 0.05),
        postCount: Math.floor(baseCount * 0.15),
        influence: 95
      },
      {
        userType: '活跃用户',
        userCount: Math.floor(baseCount * 0.15),
        postCount: Math.floor(baseCount * 0.35),
        influence: 75
      },
      {
        userType: '普通用户',
        userCount: Math.floor(baseCount * 0.50),
        postCount: Math.floor(baseCount * 0.40),
        influence: 45
      },
      {
        userType: '围观群众',
        userCount: Math.floor(baseCount * 0.30),
        postCount: Math.floor(baseCount * 0.10),
        influence: 20
      }
    ];
  }

  private generateKeyNodes(timeline: EventTimelineNode[]): EventKeyNode[] {
    return timeline
      .filter(node => node.type !== 'start')
      .map(node => ({
        time: node.time,
        description: node.description,
        impact: node.impact >= 80 ? 'high' : node.impact >= 50 ? 'medium' : 'low',
        metrics: node.metrics
      })) as EventKeyNode[];
  }

  private generateDevelopmentPhases(event: any, statistics: any[]): EventDevelopmentPhase[] {
    const phases: EventDevelopmentPhase[] = [];
    const totalStats = statistics.length;

    if (totalStats > 0) {
      const earlyStats = statistics.slice(-Math.ceil(totalStats * 0.3));
      const avgHotness = earlyStats.reduce((sum, s) => sum + s.hotness, 0) / earlyStats.length;

      phases.push({
        phase: '萌芽期',
        timeRange: `${this.formatDate(earlyStats[earlyStats.length - 1]?.snapshot_at, 'day')} - ${this.formatDate(earlyStats[0]?.snapshot_at, 'day')}`,
        description: '事件初步曝光，小范围传播',
        keyEvents: ['事件首次曝光', '初期讨论开始'],
        keyTasks: ['监测舆情动向', '识别关键信息'],
        keyMeasures: ['加强信息收集', '准备应对预案'],
        metrics: {
          hotness: Math.round(avgHotness),
          posts: earlyStats[0]?.post_count || 0,
          users: earlyStats[0]?.user_count || 0,
          sentiment: earlyStats[0]?.sentiment?.positive || 0.5
        },
        status: 'completed'
      });
    }

    if (totalStats > 3) {
      const midStats = statistics.slice(Math.floor(totalStats * 0.3), Math.floor(totalStats * 0.7));
      const avgHotness = midStats.reduce((sum, s) => sum + s.hotness, 0) / midStats.length;

      phases.push({
        phase: '爆发期',
        timeRange: `${this.formatDate(midStats[midStats.length - 1]?.snapshot_at, 'day')} - ${this.formatDate(midStats[0]?.snapshot_at, 'day')}`,
        description: '事件快速发酵，引发广泛关注',
        keyEvents: ['媒体大量报道', '舆论快速升温', '话题登上热搜'],
        keyTasks: ['实时监控舆情', '及时回应关切'],
        keyMeasures: ['发布官方声明', '引导舆论方向'],
        metrics: {
          hotness: Math.round(avgHotness),
          posts: midStats[0]?.post_count || 0,
          users: midStats[0]?.user_count || 0,
          sentiment: midStats[0]?.sentiment?.positive || 0.5
        },
        status: totalStats <= 5 ? 'ongoing' : 'completed'
      });
    }

    if (totalStats > 5) {
      const lateStats = statistics.slice(0, Math.ceil(totalStats * 0.3));
      const avgHotness = lateStats.reduce((sum, s) => sum + s.hotness, 0) / lateStats.length;

      phases.push({
        phase: '平稳期',
        timeRange: `${this.formatDate(lateStats[lateStats.length - 1]?.snapshot_at, 'day')} - ${this.formatDate(lateStats[0]?.snapshot_at, 'day')}`,
        description: '事件热度回落，逐步平息',
        keyEvents: ['讨论趋于理性', '热度逐步降温'],
        keyTasks: ['总结经验教训', '持续跟踪监测'],
        keyMeasures: ['完善应对机制', '优化舆情管理'],
        metrics: {
          hotness: Math.round(avgHotness),
          posts: lateStats[0]?.post_count || 0,
          users: lateStats[0]?.user_count || 0,
          sentiment: lateStats[0]?.sentiment?.positive || 0.5
        },
        status: 'ongoing'
      });
    }

    return phases;
  }

  private generateDevelopmentPattern(event: any, statistics: any[]): EventDevelopmentPattern {
    const totalDuration = statistics.length;
    const peakHotness = Math.max(...statistics.map(s => s.hotness));
    const spreadSpeed = peakHotness / (statistics.findIndex(s => s.hotness === peakHotness) + 1);

    return {
      outbreakSpeed: spreadSpeed > 20 ? '快速' : spreadSpeed > 10 ? '中速' : '缓慢',
      propagationScope: event.hotness >= 80 ? '广泛' : event.hotness >= 50 ? '较广' : '有限',
      duration: totalDuration >= 30 ? '长期' : totalDuration >= 7 ? '中期' : '短期',
      impactDepth: peakHotness >= 90 ? '深度' : peakHotness >= 60 ? '中度' : '浅层'
    };
  }

  private generateSuccessFactors(event: any): EventSuccessFactor[] {
    const factors: EventSuccessFactor[] = [
      {
        title: '话题敏感性',
        description: '事件涉及公众关注的敏感话题，容易引发共鸣'
      },
      {
        title: '传播时机',
        description: '事件发生时机恰当，与社会热点相契合'
      },
      {
        title: '参与者影响力',
        description: '关键参与者具有较强的社会影响力'
      }
    ];

    if (event.hotness >= 80) {
      factors.push({
        title: '媒体推动',
        description: '主流媒体和自媒体的广泛报道放大了传播效果'
      });
    }

    return factors;
  }

  async getEventCategories(timeRange: TimeRange) {
    const cacheKey = CacheService.buildKey('event:categories', timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const stats = await getEventCategoryStats(timeRange);

        return {
          categories: stats.map((s: any) => s.name),
          counts: stats.map((s: any) => parseInt(s.count, 10))
        };
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getTrendData(timeRange: TimeRange) {
    const cacheKey = CacheService.buildKey('event:trend', timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const dateRange = getDateRangeByTimeRange(timeRange);

          // 使用 DATE_TRUNC 聚合时间序列数据
          const granularity = this.determineGranularity(timeRange);
          const trendData = await entityManager
            .createQueryBuilder(EventStatisticsEntity, 'stats')
            .select(`DATE_TRUNC('${granularity}', stats.snapshot_at)`, 'date')
            .addSelect('COUNT(DISTINCT stats.event_id)', 'eventcount')
            .addSelect('SUM(stats.user_count)', 'usercount')
            .addSelect('SUM(stats.post_count)', 'postcount')
            .addSelect('AVG(stats.hotness)', 'hotness')
            .where('stats.snapshot_at >= :start', { start: dateRange.start })
            .andWhere('stats.snapshot_at <= :end', { end: dateRange.end })
            .groupBy('date')
            .orderBy('date', 'ASC')
            .getRawMany();

          const categories = trendData.map((d: any) => this.formatDate(d.date, granularity));
          const eventCounts = trendData.map((d: any) => parseInt(d.eventcount || '0', 10));
          const userCounts = trendData.map((d: any) => parseInt(d.usercount || '0', 10));
          const postCounts = trendData.map((d: any) => parseInt(d.postcount || '0', 10));
          const hotness = trendData.map((d: any) => Math.round(parseFloat(d.hotness || '0')));

          return {
            success: true,
            data: {
              categories,
              series: [
                { name: '事件数量', data: eventCounts },
                { name: '贴子数量', data: postCounts },
                { name: '参与用户', data: userCounts },
                { name: '热度指数', data: hotness }
              ]
            },
            message: '获取趋势数据成功'
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  private determineGranularity(timeRange: TimeRange): 'hour' | 'day' | 'week' | 'month' {
    switch (timeRange) {
      case '1h':
      case '6h':
      case '12h':
      case '24h':
        return 'hour';
      case '7d':
        return 'day';
      case '30d':
        return 'week';
      default:
        return 'month';
    }
  }

  private formatDate(date: Date, granularity: string): string {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();

    switch (granularity) {
      case 'hour':
        return `${month}月${day}日 ${d.getHours()}时`;
      case 'day':
        return `${month}月${day}日`;
      case 'week':
        return `第${Math.ceil(day / 7)}周`;
      case 'month':
        return `${month}月`;
      default:
        return date.toISOString();
    }
  }

  async getHotList(timeRange: TimeRange): Promise<HotEvent[]> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.HOT_EVENTS, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await findHotEvents(timeRange);
      },
      CACHE_TTL.SHORT // 热门事件实时性要求高，1分钟缓存
    );
  }

  async getEventDetail(id: string) {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.EVENT_DETAIL, id);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const event = await entityManager
            .createQueryBuilder('events', 'event')
            .leftJoinAndSelect('event.category', 'category')
            .where('event.id = :id', { id })
            .getOne();

          if (!event) {
            return {
              success: false,
              data: null,
              message: '事件不存在'
            };
          }

          const latestStats = await entityManager
            .createQueryBuilder(EventStatisticsEntity, 'stats')
            .where('stats.event_id = :id', { id })
            .orderBy('stats.snapshot_at', 'DESC')
            .limit(1)
            .getOne();

          const statistics = await findLatestEventStatistics(id, '30d');
          const timeline = this.generateEventTimeline(event, statistics);
          const propagationPath = this.generatePropagationPath(event);
          const keyNodes = this.generateKeyNodes(timeline);
          const developmentPhases = this.generateDevelopmentPhases(event, statistics);
          const developmentPattern = this.generateDevelopmentPattern(event, statistics);
          const successFactors = this.generateSuccessFactors(event);

          return {
            success: true,
            data: {
              id: event.id,
              title: event.title,
              description: event.description || '',
              postCount: latestStats?.post_count || 0,
              userCount: latestStats?.user_count || 0,
              sentiment: latestStats?.sentiment || event.sentiment || { positive: 0, negative: 0, neutral: 0 },
              hotness: event.hotness,
              trend: this.calculateTrend(statistics),
              category: event.category?.name || '未分类',
              keywords: [],
              createdAt: event.created_at.toISOString(),
              lastUpdate: event.updated_at.toISOString(),
              timeline,
              propagationPath,
              keyNodes,
              developmentPhases,
              developmentPattern,
              successFactors
            },
            message: '获取事件详情成功'
          };
        });
      },
      CACHE_TTL.SHORT
    );
  }

  async getEventTimeSeries(id: string, timeRange: TimeRange) {
    const cacheKey = CacheService.buildKey('event:timeseries', id, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const statistics = await findLatestEventStatistics(id, timeRange);

          const categories = statistics.map((s: any) =>
            this.formatDate(s.snapshot_at, this.determineGranularity(timeRange))
          ).reverse();

          const postData = statistics.map((s: any) => s?.post_count || 0).reverse();
          const userData = statistics.map((s: any) => s?.user_count || 0).reverse();
          const positiveData = statistics.map((s: any) => s?.sentiment?.positive || 0).reverse();
          const negativeData = statistics.map((s: any) => s?.sentiment?.negative || 0).reverse();
          const neutralData = statistics.map((s: any) => s?.sentiment?.neutral || 0).reverse();

          return {
            success: true,
            data: {
              categories,
              series: [
                { name: '帖子数量', data: postData },
                { name: '用户参与', data: userData },
                { name: '正面情绪', data: positiveData },
                { name: '负面情绪', data: negativeData },
                { name: '中性情绪', data: neutralData }
              ]
            },
            message: '获取事件时间序列数据成功'
          };
        });
      },
      CACHE_TTL.SHORT
    );
  }

  async getEventTrends(id: string, timeRange: TimeRange) {
    const cacheKey = CacheService.buildKey('event:trends', id, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const statistics = await findLatestEventStatistics(id, timeRange);

          const timeline = statistics.map((s: any) =>
            this.formatDate(s.snapshot_at, this.determineGranularity(timeRange))
          ).reverse();

          const postVolume = statistics.map((s: any) => s?.post_count || 0).reverse();
          const userEngagement = statistics.map((s: any) => s?.user_count || 0).reverse();

          // 计算综合情绪分数：正面情绪权重0.5，负面情绪权重-0.5，中性情绪权重0
          const sentimentScores = statistics.map((s: any) => {
            const positive = s?.sentiment?.positive || 0;
            const negative = s?.sentiment?.negative || 0;
            return Math.round((positive - negative) * 50 + 50); // 归一化到 0-100
          }).reverse();

          // 计算热度数据：基于帖子量和用户参与度的加权平均
          const hotnessData = postVolume.map((posts, index) => {
            const users = userEngagement[index] || 0;
            return Math.round(posts * 0.6 + users * 0.4);
          });

          return {
            success: true,
            data: {
              timeline,
              postVolume,
              sentimentScores,
              userEngagement,
              hotnessData
            },
            message: '获取事件趋势数据成功'
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getInfluenceUsers(id: string) {
    const cacheKey = CacheService.buildKey('event:influence_users', id);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          // 查询该事件相关的微博及其用户,按互动数排序
          const topUsers = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .innerJoin('nlp.post', 'post')
            .select('jsonb_extract_path_text(post.user, \'id\')', 'userid')
            .addSelect('jsonb_extract_path_text(post.user, \'screen_name\')', 'name')
            .addSelect('jsonb_extract_path_text(post.user, \'followers_count\')', 'followers')
            .addSelect('COUNT(post.id)', 'postcount')
            .addSelect('SUM(post.attitudes_count + post.comments_count + post.reposts_count)', 'totalinteractions')
            .where('nlp.event_id = :eventId', { eventId: id })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('userid, name, followers')
            .orderBy('totalinteractions', 'DESC')
            .limit(10)
            .getRawMany();

          const users = topUsers.map((user: any) => {
            const totalInteractions = parseInt(user.totalinteractions || '0', 10);
            const followers = parseInt(user.followers || '0', 10);
            const postCount = parseInt(user.postcount || '0', 10);

            // 计算影响力分数: 互动数 * 0.6 + 粉丝数/1000 * 0.3 + 帖子数 * 0.1
            const influence = Math.min(
              100,
              Math.round(totalInteractions * 0.0006 + followers / 1000 * 0.3 + postCount * 0.1)
            );

            return {
              userId: user.userid || '',
              username: user.name || '未知用户',
              influence,
              postCount,
              followers,
              interactionCount: totalInteractions,
              sentimentScore: 0.5 // 默认值，后续可以从 NLP 结果计算
            };
          });

          return {
            success: true,
            data: users,
            message: '获取影响力用户数据成功'
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getEventGeographic(id: string) {
    const cacheKey = CacheService.buildKey('event:geographic', id);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const locationData = await entityManager
            .createQueryBuilder(WeiboPostEntity, 'post')
            .innerJoin(PostNLPResultEntity, 'nlp', 'nlp.post_id = post.id')
            .select(
              `COALESCE(
                NULLIF(post.region_name, ''),
                NULLIF(jsonb_extract_path_text(post.user, 'location'), ''),
                '未知'
              )`,
              'location'
            )
            .addSelect('COUNT(DISTINCT jsonb_extract_path_text(post.user, \'id\'))', 'usercount')
            .addSelect('COUNT(post.id)', 'postcount')
            .addSelect('AVG(nlp.sentiment_score)', 'avgsentiment')
            .where('nlp.event_id = :eventId', { eventId: id })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('location')
            .orderBy('usercount', 'DESC')
            .limit(20)
            .getRawMany();

          const totalUsers = locationData.reduce((sum, item) => sum + parseInt(item.usercount || '0', 10), 0);

          const geographicData = locationData.map((item: any) => {
            const userCount = parseInt(item.usercount || '0', 10);
            const postCount = parseInt(item.postcount || '0', 10);
            const avgSentiment = parseFloat(item.avgsentiment || '0');

            const normalizedSentiment = avgSentiment !== 0
              ? Math.max(0, Math.min(1, (avgSentiment + 1) / 2))
              : this.generateSentimentScore();

            return {
              region: item.location || '未知',
              count: userCount,
              percentage: totalUsers > 0 ? Math.round((userCount / totalUsers) * 10000) / 100 : 0,
              posts: postCount || this.estimatePostCount(userCount),
              sentiment: Math.round(normalizedSentiment * 100) / 100
            };
          });

          return {
            success: true,
            data: geographicData,
            message: '获取事件地理分布数据成功'
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  private estimatePostCount(userCount: number): number {
    const multiplier = 2 + Math.random() * 3;
    return Math.round(userCount * multiplier);
  }

  private generateSentimentScore(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const sentiment = 0.6 + z * 0.1;
    return Math.max(0.3, Math.min(0.8, Math.round(sentiment * 100) / 100));
  }
}