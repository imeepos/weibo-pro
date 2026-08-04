import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DelayService } from './delay.service';

describe('DelayService backoffStates 淘汰', () => {
  let service: DelayService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new DelayService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('recordSuccess 会删除对应退避状态', () => {
    service.recordError('account-1');
    expect(service.getErrorCount('account-1')).toBe(1);

    service.recordSuccess('account-1');
    expect(service.getErrorCount('account-1')).toBe(0);
  });

  it('超过 1 小时的过期退避状态会在下一次 recordError 时被惰性清理', async () => {
    // 第一次错误：记录状态
    service.recordError('account-stale');

    // 时间推进 2 小时，使该状态过期
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);

    // 另一次记录错误（不同 key）——触发惰性清理，过期条目应被移除
    service.recordError('account-active');

    // 过期条目已清理
    expect(service.getErrorCount('account-stale')).toBe(0);
    expect(service.getErrorCount('account-active')).toBe(1);
  });

  it('backoffDelay 对不存在的 key 直接返回（无副作用）', async () => {
    await expect(service.backoffDelay('unknown-account', 1, 60)).resolves.toBeUndefined();
  });
});
