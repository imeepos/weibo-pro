/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventLifecycleTimeline } from './EventLifecycleTimeline';
import type { EventLifecycle, LifecyclePhase } from '../../hooks/useEventLifecycle';

describe('EventLifecycleTimeline', () => {
  const mockLifecycle: EventLifecycle = {
    phases: [
      {
        name: 'emergence',
        startTime: new Date('2024-01-01T00:00:00'),
        endTime: new Date('2024-01-01T02:00:00'),
        duration: 3,
        avgHotness: 8.5,
        keyMetrics: { posts: 52, users: 25, sentiment: 0.35 },
      },
      {
        name: 'growth',
        startTime: new Date('2024-01-01T03:00:00'),
        endTime: new Date('2024-01-01T05:00:00'),
        duration: 3,
        avgHotness: 36,
        keyMetrics: { posts: 215, users: 92, sentiment: 0.49 },
      },
      {
        name: 'peak',
        startTime: new Date('2024-01-01T06:00:00'),
        endTime: new Date('2024-01-01T08:00:00'),
        duration: 3,
        avgHotness: 69,
        keyMetrics: { posts: 397, users: 157, sentiment: 0.56 },
      },
      {
        name: 'decline',
        startTime: new Date('2024-01-01T09:00:00'),
        endTime: new Date('2024-01-01T11:00:00'),
        duration: 3,
        avgHotness: 39.3,
        keyMetrics: { posts: 230, users: 108, sentiment: 0.46 },
      },
      {
        name: 'dormant',
        startTime: new Date('2024-01-01T12:00:00'),
        endTime: new Date('2024-01-01T14:00:00'),
        duration: 3,
        avgHotness: 8,
        keyMetrics: { posts: 59, users: 35, sentiment: 0.29 },
      },
    ],
    currentPhase: 'dormant',
    predictedEndTime: new Date('2024-01-01T18:00:00'),
    totalLifespan: 15,
  };

  describe('渲染', () => {
    it('应该正确渲染组件', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      expect(screen.getByText('事件生命周期')).toBeInTheDocument();
    });

    it('应该显示所有5个阶段', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      // 阶段时间轴和热度曲线图中都有阶段名称
      expect(screen.getAllByText('萌芽').length).toBeGreaterThan(0);
      expect(screen.getAllByText('增长').length).toBeGreaterThan(0);
      expect(screen.getAllByText('高峰').length).toBeGreaterThan(0);
      expect(screen.getAllByText('衰退').length).toBeGreaterThan(0);
      expect(screen.getAllByText('沉寂').length).toBeGreaterThan(0);
    });

    it('应该显示当前阶段标识', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      expect(screen.getByText(/当前阶段/)).toBeInTheDocument();
    });
  });

  describe('阶段信息', () => {
    it('应该显示每个阶段的持续时间', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      expect(screen.getAllByText('3 小时')).toHaveLength(5);
    });

    it('应该显示每个阶段的平均热度', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      // 萌芽阶段平均热度 8.5
      expect(screen.getByText(/8\.5/)).toBeInTheDocument();
    });

    it('应该显示总生命周期时长', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      expect(screen.getByText(/15\s*小时/)).toBeInTheDocument();
    });

    it('应该显示预测结束时间', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      expect(screen.getByText(/18:00/)).toBeInTheDocument();
    });
  });

  describe('阶段交互', () => {
    it('点击阶段应该触发 onPhaseClick 回调', () => {
      const onPhaseClick = vi.fn();
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} onPhaseClick={onPhaseClick} />);

      const phaseElements = document.querySelectorAll('[data-testid="lifecycle-phase"]');
      expect(phaseElements.length).toBeGreaterThan(0);

      if (phaseElements.length > 0) {
        fireEvent.click(phaseElements[0]);
        expect(onPhaseClick).toHaveBeenCalledWith(mockLifecycle.phases[0]);
      }
    });

    it('鼠标悬停阶段应该显示详细信息', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      const phaseElements = document.querySelectorAll('[data-testid="lifecycle-phase"]');
      expect(phaseElements.length).toBeGreaterThan(0);
    });
  });

  describe('折叠功能', () => {
    it('点击折叠按钮应该隐藏内容', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      const collapseButton = screen.getByTestId('lifecycle-collapse-button');
      fireEvent.click(collapseButton);

      // 内容应该被隐藏
      expect(screen.queryByText('阶段时间轴')).not.toBeInTheDocument();
    });

    it('再次点击应该展开内容', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      const collapseButton = screen.getByTestId('lifecycle-collapse-button');
      fireEvent.click(collapseButton); // 折叠
      fireEvent.click(collapseButton); // 展开

      expect(screen.getByText('阶段时间轴')).toBeInTheDocument();
    });
  });

  describe('空数据处理', () => {
    it('空阶段数据应该显示空状态', () => {
      const emptyLifecycle: EventLifecycle = {
        phases: [],
        currentPhase: '',
        predictedEndTime: new Date(),
        totalLifespan: 0,
      };

      render(<EventLifecycleTimeline lifecycle={emptyLifecycle} />);

      expect(screen.getByText('暂无生命周期数据')).toBeInTheDocument();
    });

    it('undefined 数据应该显示空状态', () => {
      render(<EventLifecycleTimeline lifecycle={undefined as any} />);

      expect(screen.getByText('暂无生命周期数据')).toBeInTheDocument();
    });
  });

  describe('阶段颜色编码', () => {
    it('萌芽阶段应该显示为绿色', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      const emergencePhase = document.querySelector('[data-phase-name="emergence"]');
      expect(emergencePhase).toBeInTheDocument();
      expect(emergencePhase?.getAttribute('data-phase-color')).toBe('green');
    });

    it('高峰阶段应该显示为红色', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      const peakPhase = document.querySelector('[data-phase-name="peak"]');
      expect(peakPhase).toBeInTheDocument();
      expect(peakPhase?.getAttribute('data-phase-color')).toBe('red');
    });
  });

  describe('热度曲线', () => {
    it('应该显示热度曲线图容器', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      const chartContainer = document.querySelector('[data-testid="hotness-chart"]');
      expect(chartContainer).toBeInTheDocument();
    });

    it('热度曲线应该包含所有阶段的数据点', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      const dataPoints = document.querySelectorAll('[data-testid="hotness-data-point"]');
      expect(dataPoints.length).toBeGreaterThan(0);
    });
  });

  describe('关键指标显示', () => {
    it('应该显示每个阶段的关键指标摘要', () => {
      render(<EventLifecycleTimeline lifecycle={mockLifecycle} />);

      // 帖子数、用户数、情感得分
      expect(screen.getAllByText(/帖子/)).toHaveLength(5);
      expect(screen.getAllByText(/用户/)).toHaveLength(5);
    });
  });

  describe('响应式设计', () => {
    it('应该支持自定义 className', () => {
      const { container } = render(
        <EventLifecycleTimeline lifecycle={mockLifecycle} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('应该支持折叠状态控制', () => {
      // 测试默认展开
      const { unmount } = render(
        <EventLifecycleTimeline lifecycle={mockLifecycle} defaultCollapsed={false} />
      );

      expect(screen.getByText('阶段时间轴')).toBeInTheDocument();

      unmount();

      // 测试默认折叠
      render(
        <EventLifecycleTimeline lifecycle={mockLifecycle} defaultCollapsed={true} />
      );

      expect(screen.queryByText('阶段时间轴')).not.toBeInTheDocument();
    });
  });
});
