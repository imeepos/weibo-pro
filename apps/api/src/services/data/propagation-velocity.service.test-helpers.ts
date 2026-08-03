import { vi } from 'vitest';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';
import { PropagationVelocityService } from './propagation-velocity.service';

export interface PropagationVelocityTestHarness {
  service: PropagationVelocityService;
  cacheService: CacheService;
  mockQueryBuilder: any;
}

export interface HourlyStatInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  postCount: number;
  repostCount: number;
}

/**
 * 把语义化的统计数据转换为 service 从 getRawMany 返回的原始行结构。
 */
export function createHourlyStats(data: HourlyStatInput[]) {
  return data.map(d => ({
    year: d.year,
    month: d.month,
    day: d.day,
    hour: d.hour,
    post_count: d.postCount,
    repost_count: d.repostCount,
  }));
}

/**
 * 创建一条全新的 mock query builder，链式方法均返回自身。
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

/**
 * 构造 PropagationVelocityService 测试环境：
 * - 全新的 mockQueryBuilder
 * - mockEntityManager.getRepository 返回指向该 query builder 的仓库
 * - 全新的 CacheService，且 getOrSet 直接透传回调（默认绕过缓存）
 * - 组装 PropagationVelocityService
 *
 * 每次调用都会创建独立状态，供各测试文件的 beforeEach 复用。
 */
export function setupPropagationVelocityTest(): PropagationVelocityTestHarness {
  const mockQueryBuilder = createMockQueryBuilder();

  vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  } as any);

  const cacheService = new CacheService(mockRedis as any);
  vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, _ttl) => {
    return fn();
  });

  const service = new PropagationVelocityService(cacheService);

  return { service, cacheService, mockQueryBuilder };
}
