import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type {
  CommunityEvolutionAnalysis,
  CommunityTimeSlice,
  EvolutionEvent,
  TrendPrediction,
} from '@sker/sdk';
import {
  calculateJaccardSimilarity,
  matchCommunities,
  reverseMatch,
} from './community-evolution.matching';
import { createTimeSlices, queryEventTimeRange } from './community-evolution.slices';
import { detectEvolutionEvents as detectEvolutionEventsImpl } from './community-evolution.events';
import {
  calculateOverallStability as calculateOverallStabilityImpl,
  identifyKeyChanges,
  predictTrend as predictTrendImpl,
  getDefaultEvolutionAnalysis,
} from './community-evolution.analysis';

@Injectable({ providedIn: 'root' })
export class CommunityEvolutionService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getCommunityEvolutionAnalysis(eventId: string): Promise<CommunityEvolutionAnalysis> {
    const cacheKey = CacheService.buildKey('community:evolution', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchCommunityEvolutionAnalysis(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchCommunityEvolutionAnalysis(eventId: string): Promise<CommunityEvolutionAnalysis> {
    return useEntityManager(async (manager) => {
      // 查询事件时间范围
      const event = await queryEventTimeRange(manager, eventId);

      if (!event || !event.startTime || !event.endTime) {
        return getDefaultEvolutionAnalysis();
      }

      // 创建时间切片
      const timeSlices = await createTimeSlices(eventId, event.startTime, event.endTime);

      if (timeSlices.length === 0) {
        return getDefaultEvolutionAnalysis();
      }

      // 检测演化事件
      const evolutionEvents = this.detectEvolutionEvents(timeSlices);

      // 计算整体稳定性
      const overallStability = this.calculateOverallStability(timeSlices);

      // 识别关键变化
      const keyChanges = identifyKeyChanges(timeSlices, evolutionEvents);

      // 预测趋势
      const trendPrediction = this.predictTrend(timeSlices);

      return {
        timeSlices,
        evolutionEvents,
        overallStability,
        keyChanges,
        trendPrediction,
      };
    });
  }

  private calculateJaccardSimilarity(setA: string[], setB: string[]): number {
    return calculateJaccardSimilarity(setA, setB);
  }

  private matchCommunities(
    prevSlice: CommunityTimeSlice,
    currSlice: CommunityTimeSlice,
    threshold = 0.5
  ): Map<string, string> {
    return matchCommunities(prevSlice, currSlice, threshold);
  }

  private reverseMatch(matches: Map<string, string>): Map<string, string[]> {
    return reverseMatch(matches);
  }

  private detectEvolutionEvents(timeSlices: CommunityTimeSlice[]): EvolutionEvent[] {
    return detectEvolutionEventsImpl(timeSlices, this.matchCommunities, this.reverseMatch);
  }

  private calculateOverallStability(timeSlices: CommunityTimeSlice[]): number {
    return calculateOverallStabilityImpl(timeSlices, this.matchCommunities);
  }

  private predictTrend(timeSlices: CommunityTimeSlice[]): TrendPrediction {
    return predictTrendImpl(timeSlices);
  }
}
