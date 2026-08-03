import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsyncData } from './useChartData.core';

/**
 * 泄漏背景（2026-08-03 审计实证）：
 * useAsyncData 的重试 setTimeout（原 useChartData.core.ts:107-109）未存引用、未在 cleanup 清除。
 * 组件卸载后定时器触发 → 重新 new AbortController() → 继续重试链并对已卸载组件 setState。
 * 大屏所有图表数据 hook 均经此核心，轮询场景频繁触发。
 */
describe('useAsyncData 重试定时器卸载清理', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('卸载后重试定时器被清除，不再触发 fetch', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network'));
    const { unmount } = renderHook(() => useAsyncData(fetchFn, [], { retryCount: 3 }));

    // 让初始 fetch 完成（reject）并调度重试定时器
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);

    unmount();

    // 前进远超退避延迟（2s,4s,8s...）的时间
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    // 修复前：定时器未清除 → fetch 被再次调用（2+ 次）
    // 修复后：定时器已清除 → 仍为 1 次
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
