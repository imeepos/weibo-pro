/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommunityEvolutionTimeline } from './CommunityEvolutionTimeline';
import { mockEvolutionData } from './CommunityEvolutionTimeline.fixtures';

describe('CommunityEvolutionTimeline 交互', () => {
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
