import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NetworkCentralityGraph from './NetworkCentralityGraph';
import { mockData, mockBrowserApis, getMockChartInstance } from './NetworkCentralityGraph.test.setup';

describe('NetworkCentralityGraph', () => {
  beforeEach(() => {
    // 清除 mock 调用记录，但不清除 mock 本身
    const mockInstance = getMockChartInstance();
    mockInstance.setOption.mockClear();
    mockInstance.on.mockClear();
    mockInstance.off.mockClear();
    mockInstance.resize.mockClear();
    mockInstance.dispose.mockClear();

    mockBrowserApis();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. 组件正常渲染', () => {
    it('应该渲染组件容器', () => {
      const { container } = render(
        <NetworkCentralityGraph data={mockData} />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('应该渲染图表容器', async () => {
      const { container } = render(
        <NetworkCentralityGraph data={mockData} />
      );
      await waitFor(() => {
        const chartContainer = container.querySelector('div');
        expect(chartContainer).toBeTruthy();
      });
    });
  });

  describe('2. 力导向图显示正确', () => {
    it('应该初始化 ECharts 实例', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(
        () => {
          const instance = getMockChartInstance();
          expect(instance.setOption).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it('应该设置正确的图表配置', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        const instance = getMockChartInstance();
        expect(instance.setOption).toHaveBeenCalled();
        const option = instance.setOption.mock.calls[0][0];
        expect(option.series).toBeDefined();
        expect(option.series[0].type).toBe('graph');
        expect(option.series[0].layout).toBe('force');
      });
    });
  });

  describe('3. 节点大小映射正确', () => {
    it('应该根据影响力得分映射节点大小', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(
        () => {
          const instance = getMockChartInstance();
          const option = instance.setOption.mock.calls[0][0];
          const nodes = option.series[0].data;

          // 验证节点大小基于 influenceScore
          expect(nodes[0].symbolSize).toBeGreaterThan(nodes[1].symbolSize);
          expect(nodes[1].symbolSize).toBeGreaterThan(nodes[2].symbolSize);
        },
        { timeout: 3000 }
      );
    });

    it('应该根据影响力等级设置节点颜色', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(
        () => {
          const instance = getMockChartInstance();
          const option = instance.setOption.mock.calls[0][0];
          const nodes = option.series[0].data;

          // 高影响力节点 (≥7) 应该是金色
          expect(nodes[0].itemStyle.color).toContain('251, 191, 36');
          // 中影响力节点 (4-7) 应该是蓝色
          expect(nodes[1].itemStyle.color).toContain('96, 165, 250');
        },
        { timeout: 3000 }
      );
    });
  });

  describe('4. 显示 Top 影响力用户', () => {
    it('应该显示 Top 10 影响力用户列表', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        expect(screen.getByText('用户1')).toBeTruthy();
        expect(screen.getByText('用户2')).toBeTruthy();
      });
    });

    it('应该显示用户的影响力得分', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        expect(screen.getByText('9.50')).toBeTruthy();
        expect(screen.getByText('7.20')).toBeTruthy();
      });
    });
  });

  describe('5. 显示网络统计信息', () => {
    it('应该显示节点数', async () => {
      const { container } = render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(
        () => {
          // 查找包含"节点数:"的元素，然后检查其兄弟元素
          const nodeCountLabel = Array.from(container.querySelectorAll('span')).find(
            el => el.textContent === '节点数:'
          );
          expect(nodeCountLabel).toBeTruthy();
          const nodeCountValue = nodeCountLabel?.nextElementSibling;
          expect(nodeCountValue?.textContent).toBe('3');
        },
        { timeout: 3000 }
      );
    });

    it('应该显示边数', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        const edgeCounts = screen.getAllByText('3');
        expect(edgeCounts.length).toBeGreaterThan(0);
      });
    });

    it('应该显示平均度数', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        expect(screen.getByText('2.00')).toBeTruthy();
      });
    });

    it('应该显示网络密度', async () => {
      render(<NetworkCentralityGraph data={mockData} />);

      await waitFor(() => {
        expect(screen.getByText('50.0%')).toBeTruthy();
      });
    });
  });
});
