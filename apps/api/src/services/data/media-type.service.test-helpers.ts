import { vi } from 'vitest';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';
import { MediaTypeService } from './media-type.service';
import { WeiboPostEntity } from '@sker/entities';

export interface MediaTypeTestHarness {
  service: MediaTypeService;
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
    innerJoin: vi.fn().mockReturnThis(),
    setParameter: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue([]),
    getMany: vi.fn().mockResolvedValue([]),
  };
}

/**
 * 创建一条 mock WeiboPostEntity，支持覆盖字段。
 */
export function createMockPost(overrides: any): WeiboPostEntity {
  const base: any = {
    id: '1',
    event_id: 'event-123',
    pic_ids: [],
    page_info: null,
    url_struct: [],
    attitudes_count: 0,
    comments_count: 0,
    reposts_count: 0,
    created_at: new Date(),
  };
  return { ...base, ...overrides } as WeiboPostEntity;
}

/**
 * 构造 MediaTypeService 测试环境：
 * - 全新的 mockQueryBuilder
 * - mockEntityManager.getRepository 返回指向该 query builder 的仓库
 * - 全新的 CacheService，且 getOrSet 直接透传回调（默认绕过缓存）
 * - 组装 MediaTypeService
 *
 * 每次调用都会创建独立状态，供各测试文件的 beforeEach 复用。
 */
export function setupMediaTypeServiceTest(): MediaTypeTestHarness {
  const mockQueryBuilder = createMockQueryBuilder();

  vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  } as any);

  const cacheService = new CacheService(mockRedis as any);
  vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, _ttl) => {
    return fn();
  });

  const service = new MediaTypeService(cacheService);

  return { service, cacheService, mockQueryBuilder };
}
