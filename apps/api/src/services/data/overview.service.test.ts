import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OverviewService } from './overview.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';

// Mock dependencies
vi.mock('@sker/entities', async () => {
    const actual = await vi.importActual('@sker/entities');
    return {
        ...actual,
        useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
    };
});

describe('OverviewService', () => {
    let service: OverviewService;
    let cacheService: CacheService;
    let mockStatsQueryBuilder: any;
    let mockEventQueryBuilder: any;

    beforeEach(() => {
        // 创建 mock statistics query builder
        mockStatsQueryBuilder = {
            select: vi.fn().mockReturnThis(),
            addSelect: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            getRawOne: vi.fn().mockResolvedValue({
                postCount: '100',
                userCount: '50',
                commentCount: '200',
                likeCount: '300',
                repostCount: '150',
            }),
        };

        // 创建 mock event query builder (用于验证不再调用)
        mockEventQueryBuilder = {
            createQueryBuilder: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            getCount: vi.fn(),
        };

        // Mock getRepository to return appropriate query builder
        vi.spyOn(mockEntityManager, 'getRepository').mockImplementation((entity: any) => {
            if (entity.name === 'EventHourlyStatisticsEntity') {
                return {
                    createQueryBuilder: vi.fn(() => mockStatsQueryBuilder),
                };
            }
            if (entity.name === 'EventEntity') {
                return mockEventQueryBuilder;
            }
            return {
                createQueryBuilder: vi.fn(() => ({})),
            };
        });

        // 创建 mock cache service 并 spy getOrSet
        cacheService = new CacheService(mockRedis as any);
        vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, _ttl) => {
            return fn();
        });

        service = new OverviewService(cacheService);
        vi.clearAllMocks();
    });

    describe('fetchStatisticsFromTable', () => {
        it('should query eventCount from event_hourly_statistics table using COUNT(DISTINCT event_id)', async () => {
            // Mock 数据：返回3个不同事件的统计数据
            mockStatsQueryBuilder.getRawOne.mockResolvedValueOnce({
                postCount: '100',
                userCount: '50',
                commentCount: '200',
                likeCount: '300',
                repostCount: '150',
            });

            // 验证 addSelect 被调用以添加 event_id 去重计数
            const start = new Date('2025-01-01T00:00:00Z');
            const end = new Date('2025-01-02T00:00:00Z');

            await service['fetchStatisticsFromTable'](mockEntityManager, start, end);

            // 验证 select 和 addSelect 调用
            expect(mockStatsQueryBuilder.select).toHaveBeenCalledWith(
                'COALESCE(SUM(stats.post_count), 0)',
                'postCount'
            );
            expect(mockStatsQueryBuilder.addSelect).toHaveBeenCalledWith(
                'COALESCE(SUM(stats.user_count), 0)',
                'userCount'
            );
            expect(mockStatsQueryBuilder.addSelect).toHaveBeenCalledWith(
                'COALESCE(SUM(stats.comment_count), 0)',
                'commentCount'
            );
            expect(mockStatsQueryBuilder.addSelect).toHaveBeenCalledWith(
                'COALESCE(SUM(stats.like_count), 0)',
                'likeCount'
            );
            expect(mockStatsQueryBuilder.addSelect).toHaveBeenCalledWith(
                'COALESCE(SUM(stats.repost_count), 0)',
                'repostCount'
            );
            // 关键验证：应该添加 COUNT(DISTINCT event_id) 来获取事件数量
            expect(mockStatsQueryBuilder.addSelect).toHaveBeenCalledWith(
                'COALESCE(COUNT(DISTINCT stats.event_id), 0)',
                'eventCount'
            );
        });

        it('should not query events table for eventCount', async () => {
            mockStatsQueryBuilder.getRawOne.mockResolvedValueOnce({
                postCount: '100',
                userCount: '50',
                commentCount: '200',
                likeCount: '300',
                repostCount: '150',
                eventCount: '3',
            });

            const start = new Date('2025-01-01T00:00:00Z');
            const end = new Date('2025-01-02T00:00:00Z');

            await service['fetchStatisticsFromTable'](mockEntityManager, start, end);

            // 验证不再调用 EventEntity 的查询
            expect(mockEventQueryBuilder.createQueryBuilder).not.toHaveBeenCalled();
        });

        it('should return eventCount from statistics table', async () => {
            mockStatsQueryBuilder.getRawOne.mockResolvedValueOnce({
                postCount: '100',
                userCount: '50',
                commentCount: '200',
                likeCount: '300',
                repostCount: '150',
                eventCount: '5', // 5个不同事件
            });

            const start = new Date('2025-01-01T00:00:00Z');
            const end = new Date('2025-01-02T00:00:00Z');

            const result = await service['fetchStatisticsFromTable'](mockEntityManager, start, end);

            expect(result.eventCount).toBe(5);
            expect(result.postCount).toBe(100);
            expect(result.userCount).toBe(50);
            expect(result.interactionCount).toBe(650); // 200 + 300 + 150
        });

        it('should handle empty statistics gracefully', async () => {
            mockStatsQueryBuilder.getRawOne.mockResolvedValueOnce({
                postCount: null,
                userCount: null,
                commentCount: null,
                likeCount: null,
                repostCount: null,
                eventCount: null,
            });

            const start = new Date('2025-01-01T00:00:00Z');
            const end = new Date('2025-01-02T00:00:00Z');

            const result = await service['fetchStatisticsFromTable'](mockEntityManager, start, end);

            expect(result.eventCount).toBe(0);
            expect(result.postCount).toBe(0);
            expect(result.userCount).toBe(0);
            expect(result.interactionCount).toBe(0);
        });

        it('should ensure data source consistency - all stats from same table', async () => {
            mockStatsQueryBuilder.getRawOne.mockResolvedValueOnce({
                postCount: '100',
                userCount: '50',
                commentCount: '200',
                likeCount: '300',
                repostCount: '150',
                eventCount: '3',
            });

            const start = new Date('2025-01-01T00:00:00Z');
            const end = new Date('2025-01-02T00:00:00Z');

            const result = await service['fetchStatisticsFromTable'](mockEntityManager, start, end);

            // 所有数据都应该来自同一个查询
            expect(mockStatsQueryBuilder.getRawOne).toHaveBeenCalledTimes(1);

            // 验证返回值结构
            expect(result).toHaveProperty('eventCount');
            expect(result).toHaveProperty('postCount');
            expect(result).toHaveProperty('userCount');
            expect(result).toHaveProperty('interactionCount');
        });
    });

    describe('getStatistics', () => {
        it('should return consistent statistics from single data source', async () => {
            // 让 getRawOne 在每次调用时返回不同的值
            let callCount = 0;
            mockStatsQueryBuilder.getRawOne.mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    // 当前时间段数据
                    return {
                        postCount: '100',
                        userCount: '50',
                        commentCount: '200',
                        likeCount: '300',
                        repostCount: '150',
                        eventCount: '3',
                    };
                } else {
                    // 上一个时间段数据
                    return {
                        postCount: '80',
                        userCount: '40',
                        commentCount: '150',
                        likeCount: '200',
                        repostCount: '100',
                        eventCount: '2',
                    };
                }
            });

            const result = await service.getStatistics('24h');

            // 验证返回值
            expect(result.eventCount).toBe(3);
            expect(result.postCount).toBe(100);
            expect(result.userCount).toBe(50);
            expect(result.interactionCount).toBe(650);

            // 验证变化率计算 (calculateChangeRate 返回百分比)
            expect(result.eventCountChange).toBeCloseTo(50, 2); // (3-2)/2 * 100 = 50
            expect(result.postCountChange).toBeCloseTo(25, 2); // (100-80)/80 * 100 = 25
        });
    });
});
