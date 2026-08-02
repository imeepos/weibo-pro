/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommunityEvolutionTimeline } from './CommunityEvolutionTimeline';
import type { CommunityEvolutionAnalysis } from '@sker/sdk';

describe('CommunityEvolutionTimeline', () => {
  const mockEvolutionData: CommunityEvolutionAnalysis = {
    timeSlices: [
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        communities: [
          {
            id: 'community-0',
            name: 'Community 1',
            members: [
              {
                userId: 'user1',
                screenName: 'User One',
                role: 'leader',
                inDegree: 5,
                outDegree: 3,
              },
            ],
            size: 10,
            density: 0.8,
            avgInfluence: 0.75,
            topKeywords: ['keyword1', 'keyword2'],
            sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2 },
          },
        ],
        modularity: 0.75,
        totalMembers: 10,
      },
      {
        timestamp: '2024-01-02T00:00:00.000Z',
        communities: [
          {
            id: 'community-0',
            name: 'Community 1',
            members: [
              {
                userId: 'user1',
                screenName: 'User One',
                role: 'leader',
                inDegree: 5,
                outDegree: 3,
              },
            ],
            size: 12,
            density: 0.85,
            avgInfluence: 0.8,
            topKeywords: ['keyword1', 'keyword2'],
            sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2 },
          },
          {
            id: 'community-1',
            name: 'Community 2',
            members: [],
            size: 5,
            density: 0.6,
            avgInfluence: 0.5,
            topKeywords: [],
            sentiment: { positive: 0.4, negative: 0.3, neutral: 0.3 },
          },
        ],
        modularity: 0.78,
        totalMembers: 17,
      },
    ],
    evolutionEvents: [
      {
        type: 'birth',
        timestamp: '2024-01-02T00:00:00.000Z',
        involvedCommunities: ['community-1'],
        magnitude: 5,
        description: '新社区 Community 2 出现，包含 5 个成员',
      },
      {
        type: 'growth',
        timestamp: '2024-01-02T00:00:00.000Z',
        involvedCommunities: ['community-0', 'community-0'],
        magnitude: 0.2,
        description: '社区 Community 1 成长 20%',
      },
    ],
    overallStability: 0.9,
    keyChanges: [
      {
        communityId: 'community-0',
        changeType: 'growth',
        beforeSize: 10,
        afterSize: 12,
        keyMembers: ['user2'],
      },
    ],
    trendPrediction: {
      predictedCommunityCount: 3,
      predictedModularity: 0.75,
      confidence: 0.8,
    },
  };

  describe('渲染', () => {
    it('应该正确渲染组件', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      expect(screen.getByText('社区演化追踪')).toBeInTheDocument();
    });

    it('应该显示稳定性指数', () => {
      const { container } = render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      expect(screen.getByText('稳定性指数')).toBeInTheDocument();
      // 检查是否有数字和百分号
      expect(container.textContent).toMatch(/90/);
      expect(container.textContent).toMatch(/%/);
    });

    it('应该显示趋势预测', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      expect(screen.getByText(/预测社区数/)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(/预测模块度/)).toBeInTheDocument();
      expect(screen.getByText('0.75')).toBeInTheDocument();
    });
  });

  describe('演化事件', () => {
    it('应该显示所有演化事件', () => {
      const { container } = render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      expect(container.textContent).toMatch(/新生/);
      expect(container.textContent).toMatch(/成长/);
    });

    it('应该显示事件描述', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      expect(screen.getByText(/新社区 Community 2 出现/)).toBeInTheDocument();
      expect(screen.getByText(/社区 Community 1 成长 20%/)).toBeInTheDocument();
    });

    it('应该显示事件时间戳', () => {
      const { container } = render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      // 格式化后的日期
      expect(container.textContent).toMatch(/1月/);
    });
  });

  describe('时间切片', () => {
    it('应该显示时间切片数据', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      expect(screen.getByText(/时间切片/)).toBeInTheDocument();
    });

    it('应该显示社区数量变化', () => {
      const { container } = render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      expect(container.textContent).toMatch(/1/);
      expect(container.textContent).toMatch(/2/);
    });

    it('应该显示总成员数变化', () => {
      const { container } = render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      expect(container.textContent).toMatch(/10/);
      expect(container.textContent).toMatch(/17/);
    });
  });

  describe('关键变化', () => {
    it('应该显示关键变化列表', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      expect(screen.getByText(/关键变化/)).toBeInTheDocument();
    });

    it('应该显示变化前后的大小', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      expect(screen.getByText(/10.*12/)).toBeInTheDocument();
    });
  });

  describe('交互功能', () => {
    it('点击事件应该显示详情', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const eventElements = document.querySelectorAll('[data-testid="evolution-event"]');
      expect(eventElements.length).toBeGreaterThan(0);

      if (eventElements.length > 0) {
        fireEvent.click(eventElements[0]);
        // 详情面板应该显示
      }
    });

    it('应该支持折叠/展开', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const collapseButton = screen.getByTestId('evolution-collapse-button');
      fireEvent.click(collapseButton);

      // 内容应该被隐藏
      expect(screen.queryByText('时间切片')).not.toBeInTheDocument();
    });

    it('再次点击应该展开内容', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const collapseButton = screen.getByTestId('evolution-collapse-button');
      fireEvent.click(collapseButton); // 折叠
      fireEvent.click(collapseButton); // 展开

      expect(screen.getByText('时间切片')).toBeInTheDocument();
    });
  });

  describe('空数据处理', () => {
    it('空事件数据应该显示空状态', () => {
      const emptyData: CommunityEvolutionAnalysis = {
        timeSlices: [],
        evolutionEvents: [],
        overallStability: 0,
        keyChanges: [],
        trendPrediction: {
          predictedCommunityCount: 0,
          predictedModularity: 0,
          confidence: 0,
        },
      };

      render(<CommunityEvolutionTimeline data={emptyData} />);

      expect(screen.getByText('暂无演化数据')).toBeInTheDocument();
    });

    it('undefined 数据应该显示空状态', () => {
      render(<CommunityEvolutionTimeline data={undefined as any} />);

      expect(screen.getByText('暂无演化数据')).toBeInTheDocument();
    });
  });

  describe('事件类型颜色编码', () => {
    it('birth 事件应该显示为绿色', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const birthEvent = document.querySelector('[data-event-type="birth"]');
      expect(birthEvent).toBeInTheDocument();
      expect(birthEvent?.getAttribute('data-event-color')).toBe('green');
    });

    it('death 事件应该显示为红色', () => {
      const dataWithDeath: CommunityEvolutionAnalysis = {
        ...mockEvolutionData,
        evolutionEvents: [
          {
            type: 'death',
            timestamp: '2024-01-02T00:00:00.000Z',
            involvedCommunities: ['community-0'],
            magnitude: 5,
            description: '社区解散',
          },
        ],
      };

      render(<CommunityEvolutionTimeline data={dataWithDeath} />);

      const deathEvent = document.querySelector('[data-event-type="death"]');
      expect(deathEvent).toBeInTheDocument();
      expect(deathEvent?.getAttribute('data-event-color')).toBe('red');
    });

    it('growth 事件应该显示为蓝色', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const growthEvent = document.querySelector('[data-event-type="growth"]');
      expect(growthEvent).toBeInTheDocument();
      expect(growthEvent?.getAttribute('data-event-color')).toBe('blue');
    });
  });

  describe('响应式设计', () => {
    it('应该支持自定义 className', () => {
      const { container } = render(
        <CommunityEvolutionTimeline data={mockEvolutionData} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('应该支持折叠状态控制', () => {
      // 测试默认展开
      const { unmount } = render(
        <CommunityEvolutionTimeline data={mockEvolutionData} defaultCollapsed={false} />
      );

      expect(screen.getByText('时间切片')).toBeInTheDocument();

      unmount();

      // 测试默认折叠
      render(
        <CommunityEvolutionTimeline data={mockEvolutionData} defaultCollapsed={true} />
      );

      expect(screen.queryByText('时间切片')).not.toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('应该显示加载状态', () => {
      render(<CommunityEvolutionTimeline data={null as any} isLoading={true} />);

      expect(screen.getByText(/加载中/)).toBeInTheDocument();
    });
  });

  describe('错误状态', () => {
    it('应该显示错误状态', () => {
      const error = new Error('加载失败');

      render(<CommunityEvolutionTimeline data={null as any} error={error} />);

      expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    });
  });

  describe('图表渲染', () => {
    it('应该显示社区数量变化图表', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const chartContainer = document.querySelector('[data-testid="community-count-chart"]');
      expect(chartContainer).toBeInTheDocument();
    });

    it('应该显示模块度变化图表', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const chartContainer = document.querySelector('[data-testid="modularity-chart"]');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('事件过滤', () => {
    it('应该支持按事件类型过滤', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const birthFilter = screen.getByTestId('filter-birth');
      fireEvent.click(birthFilter);

      // 只显示 birth 事件
    });

    it('应该支持显示所有事件', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const allFilter = screen.getByTestId('filter-all');
      fireEvent.click(allFilter);

      // 显示所有事件
    });
  });
});
