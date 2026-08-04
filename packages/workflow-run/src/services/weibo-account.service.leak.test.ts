import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeiboAccountService } from './weibo-account.service';
import { RateLimiterService } from './rate-limiter.service';

const { useEntityManagerMock } = vi.hoisted(() => ({
  useEntityManagerMock: vi.fn(),
}));

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual<typeof import('@sker/entities')>('@sker/entities');
  return {
    ...actual,
    useEntityManager: useEntityManagerMock,
  };
});

describe('WeiboAccountService 限流桶清理', () => {
  let service: WeiboAccountService;
  let rateLimiter: RateLimiterService;
  let mockRedis: { zrem: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = { zrem: vi.fn().mockResolvedValue(1) };
    rateLimiter = new RateLimiterService();
    service = new WeiboAccountService(mockRedis as never, rateLimiter);
  });

  it('markAccountAsExpired 应清理该账号的限流桶（账号退出释放资源）', async () => {
    // spy：验证账号过期时会调用限流桶清理
    const clearBucketSpy = vi.spyOn(rateLimiter, 'clearAccountBucket').mockImplementation(() => {});

    useEntityManagerMock.mockImplementation(async (fn: (m: unknown) => Promise<void>) => {
      await fn({
        findOne: vi.fn().mockResolvedValue({
          id: 'account-1',
          weiboNickname: 'test',
          status: 'active',
          lastCheckAt: new Date(),
        }),
        save: vi.fn(),
      });
    });

    await service.markAccountAsExpired('account-1');

    expect(clearBucketSpy).toHaveBeenCalledWith('account-1');
    expect(mockRedis.zrem).toHaveBeenCalledWith('weibo:account:health', 'account-1');
  });
});
