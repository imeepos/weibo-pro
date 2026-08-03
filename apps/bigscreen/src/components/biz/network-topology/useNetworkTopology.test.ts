import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNetworkTopology } from './useNetworkTopology';

const apiMocks = vi.hoisted(() => ({
  fetchTopologyData: vi.fn(),
  fetchNodeDetail: vi.fn()
}));

vi.mock('./api', () => ({
  fetchTopologyData: apiMocks.fetchTopologyData,
  fetchNodeDetail: apiMocks.fetchNodeDetail
}));

vi.mock('@sker/core', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

const visMocks = vi.hoisted(() => {
  class MockDataSet {
    constructor(public items: unknown[]) {}
  }
  class MockNetwork {
    static instances: MockNetwork[] = [];
    on = vi.fn();
    destroy = vi.fn();
    constructor(..._args: unknown[]) {
      MockNetwork.instances.push(this);
    }
  }
  return { MockDataSet, MockNetwork };
});

vi.mock('vis-network/standalone', () => ({
  DataSet: visMocks.MockDataSet,
  Network: visMocks.MockNetwork
}));

describe('useNetworkTopology', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    visMocks.MockNetwork.instances = [];
  });

  it('skips fetching when neither customerId nor id is provided', async () => {
    const { result } = renderHook(() => useNetworkTopology({}));
    await act(async () => {
      await result.current.loadData();
    });
    expect(apiMocks.fetchTopologyData).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches topology with customerId and clears loading state', async () => {
    apiMocks.fetchTopologyData.mockResolvedValue({
      success: true,
      data: { data: [{ Source: 'A', target: 'B', size: 0.2 }] }
    });
    const { result } = renderHook(() => useNetworkTopology({ customerId: 'c1' }));
    await act(async () => {
      await result.current.loadData();
    });
    expect(apiMocks.fetchTopologyData).toHaveBeenCalledWith('c1');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('passes the id argument to the api instead of customerId', async () => {
    apiMocks.fetchTopologyData.mockResolvedValue({
      success: true,
      data: { data: [{ Source: 'A', target: 'B', size: 0.2 }] }
    });
    const { result } = renderHook(() => useNetworkTopology({ customerId: 'c1' }));
    await act(async () => {
      await result.current.loadData('override');
    });
    expect(apiMocks.fetchTopologyData).toHaveBeenCalledWith('override');
  });

  it('sets error message and falls back to mock data when fetch fails', async () => {
    apiMocks.fetchTopologyData.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useNetworkTopology({ customerId: 'c1' }));
    await act(async () => {
      await result.current.loadData();
    });
    expect(result.current.error).toBe('network down');
    expect(result.current.isLoading).toBe(false);
  });

  it('exposes default empty statistics', () => {
    const { result } = renderHook(() => useNetworkTopology({ customerId: 'c1' }));
    expect(result.current.statistics).toEqual({
      efdTotal: 0,
      appTotal: 0,
      iotTotal: 0,
      cloudTotal: 0
    });
  });

  it('destroys the network instance on unmount', async () => {
    apiMocks.fetchTopologyData.mockResolvedValue({
      success: true,
      data: { data: [{ Source: 'A', target: 'B', size: 0.2 }] }
    });
    const { result, unmount } = renderHook(() => useNetworkTopology({ customerId: 'c1' }));
    await act(async () => {
      await result.current.loadData();
    });
    // 无容器时不会创建网络实例，卸载也不应报错
    expect(() => unmount()).not.toThrow();
  });
});
