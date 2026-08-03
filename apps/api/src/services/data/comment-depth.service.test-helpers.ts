import { vi } from 'vitest';
import { CommentDepthService } from './comment-depth.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';

export interface CommentDepthTestHarness {
  service: CommentDepthService;
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
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    setParameter: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue([]),
    getMany: vi.fn().mockResolvedValue([]),
  };
}

export interface CommentFixtureInput {
  id?: string;
  rootid?: string;
  floor_number?: number;
  text?: string;
  post_id?: string;
  user_id?: number;
  reply_to_user_id?: number;
  created_at?: string;
}

/**
 * 创建一条语义化的评论 fixture，默认值为一级评论。
 */
export function createComment(overrides: CommentFixtureInput = {}): any {
  return {
    id: '1',
    rootid: '1',
    floor_number: 1,
    text: '评论',
    post_id: 'post1',
    user_id: 101,
    reply_to_user_id: 100,
    created_at: '2024-01-01',
    ...overrides,
  };
}

/**
 * 构造 CommentDepthService 测试环境：
 * - 全新的 mockQueryBuilder
 * - mockEntityManager.createQueryBuilder 返回该 query builder
 * - 全新的 CacheService，且 getOrSet 直接透传回调（默认绕过缓存）
 * - 组装 CommentDepthService
 *
 * 每次调用都会创建独立状态，供各测试文件的 beforeEach 复用。
 */
export function setupCommentDepthTest(): CommentDepthTestHarness {
  const mockQueryBuilder = createMockQueryBuilder();

  // Mock createQueryBuilder 直接在 manager 上
  vi.spyOn(mockEntityManager, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

  const cacheService = new CacheService(mockRedis as any);
  vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, _ttl) => {
    return fn();
  });

  const service = new CommentDepthService(cacheService);

  return { service, cacheService, mockQueryBuilder };
}
