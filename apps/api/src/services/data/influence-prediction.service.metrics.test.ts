import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InfluencePredictionService } from './influence-prediction.service';
import { useEntityManager } from '@sker/entities';
import {
  createMockQueryBuilder,
  mockEntityManagerForQuery,
  setupInfluencePredictionTest,
} from './influence-prediction.service.test-helpers';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn(),
  };
});

describe('InfluencePredictionService - 置信度与建议', () => {
  let service: InfluencePredictionService;
  let mockCacheService: any;

  beforeEach(() => {
    const harness = setupInfluencePredictionTest();
    service = harness.service;
    mockCacheService = harness.mockCacheService;
    mockCacheService.getOrSet.mockImplementation(async (key: string, factory: () => Promise<unknown>) => {
      return factory();
    });
  });

  it('should calculate confidence level correctly', async () => {
    const mockPostData = [
      {
        post_id: '1',
        user_id: '1001',
        followers_count: 50000,
        verified: true,
        text_length: 150,
        pic_num: 3,
        created_at: '2024-01-01 10:00:00',
        reposts_count: 100,
        comments_count: 50,
        attitudes_count: 30,
        keyword: '测试',
      },
    ];

    // 创建足够的历史数据以达到高置信度
    const mockHistoricalData = Array.from({ length: 10 }, (_, i) => ({
      post_id: `post-${i + 2}`,
      keyword: '测试',
      reposts_count: 100,
      comments_count: 50,
      attitudes_count: 30,
    }));

    const mockQueryBuilder = createMockQueryBuilder(mockPostData, mockHistoricalData);
    mockEntityManagerForQuery(mockQueryBuilder);

    const result = await service.getInfluencePredictionAnalysis('test-event-id');

    expect(result.confidence).toBeGreaterThan(0.7);
    expect(['high', 'medium', 'low']).toContain(result.confidenceLevel);
  });

  it('should generate recommendations', async () => {
    const mockPostData = [
      {
        post_id: '1',
        user_id: '1001',
        followers_count: 1000,
        verified: false,
        text_length: 50,
        pic_num: 0,
        created_at: '2024-01-01 03:00:00',
        reposts_count: 5,
        comments_count: 2,
        attitudes_count: 1,
        keyword: '测试',
      },
    ];

    const mockQueryBuilder = createMockQueryBuilder(mockPostData);
    mockEntityManagerForQuery(mockQueryBuilder);

    const result = await service.getInfluencePredictionAnalysis('test-event-id');

    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it('should use cache correctly', async () => {
    mockCacheService.getOrSet.mockResolvedValue({
      predictedReach: 1000,
      predictedReposts: 100,
      predictedEngagement: 150,
      confidence: 0.8,
      confidenceLevel: 'high',
      factors: [],
      predictionRange: { min: 800, max: 1200, expected: 1000 },
      similarCases: [],
      recommendations: [],
    });

    await service.getInfluencePredictionAnalysis('test-event-id');

    expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
      expect.stringContaining('influence:prediction'),
      expect.any(Function),
      expect.any(Number)
    );
  });

  it('should calculate prediction range correctly', async () => {
    const mockPostData = [
      {
        post_id: '1',
        user_id: '1001',
        followers_count: 10000,
        verified: true,
        text_length: 100,
        pic_num: 2,
        created_at: '2024-01-01 10:00:00',
        reposts_count: 50,
        comments_count: 30,
        attitudes_count: 20,
        keyword: '测试',
      },
    ];

    const mockQueryBuilder = createMockQueryBuilder(mockPostData);
    mockEntityManagerForQuery(mockQueryBuilder);

    const result = await service.getInfluencePredictionAnalysis('test-event-id');

    expect(result.predictionRange).toBeDefined();
    expect(result.predictionRange.min).toBeLessThanOrEqual(result.predictionRange.expected);
    expect(result.predictionRange.expected).toBeLessThanOrEqual(result.predictionRange.max);
  });
});
