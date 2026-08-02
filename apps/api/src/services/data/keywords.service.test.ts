import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeywordsService } from './keywords.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';
import { PostNLPResultEntity } from '@sker/entities';

// Mock dependencies
vi.mock('@sker/entities', async () => {
    const actual = await vi.importActual('@sker/entities');
    return {
        ...actual,
        useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
    };
});

describe('KeywordsService', () => {
    let service: KeywordsService;
    let cacheService: CacheService;
    let mockQueryBuilder: any;

    beforeEach(() => {
        // 创建 mock query builder
        mockQueryBuilder = {
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            getMany: vi.fn().mockResolvedValue([]),
        };

        // Mock getRepository to return query builder
        vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
            createQueryBuilder: vi.fn(() => mockQueryBuilder),
        } as any);

        // 创建 mock cache service 并 spy getOrSet
        cacheService = new CacheService(mockRedis as any);
        vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, ttl) => {
            return fn();
        });

        service = new KeywordsService(cacheService);
        vi.clearAllMocks();
    });

    describe('getWordCloud', () => {
        it('should return empty array when no keywords exist', async () => {
            mockQueryBuilder.getMany.mockResolvedValueOnce([]);

            const result = await service.getWordCloud(100);
            expect(result).toEqual([]);
        });

        it('should aggregate keyword weights', async () => {
            const mockResults = [
                {
                    keywords: [
                        { keyword: '测试', weight: 0.5, sentiment: 'positive' },
                        { keyword: '微博', weight: 0.3, sentiment: 'neutral' },
                    ],
                },
                {
                    keywords: [
                        { keyword: '测试', weight: 0.4, sentiment: 'positive' },
                        { keyword: '舆情', weight: 0.6, sentiment: 'negative' },
                    ],
                },
            ];

            mockQueryBuilder.getMany.mockResolvedValueOnce(mockResults);

            const result = await service.getWordCloud(100);

            expect(result).toHaveLength(3);
            const testKeyword = result.find(k => k.keyword === '测试');
            expect(testKeyword?.weight).toBe(90); // (0.5 + 0.4) * 100
        });

        it('should filter by sentiment', async () => {
            const mockResults = [
                {
                    keywords: [
                        { keyword: '测试', weight: 0.5, sentiment: 'positive' },
                        { keyword: '微博', weight: 0.3, sentiment: 'neutral' },
                    ],
                },
            ];

            mockQueryBuilder.getMany.mockResolvedValueOnce(mockResults);

            const result = await service.getWordCloud(100, 'positive');
            expect(result).toHaveLength(1);
            expect(result[0]!.sentiment).toBe('positive');
        });

        it('should limit results to maxWords', async () => {
            const mockResults = [
                {
                    keywords: Array.from({ length: 150 }, (_, i) => ({
                        keyword: `word${i}`,
                        weight: 0.1,
                        sentiment: 'neutral',
                    })),
                },
            ];

            mockQueryBuilder.getMany.mockResolvedValueOnce(mockResults);

            const result = await service.getWordCloud(50);
            expect(result.length).toBeLessThanOrEqual(50);
        });

        it('should use cache', async () => {
            const cachedData = [{ keyword: 'cached', weight: 100, sentiment: 'neutral' }];
            vi.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(cachedData);

            const result = await service.getWordCloud(100);

            expect(cacheService.getOrSet).toHaveBeenCalledWith(
                expect.stringContaining('keywords:hot'),
                expect.any(Function),
                300
            );
            expect(result).toEqual(cachedData);
        });

        it('should calculate overall sentiment correctly', async () => {
            const mockResults = [
                {
                    keywords: [
                        { keyword: '测试', weight: 0.3, sentiment: 'positive' },
                        { keyword: '测试', weight: 0.3, sentiment: 'positive' },
                        { keyword: '测试', weight: 0.3, sentiment: 'negative' },
                    ],
                },
            ];

            mockQueryBuilder.getMany.mockResolvedValueOnce(mockResults);

            const result = await service.getWordCloud(100);
            const testKeyword = result.find(k => k.keyword === '测试');

            // 2 positive vs 1 negative = positive
            expect(testKeyword?.sentiment).toBe('positive');
        });
    });

    describe('CacheService integration', () => {
        it('should respect cache TTL', async () => {
            mockQueryBuilder.getMany.mockResolvedValueOnce([]);

            await service.getWordCloud(100);

            expect(cacheService.getOrSet).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Function),
                300 // CACHE_TTL.MEDIUM
            );
        });
    });
});
