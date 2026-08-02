import { Controller, Query } from '@sker/core';
import { root } from '@sker/core';
import { ChartsService } from '../services/data/charts.service';
import type { TimeRange } from '../services/data/types';
import * as sdk from '@sker/sdk';
@Controller(sdk.ChartsController)
export class ChartsController implements sdk.ChartsController{
  private chartsService: ChartsService;

  constructor() {
    this.chartsService = root.get(ChartsService);
  }

  async getAgeDistribution(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getAgeDistribution(timeRange);
  }

  async getGenderDistribution(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getGenderDistribution(timeRange);
  }

  async getSentimentTrend(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getSentimentTrend(timeRange);
  }

  async getGeographic(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getGeographic(timeRange);
  }

  async getEventTypes(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getEventTypes(timeRange);
  }

  async getWordCloud(
    @Query('timeRange') timeRange?: TimeRange,
    @Query('limit') limit?: number,
    @Query('sentiment') sentiment?: 'positive' | 'negative' | 'neutral'
  ) {
    return this.chartsService.getWordCloud(timeRange, limit, sentiment);
  }

  async getEventCountSeries(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getEventCountSeries(timeRange);
  }

  async getPostCountSeries(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getPostCountSeries(timeRange);
  }

  async getSentimentData(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getSentimentData(timeRange);
  }

  async getBatchCharts(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getBatchCharts(timeRange);
  }
}