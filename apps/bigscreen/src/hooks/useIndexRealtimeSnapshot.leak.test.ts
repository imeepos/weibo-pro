import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIndexRealtimeSnapshot } from './useIndexRealtimeSnapshot';
import { OverviewAPI } from '@/services/api';
import { useAppStore } from '@/stores/useAppStore';
import type { OverviewRealtimeSnapshot } from '@sker/sdk';

function makeSnapshot(timeRange: string): OverviewRealtimeSnapshot {
  return {
    timeRange: timeRange as any,
    generatedAt: `2026-08-04T00:00:00.000Z-${timeRange}`,
    cacheTtlSeconds: 10,
    statistics: {} as any,
    sentiment: {} as any,
    locations: [],
    hotEvents: [],
    wordCloud: [],
    emotionCurve: {} as any,
    eventTypes: {} as any,
    userRelationNetwork: {} as any,
  };
}

describe('useIndexRealtimeSnapshot 稳定性', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useAppStore.getState().reset();
    vi.spyOn(OverviewAPI, 'getRealtimeSnapshot').mockResolvedValue(makeSnapshot('all'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    useAppStore.getState().reset();
  });

  it('切换 timeRange 时在途旧请求不应把过期数据写入 state（竞态防护）', async () => {
    // 手动控制两次请求的 resolve，模拟竞态
    let resolveOld!: (v: OverviewRealtimeSnapshot) => void;
    let resolveNew!: (v: OverviewRealtimeSnapshot) => void;
    const oldSnapshot = makeSnapshot('all');
    const newSnapshot = makeSnapshot('7d');

    const getSpy = vi
      .spyOn(OverviewAPI, 'getRealtimeSnapshot')
      .mockImplementationOnce(
        () => new Promise<OverviewRealtimeSnapshot>((res) => { resolveOld = res; })
      )
      .mockImplementationOnce(
        () => new Promise<OverviewRealtimeSnapshot>((res) => { resolveNew = res; })
      );

    const { result } = renderHook(() => useIndexRealtimeSnapshot(10_000));

    // 首次请求（timeRange=all）在途
    await act(async () => {
      await Promise.resolve();
    });
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenLastCalledWith('all');

    // 切换到 7d → effect 重建，触发第二次请求
    act(() => {
      useAppStore.getState().setSelectedTimeRange('7d');
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenLastCalledWith('7d');

    // 旧请求（all）此刻返回——应被 requestId 校验丢弃
    await act(async () => {
      resolveOld(oldSnapshot);
      await Promise.resolve();
    });
    expect(result.current.data).toBeNull();

    // 新请求（7d）返回——才应写入 state
    await act(async () => {
      resolveNew(newSnapshot);
      await Promise.resolve();
    });
    expect(result.current.data?.timeRange).toBe('7d');
  });

  it('请求悬挂超时后应复位互斥锁，后续轮询仍可刷新（不永久冻结）', async () => {
    let resolveHanging!: () => void;
    const hanging = new Promise<OverviewRealtimeSnapshot>(() => {});
    const snapshot = makeSnapshot('all');

    const getSpy = vi
      .spyOn(OverviewAPI, 'getRealtimeSnapshot')
      // 第一次请求悬挂（永不 resolve）
      .mockImplementationOnce(() => hanging)
      // 超时后的下一次刷新正常返回
      .mockResolvedValueOnce(snapshot);

    // refreshInterval 调大到 60s，避免 advanceTimersByTimeAsync 同时触发 interval 轮询干扰断言
    const { result } = renderHook(() => useIndexRealtimeSnapshot(60_000));

    // 首次请求悬挂中
    await act(async () => {
      await Promise.resolve();
    });
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    // 超过 REQUEST_TIMEOUT_MS(10s)，悬挂请求被超时拒绝，互斥锁复位
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('请求超时');

    // 触发一次轮询刷新——互斥锁已复位，应能正常发起并拿到数据
    act(() => {
      result.current.refetch();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(result.current.data?.timeRange).toBe('all');
    expect(result.current.error).toBeNull();
  });
});
