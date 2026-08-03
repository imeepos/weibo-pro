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

describe('InfluencePredictionService - 分析与因子', () => {
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

  it('should return default structure for empty data', async () => {
    const mockQueryBuilder = createMockQueryBuilder([]);
    mockEntityManagerForQuery(mockQueryBuilder);

    const result = await service.getInfluencePredictionAnalysis('test-event-id');

    expect(result.predictedReach).toBe(0);
    expect(result.predictedReposts).toBe(0);
    expect(result.predictedEngagement).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.confidenceLevel).toBe('low');
    expect(result.factors).toHaveLength(7);
    expect(result.similarCases).toEqual([]);
    expect(result.recommendations).toEqual([]);
  });

  it('should calculate influence prediction with valid data', async () => {
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

    const mockHistoricalData = [
      {
        post_id: '2',
        keyword: '测试',
        reposts_count: 100,
        comments_count: 60,
        attitudes_count: 40,
      },
    ];

    const mockQueryBuilder = createMockQueryBuilder(mockPostData, mockHistoricalData);
    mockEntityManagerForQuery(mockQueryBuilder);

    const result = await service.getInfluencePredictionAnalysis('test-event-id');

    expect(result.predictedReach).toBeGreaterThan(0);
    expect(result.predictedReposts).toBeGreaterThan(0);
    expect(result.predictedEngagement).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.factors).toHaveLength(7);
    expect(result.factors[0]!.name).toBe('用户粉丝数');
    expect(result.similarCases.length).toBeGreaterThan(0);
  });

  it('should extract factors correctly', async () => {
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

    expect(result.factors).toHaveLength(7);

    const factorNames = result.factors.map(f => f.name);
    expect(factorNames).toContain('用户粉丝数');
    expect(factorNames).toContain('是否认证');
    expect(factorNames).toContain('内容长度');
    expect(factorNames).toContain('是否有媒体');
    expect(factorNames).toContain('发布时间');
    expect(factorNames).toContain('话题热度');
    expect(factorNames).toContain('初始互动');

    result.factors.forEach(factor => {
      expect(factor.weight).toBeGreaterThan(0);
      expect(factor.value).toBeGreaterThanOrEqual(0);
      expect(['positive', 'negative', 'neutral']).toContain(factor.impact);
    });
  });

  it('should find similar cases correctly', async () => {
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

    const mockHistoricalData = [
      {
        post_id: '2',
        keyword: '测试',
        reposts_count: 80,
        comments_count: 40,
        attitudes_count: 30,
      },
      {
        post_id: '3',
        keyword: '其他',
        reposts_count: 20,
        comments_count: 10,
        attitudes_count: 5,
      },
    ];

    const mockQueryBuilder = createMockQueryBuilder(mockPostData, mockHistoricalData);
    mockEntityManagerForQuery(mockQueryBuilder);

    const result = await service.getInfluencePredictionAnalysis('test-event-id');

    expect(result.similarCases.length).toBeGreaterThan(0);
    result.similarCases.forEach(similarCase => {
      expect(similarCase.postId).toBeDefined();
      expect(similarCase.similarity).toBeGreaterThanOrEqual(0);
      expect(similarCase.similarity).toBeLessThanOrEqual(1);
      expect(similarCase.actualReach).toBeGreaterThanOrEqual(0);
      expect(similarCase.actualReposts).toBeGreaterThanOrEqual(0);
      expect(similarCase.actualEngagement).toBeGreaterThanOrEqual(0);
    });
  });
});
