import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GeographicDistributionChart from './GeographicDistributionChart';
import { mockData } from './GeographicDistributionChart.test.fixtures';

// Mock ECharts
vi.mock('echarts', () => ({
  init: vi.fn(),
}));

// Mock @sker/ui EChart component
vi.mock('@sker/ui/components/ui/echart', () => ({
  EChart: ({ option, height }: any) => {
    // 保存tooltip formatter以便测试
    if (option?.tooltip?.formatter) {
      (global as any).__lastTooltipFormatter = option.tooltip.formatter;
    }
    return (
      <div data-testid="echart" style={{ height: height ? `${height}px` : '400px' }}>
        {JSON.stringify(option, (key, value) => {
          // 跳过函数,但保留引用
          if (typeof value === 'function') {
            return `[Function: ${key || 'anonymous'}]`;
          }
          return value;
        })}
      </div>
    );
  },
}));

// Mock theme hook
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false })
}));

describe('GeographicDistributionChart', () => {
  beforeEach(() => {
    // Mock ResizeObserver
    vi.stubGlobal('ResizeObserver', vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('1. 数据顺序正确性', () => {
    it('应该按照用户数降序排列数据,第一名在最上面', async () => {
      const { container } = render(<GeographicDistributionChart data={mockData} />);

      await waitFor(() => {
        const echartDiv = container.querySelector('[data-testid="echart"]');
        expect(echartDiv).toBeTruthy();

        const option = JSON.parse(echartDiv!.textContent || '{}');

        // yAxis.data 应该是按用户数降序的地区名称
        // 第一名(上海)在最上面(index 0)
        expect(option.yAxis.data[0]).toBe('上海');
        expect(option.yAxis.data[1]).toBe('广东');
        expect(option.yAxis.data[2]).toBe('重庆');
        expect(option.yAxis.data[3]).toBe('未知地区');
      });
    });

    it('用户数数据应该与地区标签正确对应', async () => {
      const { container } = render(<GeographicDistributionChart data={mockData} />);

      await waitFor(() => {
        const echartDiv = container.querySelector('[data-testid="echart"]');
        const option = JSON.parse(echartDiv!.textContent || '{}');

        // 用户数数据应该与yAxis.data的顺序一致
        const userCounts = option.series[0].data;
        expect(userCounts[0]).toBe(1000); // 上海
        expect(userCounts[1]).toBe(800);  // 广东
        expect(userCounts[2]).toBe(600);  // 重庆
        expect(userCounts[3]).toBe(100);  // 未知地区
      });
    });

    it('帖子数数据应该与地区标签正确对应', async () => {
      const { container } = render(<GeographicDistributionChart data={mockData} />);

      await waitFor(() => {
        const echartDiv = container.querySelector('[data-testid="echart"]');
        const option = JSON.parse(echartDiv!.textContent || '{}');

        // 帖子数数据应该与yAxis.data的顺序一致
        const postCounts = option.series[1].data;
        expect(postCounts[0]).toBe(500); // 上海
        expect(postCounts[1]).toBe(400); // 广东
        expect(postCounts[2]).toBe(300); // 重庆
        expect(postCounts[3]).toBe(50);  // 未知地区
      });
    });

    it('tooltip的dataIndex应该能正确映射到processedData', async () => {
      render(<GeographicDistributionChart data={mockData} />);

      await waitFor(() => {
        const echartDiv = screen.queryByTestId('echart');
        expect(echartDiv).toBeTruthy();

        // 获取保存的tooltip formatter
        const tooltipFormatter = (global as any).__lastTooltipFormatter;
        expect(tooltipFormatter).toBeDefined();

        // 模拟悬停"未知地区"(index 3)
        const dataIndex = 3;
        const mockParams = [{ dataIndex }];

        // tooltip应该使用dataIndex从processedData获取数据
        // 现在yAxis.data[3]是"未知地区",所以processedData[3]也应该是"未知地区"
        const result = tooltipFormatter(mockParams);

        // 验证tooltip中显示的是"未知地区"的数据
        expect(result).toContain('未知地区');
        expect(result).toContain('100'); // 用户数
        expect(result).toContain('50');  // 帖子数
        expect(result).toContain('4.0%'); // 百分比
      });
    });

    it('tooltip对于上海的dataIndex应该显示上海的数据', async () => {
      render(<GeographicDistributionChart data={mockData} />);

      await waitFor(() => {
        const echartDiv = screen.queryByTestId('echart');
        expect(echartDiv).toBeTruthy();

        // 获取保存的tooltip formatter
        const tooltipFormatter = (global as any).__lastTooltipFormatter;
        expect(tooltipFormatter).toBeDefined();

        // 模拟悬停"上海"(index 0)
        const dataIndex = 0;
        const mockParams = [{ dataIndex }];

        const result = tooltipFormatter(mockParams);

        // 验证tooltip中显示的是"上海"的数据
        expect(result).toContain('上海');
        expect(result).toContain('1000'); // 用户数
        expect(result).toContain('500');  // 帖子数
        expect(result).toContain('40.0%'); // 百分比
      });
    });

    it('tooltip对于广东的dataIndex应该显示广东的数据', async () => {
      render(<GeographicDistributionChart data={mockData} />);

      await waitFor(() => {
        const echartDiv = screen.queryByTestId('echart');
        expect(echartDiv).toBeTruthy();

        // 获取保存的tooltip formatter
        const tooltipFormatter = (global as any).__lastTooltipFormatter;
        expect(tooltipFormatter).toBeDefined();

        // 模拟悬停"广东"(index 1)
        const dataIndex = 1;
        const mockParams = [{ dataIndex }];

        const result = tooltipFormatter(mockParams);

        // 验证tooltip中显示的是"广东"的数据
        expect(result).toContain('广东');
        expect(result).toContain('800');  // 用户数
        expect(result).toContain('400');  // 帖子数
        expect(result).toContain('32.0%'); // 百分比
      });
    });
  });

  describe('2. 组件渲染', () => {
    it('应该渲染组件容器', () => {
      const { container } = render(
        <GeographicDistributionChart data={mockData} />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('应该显示空数据状态', () => {
      render(<GeographicDistributionChart data={null} />);

      expect(screen.getByText('暂无地理分布数据')).toBeTruthy();
    });

    it('应该在数据为空时显示空状态', () => {
      render(<GeographicDistributionChart data={[]} />);

      expect(screen.getByText('暂无地理分布数据')).toBeTruthy();
    });
  });

  describe('3. 统计摘要', () => {
    it('应该显示正确的统计信息', async () => {
      const { container } = render(
        <GeographicDistributionChart
          data={mockData}
          totalPosts={1250}
          totalUsers={2500}
          totalRegions={4}
        />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('覆盖地区');
        expect(container.textContent).toContain('4');
        expect(container.textContent).toContain('发帖用户数');
        expect(container.textContent).toContain('2500');
        expect(container.textContent).toContain('总帖子数');
        expect(container.textContent).toContain('1250');
      });
    });
  });

  describe('4. 数据表格', () => {
    it('应该在表格中正确显示数据', () => {
      const { container } = render(
        <GeographicDistributionChart data={mockData} showTable={true} />
      );

      // 验证表格中包含地区名称
      expect(container.textContent).toContain('上海');
      expect(container.textContent).toContain('广东');
      expect(container.textContent).toContain('重庆');
      expect(container.textContent).toContain('未知地区');

      // 验证排名
      const rankElements = container.querySelectorAll('span[class*="w-6 h-6 rounded-full"]');
      expect(rankElements[0].textContent).toBe('1');
      expect(rankElements[1].textContent).toBe('2');
      expect(rankElements[2].textContent).toBe('3');
      expect(rankElements[3].textContent).toBe('4');
    });

    it('应该能够隐藏表格', () => {
      const { container } = render(
        <GeographicDistributionChart data={mockData} showTable={false} />
      );

      // 验证表格不存在
      const table = container.querySelector('table');
      expect(table).toBeNull();
    });
  });

  describe('5. maxItems限制', () => {
    it('应该只显示指定数量的数据', async () => {
      const { container } = render(
        <GeographicDistributionChart data={mockData} maxItems={2} />
      );

      await waitFor(() => {
        const echartDiv = container.querySelector('[data-testid="echart"]');
        const option = JSON.parse(echartDiv!.textContent || '{}');

        // yAxis应该只有2个元素
        expect(option.yAxis.data).toHaveLength(2);
        expect(option.yAxis.data[0]).toBe('上海');
        expect(option.yAxis.data[1]).toBe('广东');
      });

      // 表格也应该只有2行
      const table = container.querySelector('table');
      expect(table).toBeTruthy();
      const tbody = table?.querySelector('tbody');
      const rows = tbody?.querySelectorAll('tr');
      expect(rows?.length).toBe(2);
    });
  });
});
