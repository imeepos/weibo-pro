import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import UserEngagementFunnel from './UserEngagementFunnel';
import type { UserStratification } from '@sker/sdk';
import * as echarts from 'echarts';

const mockChartInstance = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('echarts', () => ({
  init: vi.fn(() => mockChartInstance),
  default: {
    init: vi.fn(() => mockChartInstance),
  },
}));

const mockStratificationData: UserStratification = {
  layers: [
    { name: 'core', count: 10, percentage: 20, avgEngagement: 15, color: '#f59e0b' },
    { name: 'active', count: 20, percentage: 40, avgEngagement: 5, color: '#3b82f6' },
    { name: 'casual', count: 15, percentage: 30, avgEngagement: 1.5, color: '#10b981' },
    { name: 'lurker', count: 5, percentage: 10, avgEngagement: 0, color: '#6b7280' },
  ],
  engagementGini: 0.45,
  totalUsers: 50,
  summary: {
    coreRatio: 0.2,
    activeRatio: 0.6,
    paretoIndex: 0.55,
  },
};

describe('UserEngagementFunnel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染当前统计面板信息', () => {
    render(<UserEngagementFunnel data={mockStratificationData} />);

    expect(screen.getByText('统计信息')).toBeInTheDocument();
    expect(screen.getByText('总用户数:')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('基尼系数:')).toBeInTheDocument();
    expect(screen.getByText('45.0%')).toBeInTheDocument();
    expect(screen.getByText('核心用户占比:')).toBeInTheDocument();
    expect(screen.getByText('活跃用户占比:')).toBeInTheDocument();
    expect(screen.getByText('帕累托指数:')).toBeInTheDocument();
  });

  it('初始化 ECharts 并写入漏斗图配置', async () => {
    render(<UserEngagementFunnel data={mockStratificationData} />);

    expect(echarts.init).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockChartInstance.setOption).toHaveBeenCalled();
    });

    const option = mockChartInstance.setOption.mock.calls[0][0];
    expect(option.title.text).toBe('用户参与度分层');
    expect(option.series[0].type).toBe('funnel');
    expect(option.series[0].data[0].name).toBe('核心用户');
    expect(option.series[0].data[0].value).toBe(10);
    expect(option.series[0].data[1].name).toBe('活跃用户');
  });

  it('支持自定义标题、高度和 className', async () => {
    const { container } = render(
      <UserEngagementFunnel
        data={mockStratificationData}
        title="自定义漏斗标题"
        height={600}
        className="custom-funnel"
      />,
    );

    const root = container.querySelector('.custom-funnel');
    expect(root).toBeInTheDocument();
    expect(root).toHaveStyle({ height: '600px' });

    await waitFor(() => {
      const option = mockChartInstance.setOption.mock.calls[0][0];
      expect(option.title.text).toBe('自定义漏斗标题');
    });
  });

  it('点击图表时透传当前事件负载', async () => {
    const onClick = vi.fn();
    render(<UserEngagementFunnel data={mockStratificationData} onClick={onClick} />);

    await waitFor(() => {
      expect(mockChartInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    const clickHandler = mockChartInstance.on.mock.calls.find(
      (call: any[]) => call[0] === 'click',
    )?.[1];

    clickHandler({
      data: {
        name: 'core',
        value: 10,
        percentage: 20,
      },
    });

    expect(onClick).toHaveBeenCalledWith({
      layer: 'core',
      count: 10,
      percentage: 20,
    });
  });

  it('在加载、错误、空状态下不初始化图表', () => {
    const { rerender } = render(<UserEngagementFunnel data={null} isLoading={true} />);
    expect(screen.getByText(/加载中/)).toBeInTheDocument();
    expect(echarts.init).not.toHaveBeenCalled();

    rerender(<UserEngagementFunnel data={null} error={new Error('加载失败')} />);
    expect(screen.getByText('加载失败')).toBeInTheDocument();
    expect(echarts.init).not.toHaveBeenCalled();

    rerender(<UserEngagementFunnel data={null} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(echarts.init).not.toHaveBeenCalled();
  });

  it('响应窗口 resize 并在卸载时释放图表', async () => {
    const { unmount } = render(<UserEngagementFunnel data={mockStratificationData} />);

    await waitFor(() => {
      expect(mockChartInstance.setOption).toHaveBeenCalled();
    });

    window.dispatchEvent(new Event('resize'));
    expect(mockChartInstance.resize).toHaveBeenCalled();

    unmount();
    expect(mockChartInstance.dispose).toHaveBeenCalled();
  });
});
