import { Controller, Query } from '@sker/core';
import { root } from '@sker/core';
import { OverviewService } from '../services/data/overview.service';
import { OverviewRealtimeSnapshotService } from '../services/data/overview-realtime-snapshot.service';
import { TimeRange } from '../services/data/types';
import * as sdk from '@sker/sdk';

@Controller(sdk.OverviewController)
export class OverviewController implements sdk.OverviewController{
  private overviewService: OverviewService;
  private realtimeSnapshotService: OverviewRealtimeSnapshotService;

  constructor() {
    this.overviewService = root.get(OverviewService);
    this.realtimeSnapshotService = root.get(OverviewRealtimeSnapshotService);
  }

  async getStatistics(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.overviewService.getStatistics(validTimeRange);
  }

  async getSentiment(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.overviewService.getSentiment(validTimeRange);
  }

  async getLocations(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.overviewService.getLocations(validTimeRange);
  }

  async getRealtimeSnapshot(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.realtimeSnapshotService.getSnapshot(validTimeRange);
  }

  async refreshRealtimeSnapshotCache(@Query('timeRange') timeRange?: string) {
    const validTimeRange = timeRange ? this.validateTimeRange(timeRange) : undefined;
    return this.realtimeSnapshotService.refreshCache(validTimeRange);
  }

  private validateTimeRange(timeRange?: string): TimeRange {
    const validRanges: TimeRange[] = ['all', '1h', '6h', '12h', '24h', '7d', '30d', '90d', '180d', '365d'];

    return validRanges.includes(timeRange as TimeRange)
      ? (timeRange as TimeRange)
      : '24h';
  }
}
