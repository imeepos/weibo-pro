import { Injectable, Inject, Logger } from '@sker/core';
import type {
  OverviewRealtimeSnapshot,
  OverviewRealtimeSnapshotRefreshResult,
  TimeRange,
} from '@sker/sdk';
import { CacheService, CACHE_KEYS } from '../cache.service';
import { OverviewService } from './overview.service';
import { ChartsService } from './charts.service';
import { EventsService } from './events/events.service';
import { UserRelationService } from './user-relation.service';

// TTL 需大于前端轮询周期(10s)：若相等，每次轮询时缓存恰已过期，必触发全量重算（缓存击穿）
const REALTIME_SNAPSHOT_TTL_SECONDS = 15;
const WORD_CLOUD_LIMIT = 50;
const USER_RELATION_LIMIT = 5000;

@Injectable({ providedIn: 'root' })
export class OverviewRealtimeSnapshotService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService,
    @Inject(OverviewService) private readonly overviewService: OverviewService,
    @Inject(ChartsService) private readonly chartsService: ChartsService,
    @Inject(EventsService) private readonly eventsService: EventsService,
    @Inject(UserRelationService) private readonly userRelationService: UserRelationService,
    @Inject(Logger, { optional: true })
    private readonly logger?: Logger,
  ) {}

  async getSnapshot(timeRange: TimeRange): Promise<OverviewRealtimeSnapshot> {
    const cacheKey = this.buildSnapshotKey(timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [
          statistics,
          sentiment,
          locations,
          hotEvents,
          wordCloud,
          emotionCurve,
          eventTypes,
          userRelationNetwork,
        ] = await Promise.all([
          this.overviewService.getStatistics(timeRange),
          this.overviewService.getSentiment(timeRange),
          this.overviewService.getLocations(timeRange),
          this.eventsService.getHotList(timeRange),
          this.chartsService.getWordCloud(timeRange, WORD_CLOUD_LIMIT),
          this.chartsService.getSentimentTrend(timeRange),
          this.chartsService.getEventTypes(timeRange),
          this.userRelationService.getNetwork({
            type: 'comprehensive',
            timeRange,
            minWeight: 1,
            limit: USER_RELATION_LIMIT,
          }),
        ]);

        return {
          timeRange,
          generatedAt: new Date().toISOString(),
          cacheTtlSeconds: REALTIME_SNAPSHOT_TTL_SECONDS,
          statistics,
          sentiment,
          locations,
          hotEvents,
          wordCloud,
          emotionCurve,
          eventTypes,
          userRelationNetwork,
        };
      },
      REALTIME_SNAPSHOT_TTL_SECONDS,
    );
  }

  async refreshCache(timeRange?: TimeRange): Promise<OverviewRealtimeSnapshotRefreshResult> {
    const patterns = timeRange
      ? [this.buildSnapshotKey(timeRange)]
      : [CacheService.buildKey(CACHE_KEYS.OVERVIEW_REALTIME_SNAPSHOT, '*')];

    for (const pattern of patterns) {
      try {
        await this.cacheService.delPattern(pattern);
      } catch (error) {
        this.logger?.warn(`Failed to clear realtime snapshot cache pattern: ${pattern}`, error);
      }
    }

    return {
      success: true,
      clearedPatterns: patterns,
    };
  }

  private buildSnapshotKey(timeRange: TimeRange): string {
    return CacheService.buildKey(CACHE_KEYS.OVERVIEW_REALTIME_SNAPSHOT, timeRange);
  }
}
