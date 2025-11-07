import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { root } from '@sker/core';
import { SentimentService } from '../services/data/sentiment.service';
import type { TimeRange } from '@sker/entities';

@Controller('api/sentiment')
export class SentimentController {
  private sentimentService: SentimentService;

  constructor() {
    this.sentimentService = root.get(SentimentService);
  }

  @Get('realtime')
  async getRealtimeData(@Query('timeRange') timeRange: TimeRange = `12h`) {
    return this.sentimentService.getRealtimeData(timeRange);
  }

  @Get('statistics')
  async getStatistics(@Query('timeRange') timeRange: TimeRange = `12h`) {
    return this.sentimentService.getStatistics(timeRange);
  }

  @Get('hot-topics')
  async getHotTopics(@Query('timeRange') timeRange?: TimeRange) {
    return this.sentimentService.getHotTopics(timeRange);
  }

  @Get('keywords')
  async getKeywords(@Query('timeRange') timeRange?: TimeRange) {
    return this.sentimentService.getKeywords(timeRange);
  }

  @Get('time-series')
  async getTimeSeries(@Query('timeRange') timeRange?: TimeRange) {
    return this.sentimentService.getTimeSeries(timeRange);
  }

  @Get('locations')
  async getLocations(@Query('timeRange') timeRange?: TimeRange) {
    return this.sentimentService.getLocations(timeRange);
  }

  @Get('recent-posts')
  async getRecentPosts(@Query('timeRange') timeRange?: TimeRange) {
    return this.sentimentService.getRecentPosts(timeRange);
  }

  @Post('search')
  async search(@Body() searchData: { keyword: string; timeRange?: TimeRange }) {
    return this.sentimentService.search(searchData.keyword, searchData.timeRange);
  }
}