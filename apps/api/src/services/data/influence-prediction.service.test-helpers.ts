import { vi } from 'vitest';
import type { EntityManager } from 'typeorm';
import { InfluencePredictionService } from './influence-prediction.service';
import { useEntityManager } from '@sker/entities';

/**
 * 创建 mock query builder：getRawMany 依次返回 postData / historicalData
 */
export function createMockQueryBuilder(postData: any[], historicalData: any[] = []): any {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    getRawMany: vi.fn(),
    getRawOne: vi.fn().mockResolvedValue({
      total_posts: postData.length + historicalData.length,
      avg_reposts: 50,
    }),
  };

  mockQueryBuilder.getRawMany.mockResolvedValueOnce(postData);
  if (historicalData.length > 0) {
    mockQueryBuilder.getRawMany.mockResolvedValueOnce(historicalData);
  }

  return mockQueryBuilder;
}

/**
 * 让 useEntityManager 透传 mock manager
 */
export function mockEntityManagerForQuery(mockQueryBuilder: any) {
  vi.mocked(useEntityManager).mockImplementation(async (callback) => {
    return callback({
      getRepository: vi.fn().mockReturnValue({
        createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
      }),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    } as unknown as EntityManager);
  });
}

export interface InfluencePredictionTestHarness {
  service: InfluencePredictionService;
  mockCacheService: any;
}

/**
 * 构造 InfluencePredictionService 测试环境
 */
export function setupInfluencePredictionTest(): InfluencePredictionTestHarness {
  const mockCacheService: any = {
    getOrSet: vi.fn(),
  };
  const service = new InfluencePredictionService(mockCacheService);
  return { service, mockCacheService };
}
