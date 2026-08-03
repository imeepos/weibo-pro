import { describe, expect, it, vi } from 'vitest';
import { CacheService, CACHE_KEYS } from '../cache.service';
import { OverviewRealtimeSnapshotService } from './overview-realtime-snapshot.service';

describe('OverviewRealtimeSnapshotService', () => {
  function createService() {
    const cacheService = {
      getOrSet: vi.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
      delPattern: vi.fn(),
    };
    const overviewService = {
      getStatistics: vi.fn().mockResolvedValue({ eventCount: 1 }),
      getSentiment: vi.fn().mockResolvedValue({ positive: 1, negative: 0, neutral: 0 }),
      getLocations: vi.fn().mockResolvedValue([{ region: '北京', count: 1 }]),
    };
    const chartsService = {
      getWordCloud: vi.fn().mockResolvedValue([{ keyword: '测试', weight: 1 }]),
      getSentimentTrend: vi.fn().mockResolvedValue({ categories: ['00:00'], series: [] }),
      getEventTypes: vi.fn().mockResolvedValue({ categories: ['舆情'], series: [{ name: '事件类型', data: [1] }] }),
    };
    const eventsService = {
      getHotList: vi.fn().mockResolvedValue([{ id: 'event-1', title: '热点', heat: 1 }]),
    };
    const userRelationService = {
      getNetwork: vi.fn().mockResolvedValue({
        nodes: [],
        edges: [],
        statistics: {
          totalUsers: 0,
          totalRelations: 0,
          avgDegree: 0,
          density: 0,
          communities: 0,
        },
      }),
    };

    const service = new OverviewRealtimeSnapshotService(
      cacheService as unknown as CacheService,
      overviewService as never,
      chartsService as never,
      eventsService as never,
      userRelationService as never,
    );

    return {
      service,
      cacheService,
      overviewService,
      chartsService,
      eventsService,
      userRelationService,
    };
  }

  it('聚合 /index 所需全部实时快照数据并写入 10 秒短缓存', async () => {
    const {
      service,
      cacheService,
      overviewService,
      chartsService,
      eventsService,
      userRelationService,
    } = createService();

    const snapshot = await service.getSnapshot('24h');

    expect(cacheService.getOrSet).toHaveBeenCalledWith(
      CacheService.buildKey(CACHE_KEYS.OVERVIEW_REALTIME_SNAPSHOT, '24h'),
      expect.any(Function),
      10,
    );
    expect(snapshot).toMatchObject({
      timeRange: '24h',
      cacheTtlSeconds: 10,
      statistics: { eventCount: 1 },
      sentiment: { positive: 1 },
      locations: [{ region: '北京', count: 1 }],
      hotEvents: [{ id: 'event-1', title: '热点', heat: 1 }],
      wordCloud: [{ keyword: '测试', weight: 1 }],
      emotionCurve: { categories: ['00:00'], series: [] },
      eventTypes: { categories: ['舆情'], series: [{ name: '事件类型', data: [1] }] },
      userRelationNetwork: {
        nodes: [],
        edges: [],
      },
    });
    expect(snapshot.generatedAt).toEqual(expect.any(String));
    expect(overviewService.getStatistics).toHaveBeenCalledWith('24h');
    expect(overviewService.getSentiment).toHaveBeenCalledWith('24h');
    expect(overviewService.getLocations).toHaveBeenCalledWith('24h');
    expect(eventsService.getHotList).toHaveBeenCalledWith('24h');
    expect(chartsService.getWordCloud).toHaveBeenCalledWith('24h', 50);
    expect(chartsService.getSentimentTrend).toHaveBeenCalledWith('24h');
    expect(chartsService.getEventTypes).toHaveBeenCalledWith('24h');
    expect(userRelationService.getNetwork).toHaveBeenCalledWith({
      type: 'comprehensive',
      timeRange: '24h',
      minWeight: 1,
      limit: 5000,
    });
  });

  it('按指定 timeRange 或通配符失效实时快照缓存', async () => {
    const { service, cacheService } = createService();

    await expect(service.refreshCache('7d')).resolves.toEqual({
      success: true,
      clearedPatterns: [
        CacheService.buildKey(CACHE_KEYS.OVERVIEW_REALTIME_SNAPSHOT, '7d'),
      ],
    });
    expect(cacheService.delPattern).toHaveBeenLastCalledWith(
      CacheService.buildKey(CACHE_KEYS.OVERVIEW_REALTIME_SNAPSHOT, '7d'),
    );

    await expect(service.refreshCache()).resolves.toEqual({
      success: true,
      clearedPatterns: [
        CacheService.buildKey(CACHE_KEYS.OVERVIEW_REALTIME_SNAPSHOT, '*'),
      ],
    });
    expect(cacheService.delPattern).toHaveBeenLastCalledWith(
      CacheService.buildKey(CACHE_KEYS.OVERVIEW_REALTIME_SNAPSHOT, '*'),
    );
  });
});
