/**
 * SpreadBreadthService 测试共享辅助
 */

import { vi } from 'vitest';
import { SpreadBreadthService } from './spread-breadth.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';

/**
 * 创建 mock query builder
 */
export function createMockQueryBuilder(): any {
  return {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    setParameter: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue([]),
    getMany: vi.fn().mockResolvedValue([]),
  };
}

export interface SpreadBreadthTestContext {
  service: SpreadBreadthService;
  cacheService: CacheService;
  mockQueryBuilder: any;
  mockEntityManager: any;
}

/**
 * 组装测试环境
 */
export function setupSpreadBreadthTest(): SpreadBreadthTestContext {
  const mockQueryBuilder = createMockQueryBuilder();

  // Mock getRepository to return query builder
  vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  } as any);

  // 创建 mock cache service
  const cacheService = new CacheService(mockRedis as any);
  vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, _ttl) => {
    return fn();
  });

  const service = new SpreadBreadthService(cacheService);
  vi.clearAllMocks();

  return { service, cacheService, mockQueryBuilder, mockEntityManager };
}

/**
 * 构造帖子数据
 */
export function mockPosts(ids: string[]) {
  return ids.map(id => ({ postId: id }));
}
