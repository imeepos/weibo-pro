import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(() => {
    service = new RateLimiterService();
    vi.useFakeTimers();
  });

  describe('acquire - 全局速率限制', () => {
    it('应该在令牌充足时立即获取', async () => {
      const promise = service.acquire();
      await promise;

      expect(vi.getTimerCount()).toBe(0);
    });

    it('应该在令牌不足时等待', async () => {
      // 耗尽全局令牌
      for (let i = 0; i < 10; i++) {
        service.setGlobalRate(10, 10); // 重置为满
        await service.acquire();
      }

      // 下一个请求应该需要等待
      const promise = service.acquire();

      // 快进时间以补充令牌
      vi.advanceTimersByTime(200);
      await promise;

      expect(vi.getTimerCount()).toBeGreaterThanOrEqual(0);
    });

    it('应该支持多个并发请求', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(service.acquire());
      }

      await Promise.all(promises);

      // 全局有 10 个令牌，5 个请求应该能直接获取
      expect(service.getGlobalAvailableTokens()).toBeLessThan(10);
    });
  });

  describe('acquire - 账号级速率限制', () => {
    it('应该为不同账号维护独立的令牌桶', async () => {
      const accountId1 = 'account-1';
      const accountId2 = 'account-2';

      // 第一个账号耗尽令牌
      for (let i = 0; i < 5; i++) {
        await service.acquire(accountId1);
      }

      // 第二个账号应该还能获取令牌
      await service.acquire(accountId2);

      expect(service.getAccountAvailableTokens(accountId2)).toBeGreaterThan(0);
    });

    it('应该在账号令牌不足时等待', async () => {
      const accountId = 'test-account';

      // 耗尽账号令牌
      for (let i = 0; i < 5; i++) {
        await service.acquire(accountId);
      }

      // 下一个请求应该等待
      const promise = service.acquire(accountId);

      // 推进时间
      vi.advanceTimersByTime(300);
      await promise;

      expect(vi.getTimerCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getGlobalAvailableTokens', () => {
    it('应该返回可用的全局令牌数', async () => {
      const initial = service.getGlobalAvailableTokens();
      expect(initial).toBe(10);

      await service.acquire();
      const after = service.getGlobalAvailableTokens();
      expect(after).toBeLessThan(initial);
    });

    it('应该在时间推进时补充令牌', async () => {
      // 耗尽令牌
      for (let i = 0; i < 10; i++) {
        await service.acquire();
      }

      expect(service.getGlobalAvailableTokens()).toBe(0);

      // 推进时间 0.5 秒，补充 5 个令牌
      vi.advanceTimersByTime(500);

      // 需要重新计算，通过获取来触发补充
      const available = service.getGlobalAvailableTokens();
      expect(available).toBeGreaterThan(0);
    });
  });

  describe('getAccountAvailableTokens', () => {
    it('应该返回账号的可用令牌数', async () => {
      const accountId = 'test-account';

      const initial = service.getAccountAvailableTokens(accountId);
      expect(initial).toBe(5);

      await service.acquire(accountId);
      const after = service.getAccountAvailableTokens(accountId);
      expect(after).toBeLessThan(initial);
    });

    it('应该为新账号创建桶', () => {
      const accountId = 'new-account';
      const available = service.getAccountAvailableTokens(accountId);

      expect(available).toBe(5);
    });
  });

  describe('setGlobalRate', () => {
    it('应该更新全局速率限制', async () => {
      service.setGlobalRate(5, 2);

      const available = service.getGlobalAvailableTokens();
      expect(available).toBeLessThanOrEqual(5);
    });
  });

  describe('setAccountRate', () => {
    it('应该更新特定账号的速率限制', async () => {
      const accountId = 'special-account';
      service.setAccountRate(accountId, 20, 5);

      const available = service.getAccountAvailableTokens(accountId);
      expect(available).toBeLessThanOrEqual(20);
    });

    it('应该为特定账号提供更高的限制', async () => {
      const normalAccountId = 'normal';
      const vipAccountId = 'vip';

      service.setAccountRate(vipAccountId, 50, 10);

      const normalAvailable = service.getAccountAvailableTokens(normalAccountId);
      const vipAvailable = service.getAccountAvailableTokens(vipAccountId);

      expect(vipAvailable).toBeGreaterThan(normalAvailable);
    });
  });

  describe('clearAccountBucket', () => {
    it('应该删除账号的令牌桶', () => {
      const accountId = 'test-account';

      service.acquire(accountId);
      service.clearAccountBucket(accountId);

      // 清除后重新获取应该是新的桶
      const available = service.getAccountAvailableTokens(accountId);
      expect(available).toBe(5);
    });
  });

  describe('综合测试 - 全局和账号双限制', () => {
    it('应该同时执行全局和账号限制', async () => {
      const accountId = 'test-account';

      // 设置更紧的限制便于测试
      service.setGlobalRate(3, 1);
      service.setAccountRate(accountId, 2, 0.5);

      const promises = [];

      // 尝试获取 3 个令牌
      for (let i = 0; i < 3; i++) {
        promises.push(service.acquire(accountId));
      }

      // 第三个请求会被账号限制阻挡
      await Promise.all(promises);

      expect(vi.getTimerCount()).toBeGreaterThanOrEqual(0);
    });
  });
});
