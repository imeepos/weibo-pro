import { Injectable, Inject } from '@sker/core';
import { RedisClient } from '@sker/redis';

/**
 * 缓存服务
 *
 * 存在即合理:
 * - 减少数据库查询压力
 * - 提升 API 响应速度
 * - 统一缓存键命名规范
 *
 * 优雅即简约:
 * - 泛型方法,类型安全
 * - 自动序列化/反序列化
 * - 清晰的TTL策略
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
    constructor(
        @Inject(RedisClient) private readonly redis: RedisClient
    ) {}

    /**
     * 获取缓存数据
     * 如果缓存不存在,执行 factory 函数并缓存结果
     */
    async getOrSet<T>(
        key: string,
        factory: () => Promise<T>,
        ttl: number = 300 // 默认 5 分钟
    ): Promise<T> {
        const cached = await this.redis.get<T>(key);

        if (cached !== null) {
            return cached;
        }

        const data = await factory();
        await this.redis.setex(key, ttl, data);

        return data;
    }

    /**
     * 设置缓存
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        await this.redis.set(key, value, ttl);
    }

    /**
     * 获取缓存
     */
    async get<T>(key: string): Promise<T | null> {
        return await this.redis.get<T>(key);
    }

    /**
     * 删除缓存
     */
    async del(key: string): Promise<void> {
        await this.redis.del(key);
    }

    /**
     * 批量删除缓存 (按模式)
     */
    async delPattern(pattern: string): Promise<void> {
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
            await this.redis.del(key);
        }
    }

    /**
     * 生成缓存键
     */
    static buildKey(prefix: string, ...parts: (string | number)[]): string {
        return [prefix, ...parts].join(':');
    }
}

/**
 * 缓存键前缀常量
 */
export const CACHE_KEYS = {
    OVERVIEW_STATS: 'overview:stats',
    HOT_EVENTS: 'events:hot',
    HOT_POSTS: 'posts:hot',
    ACTIVE_USERS: 'users:active',
    HOT_KEYWORDS: 'keywords:hot',
    TREND_DATA: 'overview:trend',
    EVENT_DETAIL: 'events:detail',
    SENTIMENT_DATA: 'sentiment:data',
    SENTIMENT_STATS: 'sentiment:stats',
    SENTIMENT_REALTIME: 'sentiment:realtime',
    SENTIMENT_KEYWORDS: 'sentiment:keywords',
    SENTIMENT_HOT_TOPICS: 'sentiment:hot-topics',
    SENTIMENT_TIME_SERIES: 'sentiment:time-series',
    SENTIMENT_LOCATIONS: 'sentiment:locations',
    SENTIMENT_RECENT_POSTS: 'sentiment:recent-posts',
    SENTIMENT_SEARCH: 'sentiment:search',
    CHART_AGE: 'chart:age',
    CHART_GENDER: 'chart:gender',
    CHART_SENTIMENT_TREND: 'chart:sentiment-trend',
    CHART_GEOGRAPHIC: 'chart:geographic',
    CHART_EVENT_TYPES: 'chart:event-types',
    CHART_WORDCLOUD: 'chart:wordcloud',
    CHART_EVENT_COUNT: 'chart:event-count',
    CHART_POST_COUNT: 'chart:post-count',
    CHART_SENTIMENT_DATA: 'chart:sentiment-data',
    CHART_BATCH: 'chart:batch'
} as const;

/**
 * TTL 常量 (秒)
 */
export const CACHE_TTL = {
    SHORT: 60,        // 1 分钟 - 实时性要求高
    MEDIUM: 300,      // 5 分钟 - 中等实时性
    LONG: 1800,       // 30 分钟 - 实时性要求低
    VERY_LONG: 3600   // 1 小时 - 基础数据
} as const;
