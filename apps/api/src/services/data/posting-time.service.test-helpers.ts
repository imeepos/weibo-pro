import { vi } from 'vitest';
import { PostingTimeService } from './posting-time.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';

export interface PostingTimeTestHarness {
  service: PostingTimeService;
  cacheService: CacheService;
  mockQueryBuilder: any;
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
    setParameter: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue([]),
  };
}

export interface PostingTimePostInput {
  id?: string;
  event_id?: string;
  created_at?: Date;
}

/**
 * 创建一条帖子 fixture，默认使用本地时间避免时区问题。
 */
export function createPost(overrides: PostingTimePostInput = {}): any {
  return {
    id: '1',
    event_id: 'event-123',
    created_at: new Date('2024-01-15T14:30:00+08:00'),
    ...overrides,
  };
}

/**
 * 构造 PostingTimeService 测试环境：
 * - 全新的 mockQueryBuilder
 * - mockEntityManager.createQueryBuilder 返回该 query builder
 * - mockEntityManager.getRepository 返回指向该 query builder 的仓库
 * - 全新的 CacheService，且 getOrSet 直接透传回调（默认绕过缓存）
 * - 组装 PostingTimeService
 *
 * 每次调用都会创建独立状态，供各测试文件的 beforeEach 复用。
 */
export function setupPostingTimeTest(): PostingTimeTestHarness {
  const mockQueryBuilder = createMockQueryBuilder();

  // 直接 Mock createQueryBuilder 方法
  mockEntityManager.createQueryBuilder = vi.fn().mockReturnValue(mockQueryBuilder);

  // Mock getRepository to return query builder
  vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  } as any);

  const cacheService = new CacheService(mockRedis as any);
  vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, _ttl) => {
    return fn();
  });

  const service = new PostingTimeService(cacheService);

  return { service, cacheService, mockQueryBuilder };
}
