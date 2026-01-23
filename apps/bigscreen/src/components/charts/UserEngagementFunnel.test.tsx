import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import UserEngagementFunnel from './UserEngagementFunnel';
import type { UserStratification } from '@sker/sdk';
import * as echarts from 'echarts';

// Mock ECharts
const mockChartInstance = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('echarts', () => ({
  default: {
    init: vi.fn(() => mockChartInstance),
  },
}));

// Mock data
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

  describe('基础渲染', () => {
    it('应该正常渲染组件', () => {
      render(<UserEngagementFunnel data={mockStratificationData} />);

      // 应该渲染标题
      expect(screen.getByText('用户参与度分层')).toBeInTheDocument();
    });

    it('应该显示四层数据', () => {
      render(<UserEngagementFunnel data={mockStratificationData} />);

      // 检查是否显示分层名称
      expect(screen.getByText('核心用户')).toBeInTheDocument();
      expect(screen.getByText('活跃用户')).toBeInTheDocument();
      expect(screen.getByText('普通用户')).toBeInTheDocument();
      expect(screen.getByText('潜水用户')).toBeInTheDocument();
    });

    it('应该显示基尼系数', () => {
      render(<UserEngagementFunnel data={mockStratificationData} />);

      // 基尼系数应该显示为 45%
      expect(screen.getByText('45.0%')).toBeInTheDocument();
    });

    it('应该显示总用户数', () => {
      render(<UserEngagementFunnel data={mockStratificationData} />);

      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  describe('漏斗图显示', () => {
    it('应该初始化ECharts实例', () => {
      render(<UserEngagementFunnel data={mockStratificationData} />);

      expect(echarts.init).toHaveBeenCalled();
    });

    it('应该设置正确的图表配置', async () => {
      render(<UserEngagementFunnel data={mockStratificationData} />);

      await waitFor(() => {
        expect(mockChartInstance.setOption).toHaveBeenCalled();
      });
    });

    it('应该包含漏斗图系列数据', async () => {
      render(<UserEngagementFunnel data={mockStratificationData} />);

      await waitFor(() => {
        const callArgs = mockChartInstance.setOption.mock.calls[0];
        const option = callArgs[0];

        expect(option.series).toBeDefined();
        expect(option.series[0].type).toBe('funnel');
      });
    });
  });

  describe('交互功能', () => {
    it('应该支持点击事件', async () => {
      const onClick = vi.fn();
      render(<UserEngagementFunnel data={mockStratificationData} onClick={onClick} />);

      await waitFor(() => {
        expect(mockChartInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
      });
    });

    it('点击时应该调用onClick回调并传递层级信息', async () => {
      const onClick = vi.fn();
      render(<UserEngagementFunnel data={mockStratificationData} onClick={onClick} />);

      await waitFor(() => {
        const clickHandler = mockChartInstance.on.mock.calls.find(
          (call: any[]) => call[0] === 'click'
        )[1];

        // 模拟点击事件
        clickHandler({ data: { name: 'core' } });

        expect(onClick).toHaveBeenCalledWith({
          layer: 'core',
          count: 10,
          percentage: 20,
        });
      });
    });
  });

  describe('空数据状态', () => {
    it('应该显示空状态提示', () => {
      render(<UserEngagementFunnel data={null} />);

      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('空状态时不应该渲染图表', () => {
      const { container } = render(<UserEngagementFunnel data={null} />);

      expect(echarts.init).not.toHaveBeenCalled();
    });
  });

  describe('加载状态', () => {
    it('应该显示加载指示器', () => {
      render(<UserEngagementFunnel data={null} isLoading={true} />);

      // 检查加载状态的元素
      const loadingElement = screen.queryByText(/加载/i);
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('错误状态', () => {
    it('应该显示错误信息', () => {
      const error = new Error('加载失败');
      render(<UserEngagementFunnel data={null} error={error} />);

      expect(screen.getByText(/加载失败/i)).toBeInTheDocument();
    });

    it('错误状态时不应该渲染图表', () => {
      const error = new Error('加载失败');
      const { container } = render(<UserEngagementFunnel data={null} error={error} />);

      expect(echarts.init).not.toHaveBeenCalled();
    });
  });

  describe('统计信息面板', () => {
    it('应该显示核心用户占比', () => {
      render(<UserEngagementFunnel data={mockStratificationData} />);

      expect(screen.getByText('20.0%')).toBeInTheDocument();
    });

    it('应该显示活跃用户占比', () => {
      render(<UserEngagementFunnel data={mockStratificationData} />);

      // activeRatio = 0.6 = 60%
      expect(screen.getByText('60.0%')).toBeInTheDocument();
    });

    it('应该显示帕累托指数', () => {
      render(<UserEngagementFunnel data={mockStratificationData} />);

      // paretoIndex = 0.55 = 55%
      expect(screen.getByText('55.0%')).toBeInTheDocument();
    });

    it('应该显示每层的用户数量', () => {
      const { container } = render(<UserEngagementFunnel data={mockStratificationData} />);

      // 检查每层的用户数是否显示
      expect(screen.getByText('10')).toBeInTheDocument(); // core
      expect(screen.getByText('20')).toBeInTheDocument(); // active
      expect(screen.getByText('15')).toBeInTheDocument(); // casual
      expect(screen.getByText('5')).toBeInTheDocument(); // lurker
    });
  });

  describe('响应式行为', () => {
    it('窗口大小改变时应该调整图表大小', async () => {
      render(<UserEngagementFunnel data={mockStratificationData} />);

      await waitFor(() => {
        // 模拟窗口resize事件
        window.dispatchEvent(new Event('resize'));

        expect(mockChartInstance.resize).toHaveBeenCalled();
      });
    });

    it('组件卸载时应该清理图表实例', async () => {
      const { unmount } = render(<UserEngagementFunnel data={mockStratificationData} />);

      await waitFor(() => {
        unmount();

        expect(mockChartInstance.dispose).toHaveBeenCalled();
      });
    });
  });

  describe('自定义配置', () => {
    it('应该支持自定义标题', () => {
      render(<UserEngagementFunnel data={mockStratificationData} title="自定义标题" />);

      expect(screen.getByText('自定义标题')).toBeInTheDocument();
    });

    it('应该支持自定义高度', () => {
      const { container } = render(
        <UserEngagementFunnel data={mockStratificationData} height={600} />
      );

      const chartContainer = container.querySelector('[style*="height"]');
      expect(chartContainer).toHaveStyle({ height: '600px' });
    });

    it('应该支持自定义className', () => {
      const { container } = render(
        <UserEngagementFunnel data={mockStratificationData} className="custom-class" />
      );

      const element = container.querySelector('.custom-class');
      expect(element).toBeInTheDocument();
    });
  });
});
