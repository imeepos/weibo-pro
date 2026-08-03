import { Injectable, Inject } from '@sker/core';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import type { TimeRange } from './types';
import type {
  UserRelationNetwork,
  UserRelationType,
  UserRelationQueryParams,
} from '@sker/sdk';
import {
  buildSingleTypeNetwork,
  buildComprehensiveNetwork,
} from './user-relation.queries';

// @sker/sdk 的 UserRelationQueryParams 缺少 eventId 字段（SDK 控制器与业务查询都用到），
// 这里扩展类型，保持运行时行为不变。
export type UserRelationQueryParamsWithEventId = UserRelationQueryParams & {
  eventId?: string;
};

@Injectable({ providedIn: 'root' })
export class UserRelationService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getNetwork(params: UserRelationQueryParamsWithEventId = {}): Promise<UserRelationNetwork> {
    const {
      type = 'comprehensive',
      timeRange = '7d',
      eventId,
      minWeight = 1,
      limit = 10000,
    } = params;

    const MAX_LIMIT = 20000;
    const effectiveLimit = Math.min(limit, MAX_LIMIT);

    const cacheKey = CacheService.buildKey(
      CACHE_KEYS.USER_RELATIONS,
      type,
      timeRange,
      eventId || 'none',
      minWeight.toString(),
      effectiveLimit.toString()
    );

    const cacheTTL = timeRange === 'all' ? CACHE_TTL.VERY_LONG : CACHE_TTL.MEDIUM;

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchNetwork(type, timeRange, eventId, minWeight, effectiveLimit),
      cacheTTL
    );
  }

  private async fetchNetwork(
    type: UserRelationType,
    timeRange: TimeRange,
    eventId: string | undefined,
    minWeight: number,
    limit: number
  ): Promise<UserRelationNetwork> {
    switch (type) {
      case 'like':
        return buildSingleTypeNetwork('like', timeRange, eventId, minWeight, limit);
      case 'comment':
        return buildSingleTypeNetwork('comment', timeRange, eventId, minWeight, limit);
      case 'repost':
        return buildSingleTypeNetwork('repost', timeRange, eventId, minWeight, limit);
      case 'comprehensive':
        return buildComprehensiveNetwork(timeRange, eventId, minWeight, limit);
      default:
        return buildComprehensiveNetwork(timeRange, eventId, minWeight, limit);
    }
  }
}
