import { Controller, Get, Post, Query, Body } from '@sker/core';
import { root } from '@sker/core';
import { SentimentService } from '../services/data/sentiment.service';
import type { TimeRange } from '@sker/entities';
import * as sdk from '@sker/sdk';

@Controller(sdk.SentimentController)
export class SentimentController implements sdk.SentimentController {
  private sentimentService: SentimentService;

  constructor() {
    this.sentimentService = root.get(SentimentService);
  }

  async getRealtimeData(@Query('timeRange') timeRange: TimeRange = `12h`) {
    return this.sentimentService.getRealtimeData(timeRange);
  }

  async getStatistics(@Query('timeRange') timeRange: TimeRange = `12h`) {
    return this.sentimentService.getStatistics(timeRange);
  }

  async getHotTopics(@Query('timeRange') timeRange?: TimeRange) {
    return this.sentimentService.getHotTopics(timeRange);
  }

  async getKeywords(@Query('timeRange') timeRange?: TimeRange) {
    return this.sentimentService.getKeywords(timeRange);
  }

  async getTimeSeries(@Query('timeRange') timeRange?: TimeRange) {
    return this.sentimentService.getTimeSeries(timeRange);
  }

  async getLocations(@Query('timeRange') timeRange?: TimeRange) {
    return this.sentimentService.getLocations(timeRange);
  }

  async getRecentPosts(@Query('timeRange') timeRange?: TimeRange) {
    return this.sentimentService.getRecentPosts(timeRange);
  }

  async search(@Body() searchData: { keyword: string; timeRange?: TimeRange }) {
    return this.sentimentService.search(searchData.keyword, searchData.timeRange);
  }

  async getPolarization(@Query('timeRange') timeRange: TimeRange = `12h`) {
    return this.sentimentService.getPolarization(timeRange);
  }
}