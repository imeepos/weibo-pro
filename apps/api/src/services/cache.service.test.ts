import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService, CACHE_KEYS, CACHE_TTL } from './cache.service';
import { mockRedis } from '../test-setup';

describe('CacheService', () => {
    let service: CacheService;

    beforeEach(() => {
        service = new CacheService(mockRedis as any);
        mockRedis.clear();
        vi.clearAllMocks();
    });

    describe('getOrSet', () => {
        it('should return cached value when exists', async () => {
            const mockData = { value: 'cached' };
            vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(mockData);

            const result = await service.getOrSet('test:key', () => Promise.resolve({ value: 'new' }));

            expect(result).toEqual(mockData);
        });

        it('should call factory and cache result when cache miss', async () => {
            const factoryResult = { value: 'fresh' };
            vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
            vi.spyOn(mockRedis, 'setex').mockResolvedValueOnce();

            const factory = vi.fn().mockResolvedValue(factoryResult);
            const result = await service.getOrSet('test:key', factory);

            expect(factory).toHaveBeenCalledOnce();
            expect(result).toEqual(factoryResult);
            expect(mockRedis.setex).toHaveBeenCalledWith('test:key', 300, factoryResult);
        });

        it('should use custom TTL when provided', async () => {
            vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
            vi.spyOn(mockRedis, 'setex').mockResolvedValueOnce();

            await service.getOrSet('test:key', () => Promise.resolve({}), 600);

            expect(mockRedis.setex).toHaveBeenCalledWith('test:key', 600, expect.any(Object));
        });

        it('should use default TTL of 300 seconds', async () => {
            vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
            vi.spyOn(mockRedis, 'setex').mockResolvedValueOnce();

            await service.getOrSet('test:key', () => Promise.resolve({}));

            expect(mockRedis.setex).toHaveBeenCalledWith('test:key', 300, expect.any(Object));
        });
    });

    describe('set', () => {
        it('should set value without TTL', async () => {
            vi.spyOn(mockRedis, 'set').mockResolvedValue();

            await service.set('test:key', { value: 'data' });

            expect(mockRedis.set).toHaveBeenCalledWith('test:key', { value: 'data' }, undefined);
        });

        it('should set value with TTL', async () => {
            vi.spyOn(mockRedis, 'set').mockResolvedValue();

            await service.set('test:key', { value: 'data' }, 600);

            expect(mockRedis.set).toHaveBeenCalledWith('test:key', { value: 'data' }, 600);
        });
    });

    describe('get', () => {
        it('should get value from redis', async () => {
            const mockData = { value: 'test' };
            vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(mockData);

            const result = await service.get('test:key');

            expect(result).toEqual(mockData);
            expect(mockRedis.get).toHaveBeenCalledWith('test:key');
        });

        it('should return null when key not found', async () => {
            vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);

            const result = await service.get('non-existent:key');

            expect(result).toBeNull();
        });
    });

    describe('del', () => {
        it('should delete key from redis', async () => {
            vi.spyOn(mockRedis, 'del').mockResolvedValue();

            await service.del('test:key');

            expect(mockRedis.del).toHaveBeenCalledWith('test:key');
        });
    });

    describe('delPattern', () => {
        it('should delete all keys matching pattern', async () => {
            vi.spyOn(mockRedis, 'keys').mockResolvedValueOnce(['key1', 'key2', 'key3']);
            vi.spyOn(mockRedis, 'del').mockResolvedValue();

            await service.delPattern('test:*');

            expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
            expect(mockRedis.del).toHaveBeenCalledTimes(3);
        });

        it('should handle empty key list', async () => {
            vi.spyOn(mockRedis, 'keys').mockResolvedValueOnce([]);

            await expect(service.delPattern('test:*')).resolves.not.toThrow();
            expect(mockRedis.del).not.toHaveBeenCalled();
        });
    });

    describe('buildKey', () => {
        it('should build key from prefix and parts', () => {
            const result = CacheService.buildKey('prefix', 'part1', 'part2', 123);
            expect(result).toBe('prefix:part1:part2:123');
        });

        it('should handle single prefix', () => {
            const result = CacheService.buildKey('prefix');
            expect(result).toBe('prefix');
        });
    });

    describe('CACHE_KEYS', () => {
        it('should have all required cache key constants', () => {
            expect(CACHE_KEYS.OVERVIEW_STATS).toBe('overview:stats');
            expect(CACHE_KEYS.HOT_KEYWORDS).toBe('keywords:hot');
            expect(CACHE_KEYS.SENTIMENT_DATA).toBe('sentiment:data');
            expect(CACHE_KEYS.USERS_LIST).toBe('users:list');
        });

        it('should have chart related cache keys', () => {
            expect(CACHE_KEYS.CHART_AGE).toBe('chart:age');
            expect(CACHE_KEYS.CHART_WORDCLOUD).toBe('chart:wordcloud');
            expect(CACHE_KEYS.CHART_BATCH).toBe('chart:batch');
        });
    });

    describe('CACHE_TTL', () => {
        it('should have all TTL constants', () => {
            expect(CACHE_TTL.SHORT).toBe(60);
            expect(CACHE_TTL.MEDIUM).toBe(300);
            expect(CACHE_TTL.LONG).toBe(1800);
            expect(CACHE_TTL.VERY_LONG).toBe(3600);
        });
    });
});
