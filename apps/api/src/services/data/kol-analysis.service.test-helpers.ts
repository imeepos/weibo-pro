import { vi } from 'vitest';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';
import { KOLAnalysisService } from './kol-analysis.service';

export interface KOLAnalysisTestHarness {
  service: KOLAnalysisService;
  cacheService: CacheService;
  mockQueryBuilder: any;
}

export interface KOLUserStatInput {
  userId: string;
  screenName: string;
  followersCount: number;
  verified: boolean;
  totalReposts: number;
  totalComments: number;
  totalLikes: number;
  totalPosts: number;
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
    leftJoin: vi.fn().mockReturnThis(),
    setParameter: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue([]),
    getMany: vi.fn().mockResolvedValue([]),
  };
}

/**
 * 把语义化的用户统计输入转换为 service 从 getRawMany 返回的原始行结构。
 */
export function createUserStatRows(data: KOLUserStatInput[]) {
  return data.map(d => ({
    user_id: d.userId,
    screen_name: d.screenName,
    followers_count: d.followersCount,
    verified: d.verified,
    total_reposts: d.totalReposts,
    total_comments: d.totalComments,
    total_likes: d.totalLikes,
    total_posts: d.totalPosts,
  }));
}

/**
 * 构造 KOLAnalysisService 测试环境：
 * - 全新的 mockQueryBuilder
 * - mockEntityManager.getRepository 返回指向该 query builder 的仓库
 * - 全新的 CacheService，且 getOrSet 直接透传回调（默认绕过缓存）
 * - 组装 KOLAnalysisService
 *
 * 每次调用都会创建独立状态，供各测试文件的 beforeEach 复用。
 */
export function setupKOLAnalysisTest(): KOLAnalysisTestHarness {
  const mockQueryBuilder = createMockQueryBuilder();

  vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  } as any);

  const cacheService = new CacheService(mockRedis as any);
  vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fn, _ttl) => {
    return fn();
  });

  const service = new KOLAnalysisService(cacheService);

  return { service, cacheService, mockQueryBuilder };
}
