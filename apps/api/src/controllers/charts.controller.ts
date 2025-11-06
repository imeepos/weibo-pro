import { Controller, Get, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { ChartsService } from '../services/data/charts.service';

@Controller('api/charts')
export class ChartsController {
  private chartsService: ChartsService;

  constructor() {
    this.chartsService = root.get(ChartsService);
  }

  @Get('age-distribution')
  async getAgeDistribution(@Query('timeRange') timeRange?: string) {
    return this.chartsService.getAgeDistribution(timeRange);
  }

  @Get('gender-distribution')
  async getGenderDistribution(@Query('timeRange') timeRange?: string) {
    return this.chartsService.getGenderDistribution(timeRange);
  }

  @Get('sentiment-trend')
  async getSentimentTrend(@Query('timeRange') timeRange?: string) {
    return this.chartsService.getSentimentTrend(timeRange);
  }

  @Get('geographic')
  async getGeographic(@Query('timeRange') timeRange?: string) {
    return this.chartsService.getGeographic(timeRange);
  }

  @Get('event-types')
  async getEventTypes(@Query('timeRange') timeRange?: string) {
    return this.chartsService.getEventTypes(timeRange);
  }

  @Get('word-cloud')
  async getWordCloud(@Query('timeRange') timeRange?: string) {
    return this.chartsService.getWordCloud(timeRange);
  }

  @Get('event-count-series')
  async getEventCountSeries(@Query('timeRange') timeRange?: string) {
    return this.chartsService.getEventCountSeries(timeRange);
  }

  @Get('post-count-series')
  async getPostCountSeries(@Query('timeRange') timeRange?: string) {
    return this.chartsService.getPostCountSeries(timeRange);
  }

  @Get('sentiment-data')
  async getSentimentData(@Query('timeRange') timeRange?: string) {
    return this.chartsService.getSentimentData(timeRange);
  }

  @Get('batch')
  async getBatchCharts(@Query('timeRange') timeRange?: string) {
    return this.chartsService.getBatchCharts(timeRange);
  }
}