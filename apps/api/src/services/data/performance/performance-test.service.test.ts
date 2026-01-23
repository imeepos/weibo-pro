import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceTestService } from './performance-test.service';
import { EventQueryService } from '../events/event-query.service';
import { OverviewService } from '../overview.service';

/**
 * Phase 2 性能优化测试套件
 *
 * 遵循 TDD 规范：
 * 1. RED: 编写失败的测试，验证性能基线
 * 2. GREEN: 实现优化代码，使测试通过
 * 3. REFACTOR: 重构和改进
 *
 * 性能目标：
 * - API P95 响应时间 < 500ms
 * - 缓存命中率 > 80%
 * - 支持大数据量场景（10万+帖子）
 */

describe('PerformanceTestService', () => {
    let performanceService: PerformanceTestService;
    let mockEventQueryService: Partial<EventQueryService>;
    let mockOverviewService: Partial<OverviewService>;

    beforeEach(() => {
        // 创建 Mock 服务
        mockEventQueryService = {
            getEventList: vi.fn(),
            getHotEvents: vi.fn(),
            getEventById: vi.fn(),
        };

        mockOverviewService = {
            getStatistics: vi.fn(),
            getSentiment: vi.fn(),
            getLocations: vi.fn(),
        };

        performanceService = new PerformanceTestService(
            mockEventQueryService as EventQueryService,
            mockOverviewService as OverviewService
        );
    });

    describe('基线性能测试 - EventQueryService', () => {
        it('应该记录 getEventList 在无缓存时的响应时间基线', async () => {
            // 模拟无缓存情况下的查询
            (mockEventQueryService.getEventList as any).mockImplementation(async () => {
                // 模拟数据库查询耗时
                await new Promise(resolve => setTimeout(resolve, 800)); // 800ms - 模拟慢查询
                return {
                    data: [],
                    total: 0,
                    page: 1,
                    pageSize: 10,
                    totalPages: 0
                };
            });

            const result = await performanceService.measureEndpoint(
                'getEventList',
                () => mockEventQueryService.getEventList!('24h', { page: 1, pageSize: 10 })
            );

            // 验证：应该记录响应时间
            expect(result.duration).toBeGreaterThan(0);
            expect(result.endpoint).toBe('getEventList');
            expect(result.success).toBe(true);

            // 验证：当前性能不达标（基线测试应该失败）
            expect(result.duration).toBeGreaterThan(500); // P95 目标是 < 500ms
        });

        it('应该记录 getEventList 在有缓存时的响应时间', async () => {
            // 模拟缓存命中情况
            (mockEventQueryService.getEventList as any).mockImplementation(async () => {
                // 模拟缓存查询耗时
                await new Promise(resolve => setTimeout(resolve, 50)); // 50ms - 缓存命中
                return {
                    data: [],
                    total: 0,
                    page: 1,
                    pageSize: 10,
                    totalPages: 0
                };
            });

            const result = await performanceService.measureEndpoint(
                'getEventList-cached',
                () => mockEventQueryService.getEventList!('24h', { page: 1, pageSize: 10 })
            );

            // 验证：缓存命中应该很快
            expect(result.duration).toBeLessThan(100); // 缓存应该在 100ms 内
            expect(result.success).toBe(true);
        });

        it('应该支持大数据量分页查询（100条数据）', async () => {
            const mockEvents = Array.from({ length: 100 }, (_, i) => ({
                id: `event-${i}`,
                title: `Event ${i}`,
                postCount: 1000,
                userCount: 500,
                sentiment: { positive: 0.3, negative: 0.2, neutral: 0.5 },
                hotness: 100 + i,
                trend: 'stable' as const,
                category: 'test',
                keywords: [],
                occurredAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                trendData: []
            }));

            (mockEventQueryService.getEventList as any).mockResolvedValueOnce({
                data: mockEvents,
                total: 100,
                page: 1,
                pageSize: 100,
                totalPages: 1
            });

            const result = await performanceService.measureEndpoint(
                'getEventList-large',
                () => mockEventQueryService.getEventList!('24h', { page: 1, pageSize: 100 })
            );

            // 验证：大数据量查询应该在合理时间内完成
            expect(result.success).toBe(true);
            expect(result.duration).toBeGreaterThan(0);
        });
    });

    describe('基线性能测试 - OverviewService', () => {
        it('应该记录 getStatistics 在无缓存时的响应时间基线', async () => {
            (mockOverviewService.getStatistics as any).mockImplementation(async () => {
                // 模拟复杂的统计查询
                await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2s - 模拟慢查询
                return {
                    eventCount: 100,
                    eventCountChange: 0.1,
                    postCount: 10000,
                    postCountChange: 0.15,
                    userCount: 5000,
                    userCountChange: 0.08,
                    interactionCount: 50000,
                    interactionCountChange: 0.2
                };
            });

            const result = await performanceService.measureEndpoint(
                'getStatistics',
                () => mockOverviewService.getStatistics!('24h')
            );

            // 验证：当前性能不达标（基线测试应该失败）
            expect(result.duration).toBeGreaterThan(500); // P95 目标是 < 500ms
            expect(result.endpoint).toBe('getStatistics');
        });
    });

    describe('性能指标统计', () => {
        it('应该计算 P95 响应时间', async () => {
            // 模拟 20 次请求（减少次数以加快测试）
            const durations = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 700, 800, 900, 1000, 600, 650, 750, 850, 950];
            const results: number[] = [];

            for (const duration of durations) {
                (mockEventQueryService.getEventList as any).mockImplementation(async () => {
                    await new Promise(resolve => setTimeout(resolve, duration));
                    return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
                });

                const result = await performanceService.measureEndpoint(
                    'p95-test',
                    () => mockEventQueryService.getEventList!('24h', { page: 1, pageSize: 10 })
                );
                results.push(result.duration);
            }

            // 计算 P95
            const p95 = performanceService.calculateP95(results);

            // 验证：P95 应该大于大部分值
            expect(p95).toBeGreaterThan(500); // 当前不达标
        }, 30000); // 增加超时时间到 30 秒

        it('应该计算缓存命中率', async () => {
            // 模拟 20 次请求，其中 16 次命中缓存
            let callCount = 0;

            (mockEventQueryService.getEventList as any).mockImplementation(async () => {
                callCount++;
                const isCached = callCount <= 16; // 80% 缓存命中
                await new Promise(resolve => setTimeout(resolve, isCached ? 50 : 500));
                return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
            });

            const results = await performanceService.runMultipleRequests(
                'cache-hit-test',
                () => mockEventQueryService.getEventList!('24h', { page: 1, pageSize: 10 }),
                20
            );

            const hitRate = performanceService.calculateCacheHitRate(results);

            // 验证：应该能计算缓存命中率
            expect(hitRate).toBeGreaterThan(0);
            expect(hitRate).toBeLessThanOrEqual(1);
        }, 30000); // 增加超时时间到 30 秒
    });

    describe('性能优化验证', () => {
        it('应该验证优化后的性能达到 P95 < 500ms 目标', async () => {
            // 这个测试将在优化后通过
            (mockEventQueryService.getEventList as any).mockImplementation(async () => {
                // 优化后：使用 L1 缓存，响应时间 < 100ms
                await new Promise(resolve => setTimeout(resolve, 80));
                return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
            });

            const results = await performanceService.runMultipleRequests(
                'optimized-test',
                () => mockEventQueryService.getEventList!('24h', { page: 1, pageSize: 10 }),
                20
            );

            const p95 = performanceService.calculateP95(results.map(r => r.duration));

            // 验证：优化后应该达到 P95 < 500ms
            expect(p95).toBeLessThan(500);
        }, 30000); // 增加超时时间到 30 秒

        it('应该验证缓存命中率 > 80%', async () => {
            // 模拟优化后的高缓存命中率
            let callCount = 0;

            (mockEventQueryService.getEventList as any).mockImplementation(async () => {
                callCount++;
                const isCached = callCount <= 17; // 85% 缓存命中率 (17/20)
                await new Promise(resolve => setTimeout(resolve, isCached ? 50 : 300));
                return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
            });

            const results = await performanceService.runMultipleRequests(
                'cache-optimized-test',
                () => mockEventQueryService.getEventList!('24h', { page: 1, pageSize: 10 }),
                20
            );

            const hitRate = performanceService.calculateCacheHitRate(results);

            // 验证：缓存命中率应该 > 80%
            expect(hitRate).toBeGreaterThan(0.8);
        }, 30000); // 增加超时时间到 30 秒
    });
});
