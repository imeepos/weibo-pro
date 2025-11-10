import { Controller, Get, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { ChartsService } from '../services/data/charts.service';
import type { TimeRange } from '../services/data/types';
import * as sdk from '@sker/sdk';
@Controller('api/charts')
export class ChartsController implements sdk.ChartsController{
  private chartsService: ChartsService;

  constructor() {
    this.chartsService = root.get(ChartsService);
  }

  @Get('age-distribution')
  async getAgeDistribution(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getAgeDistribution(timeRange);
  }

  @Get('gender-distribution')
  async getGenderDistribution(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getGenderDistribution(timeRange);
  }

  @Get('sentiment-trend')
  async getSentimentTrend(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getSentimentTrend(timeRange);
  }

  @Get('geographic')
  async getGeographic(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getGeographic(timeRange);
  }

  @Get('event-types')
  async getEventTypes(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getEventTypes(timeRange);
  }

  @Get('word-cloud')
  async getWordCloud(@Query('timeRange') timeRange?: TimeRange, @Query('limit') limit?: number) {
    return this.chartsService.getWordCloud(timeRange, limit);
  }

  @Get('event-count-series')
  async getEventCountSeries(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getEventCountSeries(timeRange);
  }

  @Get('post-count-series')
  async getPostCountSeries(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getPostCountSeries(timeRange);
  }

  @Get('sentiment-data')
  async getSentimentData(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getSentimentData(timeRange);
  }

  @Get('batch')
  async getBatchCharts(@Query('timeRange') timeRange?: TimeRange) {
    return this.chartsService.getBatchCharts(timeRange);
  }
}