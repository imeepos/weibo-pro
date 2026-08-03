import { vi } from 'vitest';
import { CommunityEvolutionService } from './community-evolution.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';

/**
 * 共享测试辅助：CommunityEvolutionService 测试套件。
 *
 * 负责构造统一的 mock 环境（query builder、cache service、service 实例），
 * 供按主题拆分的多个测试文件复用，保证每个文件行为与原始单文件一致。
 */

/**
 * 创建 mock query builder（链式调用 + 默认空结果）
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
    setParameter: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue([]),
    getRawOne: vi.fn().mockResolvedValue(null),
    getMany: vi.fn().mockResolvedValue([]),
  };
}

export interface CommunityEvolutionTestContext {
  service: CommunityEvolutionService;
  cacheService: CacheService;
  mockQueryBuilder: any;
}

/**
 * 构造一次完整的 CommunityEvolutionService 测试环境：
 * - 创建 mock query builder 并让 entityManager.getRepository 返回它
 * - 创建 mock cache service（getOrSet 直接执行回调，跳过缓存）
 * - 组装 service 实例
 * - 最后 clearAllMocks，与原始 beforeEach 行为一致
 */
export function createTestService(): CommunityEvolutionTestContext {
  const mockQueryBuilder = createMockQueryBuilder();

  // Mock getRepository to return query builder
  vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  } as any);

  // 创建 mock cache service
  const cacheService = new CacheService(mockRedis as any);
  vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (_key, fn, _ttl) => {
    return fn();
  });

  const service = new CommunityEvolutionService(cacheService);

  vi.clearAllMocks();

  return { service, cacheService, mockQueryBuilder };
}

/**
 * 构造一个社区时间切片 fixture
 *
 * @param timestamp 时间戳
 * @param communities 社区列表（含 id/name/members/size）
 * @param options.modularity 模块度（默认 0）
 * @param options.totalMembers 总成员数（默认按 communities.size 求和）
 */
export function makeTimeSlice(
  timestamp: string,
  communities: any[],
  options: { modularity?: number; totalMembers?: number } = {}
) {
  return {
    timestamp,
    communities,
    modularity: options.modularity ?? 0,
    totalMembers:
      options.totalMembers ??
      communities.reduce((sum: number, c: any) => sum + (c.size ?? 0), 0),
  };
}
