/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommunityEvolutionTimeline } from './CommunityEvolutionTimeline';
import { mockEvolutionData, emptyEvolutionData } from './CommunityEvolutionTimeline.fixtures';

describe('CommunityEvolutionTimeline', () => {
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

  describe('空数据处理', () => {
    it('空事件数据应该显示空状态', () => {
      render(<CommunityEvolutionTimeline data={emptyEvolutionData} />);

      expect(screen.getByText('暂无演化数据')).toBeInTheDocument();
    });

    it('undefined 数据应该显示空状态', () => {
      render(<CommunityEvolutionTimeline data={undefined as any} />);

      expect(screen.getByText('暂无演化数据')).toBeInTheDocument();
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
});
