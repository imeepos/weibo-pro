import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserRelationNetwork } from './useUserRelationNetwork';
import { root } from '@sker/core';
import type { UserRelationNetwork } from '@sker/sdk';

const CACHE_KEY = 'user_relation_network_cache';

const mockNetwork: UserRelationNetwork = {
  nodes: [{ id: 'u1', name: 'user1', followers: 10, influence: 5, postCount: 2, verified: false, userType: 'normal' }],
  edges: [{ source: 'u1', target: 'u2', weight: 1, type: 'like', interactions: { likes: 1 } }],
  statistics: { totalUsers: 2, totalRelations: 1, avgDegree: 1, density: 1 },
};

const defaultParams = {
  relationType: 'like' as const,
  timeRange: '24h' as const,
  minWeight: 1,
  limit: 5000,
};

describe('useUserRelationNetwork 泄漏防护', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(root, 'get').mockReturnValue({
      getNetwork: vi.fn().mockResolvedValue(mockNetwork),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('请求成功后不应无限循环重新请求（network 引用变化不应触发重新 fetch）', async () => {
    // 每次返回新的对象引用，模拟真实后端每次 JSON.parse 生成新对象
    const getNetworkSpy = vi.fn().mockImplementation(async () => ({
      ...mockNetwork,
      nodes: [...mockNetwork.nodes],
      edges: [...mockNetwork.edges],
      statistics: { ...mockNetwork.statistics },
    }));
    vi.spyOn(root, 'get').mockReturnValue({ getNetwork: getNetworkSpy } as any);

    const { result } = renderHook(() => useUserRelationNetwork(defaultParams));

    // 等待首次加载完成
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 记录首次请求后的调用次数
    const callsAfterFirstFetch = getNetworkSpy.mock.calls.length;
    expect(callsAfterFirstFetch).toBeGreaterThanOrEqual(1);

    // 等待数个渲染周期，若存在 network 依赖导致的循环，调用次数会持续增长
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // 网络请求应当保持稳定，不因 setNetwork 引起的引用变化而无限增长
    const callsAfterSettle = getNetworkSpy.mock.calls.length;
    expect(callsAfterSettle).toBe(callsAfterFirstFetch);
  });

  it('enabled=false 时不应发起任何请求', async () => {
    const getNetworkSpy = vi.fn().mockResolvedValue(mockNetwork);
    vi.spyOn(root, 'get').mockReturnValue({ getNetwork: getNetworkSpy } as any);

    renderHook(() => useUserRelationNetwork({ ...defaultParams, enabled: false }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(getNetworkSpy).not.toHaveBeenCalled();
  });
});
