import { Injectable, Inject } from '@sker/core';
import { HotEvent, TimeRange } from './types';
import { useEntityManager } from '@sker/entities';
import { EventRepository } from './repositories/event.repository';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getEventList(timeRange: TimeRange) {
    // Mock数据 - 事件列表
    return {
      success: true,
      data: [
        {
          id: '1',
          title: '人工智能技术突破',
          category: '科技事件',
          heat: 95,
          sentiment: 'positive',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-20T18:00:00Z'
        },
        {
          id: '2',
          title: '网络安全事件',
          category: '社会事件',
          heat: 88,
          sentiment: 'negative',
          startTime: '2024-01-16T08:00:00Z',
          endTime: '2024-01-18T16:00:00Z'
        },
        {
          id: '3',
          title: '体育赛事盛况',
          category: '体育事件',
          heat: 76,
          sentiment: 'positive',
          startTime: '2024-01-17T14:00:00Z',
          endTime: '2024-01-19T22:00:00Z'
        }
      ],
      message: '获取事件列表成功'
    };
  }

  async getEventCategories(timeRange: TimeRange) {
    // Mock数据 - 事件分类
    return {
      success: true,
      data: {
        categories: ['社会事件', '娱乐事件', '科技事件', '体育事件', '财经事件', '其他'],
        counts: [45, 38, 25, 18, 22, 12]
      },
      message: '获取事件分类数据成功'
    };
  }

  async getTrendData(timeRange: TimeRange) {
    // Mock数据 - 趋势数据
    return {
      success: true,
      data: {
        categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
        series: [
          {
            name: '事件数量',
            data: [120, 150, 180, 200, 220, 240]
          },
          {
            name: '参与用户',
            data: [1500, 1800, 2200, 2500, 2800, 3000]
          }
        ]
      },
      message: '获取趋势数据成功'
    };
  }

  async getHotList(timeRange: TimeRange): Promise<HotEvent[]> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.HOT_EVENTS, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const eventRepository = new EventRepository(entityManager);
          return await eventRepository.findHotEvents(timeRange);
        });
      },
      CACHE_TTL.SHORT // 热门事件实时性要求高，1分钟缓存
    );
  }

  async getEventDetail(id: string) {
    // Mock数据 - 事件详情
    return {
      success: true,
      data: {
        id: id,
        title: '人工智能技术突破事件详情',
        description: '最新的人工智能技术突破引发了广泛关注...',
        category: '科技事件',
        heat: 95,
        sentiment: 'positive',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-20T18:00:00Z',
        totalPosts: 15000,
        totalUsers: 8500,
        keywords: ['人工智能', '机器学习', '深度学习', '神经网络']
      },
      message: '获取事件详情成功'
    };
  }

  async getEventTimeSeries(id: string, timeRange: TimeRange) {
    // Mock数据 - 事件时间序列
    return {
      success: true,
      data: {
        categories: ['1月15日', '1月16日', '1月17日', '1月18日', '1月19日', '1月20日'],
        series: [
          {
            name: '帖子数量',
            data: [1200, 2500, 3800, 4200, 2800, 1500]
          },
          {
            name: '用户参与',
            data: [800, 1500, 2200, 2500, 1800, 900]
          }
        ]
      },
      message: '获取事件时间序列数据成功'
    };
  }

  async getEventTrends(id: string, timeRange: TimeRange) {
    // Mock数据 - 事件趋势
    return {
      success: true,
      data: {
        categories: ['1月15日', '1月16日', '1月17日', '1月18日', '1月19日', '1月20日'],
        series: [
          {
            name: '正面情绪',
            data: [65, 72, 68, 75, 70, 60]
          },
          {
            name: '负面情绪',
            data: [15, 18, 22, 15, 20, 25]
          },
          {
            name: '中性情绪',
            data: [20, 10, 10, 10, 10, 15]
          }
        ]
      },
      message: '获取事件趋势数据成功'
    };
  }

  async getInfluenceUsers(id: string) {
    // Mock数据 - 影响力用户
    return {
      success: true,
      data: [
        {
          id: 'user1',
          name: '科技达人',
          influence: 95,
          posts: 120,
          followers: 15000
        },
        {
          id: 'user2',
          name: 'AI专家',
          influence: 88,
          posts: 85,
          followers: 12000
        },
        {
          id: 'user3',
          name: '数据分析师',
          influence: 76,
          posts: 65,
          followers: 8500
        }
      ],
      message: '获取影响力用户数据成功'
    };
  }

  async getEventGeographic(id: string) {
    // Mock数据 - 事件地理分布
    return {
      success: true,
      data: {
        categories: ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'],
        series: [
          {
            name: '用户数量',
            data: [1500, 1200, 800, 700, 600, 500, 400, 300]
          }
        ]
      },
      message: '获取事件地理分布数据成功'
    };
  }
}