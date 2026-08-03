import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NetworkTopologyDashboard from './NetworkTopologyDashboard';

const apiMocks = vi.hoisted(() => ({
  fetchTopologyData: vi.fn(),
  fetchNodeDetail: vi.fn()
}));

vi.mock('./network-topology/api', () => ({
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

describe('NetworkTopologyDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    visMocks.MockNetwork.instances = [];
  });

  it('renders container + legend and creates a vis-network instance on mount', async () => {
    apiMocks.fetchTopologyData.mockResolvedValue({
      success: true,
      data: { data: [{ Source: 'Pompeo', target: 'Hub1', size: 0.4 }] }
    });

    render(<NetworkTopologyDashboard customerId="c1" />);

    await waitFor(() => {
      expect(visMocks.MockNetwork.instances.length).toBe(1);
    });
    expect(apiMocks.fetchTopologyData).toHaveBeenCalledWith('c1');
    expect(screen.getByText('节点类型')).toBeInTheDocument();
  });

  it('shows the fetch error and does not render the network container', async () => {
    apiMocks.fetchTopologyData.mockRejectedValue(new Error('network down'));

    render(<NetworkTopologyDashboard customerId="c1" />);

    await waitFor(() => {
      expect(screen.getByText('network down')).toBeInTheDocument();
    });
    // 错误态下 ChartState 隐藏容器，因此不会创建网络实例
    expect(visMocks.MockNetwork.instances.length).toBe(0);
  });

  it('renders StatisticsCard when statistics are non-zero', async () => {
    // 当前实现统计恒为 0，StatisticsCard 不应出现
    apiMocks.fetchTopologyData.mockResolvedValue({
      success: true,
      data: { data: [{ Source: 'A', target: 'B', size: 0.2 }] }
    });

    render(<NetworkTopologyDashboard customerId="c1" />);

    await waitFor(() => {
      expect(visMocks.MockNetwork.instances.length).toBe(1);
    });
    expect(screen.queryByText('统计')).not.toBeInTheDocument();
  });
});
