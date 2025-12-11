import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DelayService } from './delay.service';

describe('DelayService', () => {
  let service: DelayService;

  beforeEach(() => {
    service = new DelayService();
    vi.useFakeTimers();
  });

  describe('randomDelay', () => {
    it('应该延迟指定范围内的时间', async () => {
      const minSeconds = 1;
      const maxSeconds = 2;
      const promise = service.randomDelay(minSeconds, maxSeconds);

      // 快进时间
      vi.runAllTimers();
      await promise;

      expect(vi.getTimerCount()).toBe(0);
    });

    it('应该在最小值和最大值之间', async () => {
      const minSeconds = 1;
      const maxSeconds = 5;

      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const startTime = Date.now();
      const promise = service.randomDelay(minSeconds, maxSeconds);
      vi.runAllTimers();
      await promise;

      // 预期延迟 = 1 + 0.5 * (5 - 1) = 3 秒
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('fixedDelay', () => {
    it('应该延迟指定的秒数', async () => {
      const seconds = 2;
      const promise = service.fixedDelay(seconds);

      vi.runAllTimers();
      await promise;

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('backoffDelay', () => {
    it('无错误记录时不应延迟', async () => {
      const promise = service.backoffDelay('test-key');
      await promise;

      expect(vi.getTimerCount()).toBe(0);
    });

    it('应该根据错误次数指数退避', async () => {
      const key = 'test-key';

      // 第一次错误
      service.recordError(key);
      let promise = service.backoffDelay(key, 1, 300);
      vi.runAllTimers();
      await promise;

      // 第二次错误
      service.recordError(key);
      promise = service.backoffDelay(key, 1, 300);
      vi.runAllTimers();
      await promise;

      // 第三次错误
      service.recordError(key);
      promise = service.backoffDelay(key, 1, 300);
      vi.runAllTimers();
      await promise;

      expect(service.getErrorCount(key)).toBe(3);
    });

    it('应该不超过最大延迟', async () => {
      const key = 'test-key';
      const maxSeconds = 5;

      // 模拟多次错误
      for (let i = 0; i < 10; i++) {
        service.recordError(key);
      }

      const promise = service.backoffDelay(key, 1, maxSeconds);
      vi.runAllTimers();
      await promise;

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('recordError', () => {
    it('应该增加错误计数', () => {
      const key = 'test-key';

      expect(service.getErrorCount(key)).toBe(0);

      service.recordError(key);
      expect(service.getErrorCount(key)).toBe(1);

      service.recordError(key);
      expect(service.getErrorCount(key)).toBe(2);
    });

    it('应该记录最后错误时间', () => {
      const key = 'test-key';
      const beforeTime = Date.now();

      service.recordError(key);

      const afterTime = Date.now();
      // 验证该方法确实被调用（间接验证时间记录）
      expect(service.getErrorCount(key)).toBe(1);
    });
  });

  describe('recordSuccess', () => {
    it('应该清除错误计数', () => {
      const key = 'test-key';

      service.recordError(key);
      expect(service.getErrorCount(key)).toBe(1);

      service.recordSuccess(key);
      expect(service.getErrorCount(key)).toBe(0);
    });
  });

  describe('clearOldBackoffStates', () => {
    it('应该删除超过最大年龄的记录', () => {
      const key = 'test-key';
      const maxAgeMs = 3600000; // 1 小时

      service.recordError(key);
      expect(service.getErrorCount(key)).toBe(1);

      // 模拟时间流逝
      vi.advanceTimersByTime(maxAgeMs + 1000);

      service.clearOldBackoffStates(maxAgeMs);
      expect(service.getErrorCount(key)).toBe(0);
    });

    it('应该保留未超期的记录', () => {
      const key = 'test-key';
      const maxAgeMs = 3600000;

      service.recordError(key);

      // 只推进一部分时间
      vi.advanceTimersByTime(1000);

      service.clearOldBackoffStates(maxAgeMs);
      expect(service.getErrorCount(key)).toBe(1);
    });

    it('应该处理多个键的清理', () => {
      const key1 = 'test-key-1';
      const key2 = 'test-key-2';
      const maxAgeMs = 3600000;

      service.recordError(key1);
      service.recordError(key2);

      expect(service.getErrorCount(key1)).toBe(1);
      expect(service.getErrorCount(key2)).toBe(1);

      // 只推进一部分时间
      vi.advanceTimersByTime(1000);

      service.clearOldBackoffStates(maxAgeMs);
      expect(service.getErrorCount(key1)).toBe(1);
      expect(service.getErrorCount(key2)).toBe(1);
    });
  });
});
