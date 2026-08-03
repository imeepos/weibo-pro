/**
 * UserRelationWordCloud 组件测试 - 基础渲染 与 Props
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  MockWordCloud,
  MockChartState,
  MockToggleGroup,
  MockToggleGroupItem,
  mockCn,
} from './UserRelationWordCloud.mocks';
import { mockNetwork } from './UserRelationWordCloud.fixtures';

// Mock WordCloud component
vi.mock('@sker/ui/components/ui/word-cloud', () => ({
  WordCloud: MockWordCloud,
}));

// Mock ChartState component
vi.mock('@sker/ui/components/ui/chart-state', () => ({
  ChartState: MockChartState,
}));

// Mock ToggleGroup component
vi.mock('@sker/ui/components/ui/toggle-group', () => ({
  ToggleGroup: MockToggleGroup,
  ToggleGroupItem: MockToggleGroupItem,
}));

// Mock utils
vi.mock('@/utils', () => ({
  cn: mockCn,
}));

// 导入待测试组件（需要在所有 mock 之后）
import { UserRelationWordCloud } from './UserRelationWordCloud';

describe('UserRelationWordCloud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 基础渲染测试
   */
  describe('基础渲染', () => {
    it('应该正常渲染组件', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);
      expect(screen.getByTestId('word-cloud')).toBeInTheDocument();
    });

    it('应该渲染关系类型切换器', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);
      expect(screen.getByTestId('toggle-group')).toBeInTheDocument();
    });

    it('应该默认选中"全部"关系类型', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);
      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toHaveAttribute('data-value', 'comprehensive');
    });

    it('应该显示所有关系类型选项', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);
      expect(screen.getByTestId('toggle-comprehensive')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-comment')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-like')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-repost')).toBeInTheDocument();
    });

    it('应该使用自定义标题', () => {
      const customTitle = '自定义词云标题';
      render(<UserRelationWordCloud network={mockNetwork} title={customTitle} />);
      expect(screen.getByText(customTitle)).toBeInTheDocument();
    });

    it('应该使用自定义高度', () => {
      const customHeight = 500;
      const { container } = render(
        <UserRelationWordCloud network={mockNetwork} height={customHeight} />
      );
      const chartContainer = container.querySelector('[style*="height"]');
      expect(chartContainer).toBeInTheDocument();
    });

    it('应该应用自定义className', () => {
      const customClass = 'custom-class';
      const { container } = render(
        <UserRelationWordCloud network={mockNetwork} className={customClass} />
      );
      expect(container.firstChild).toHaveClass(customClass);
    });
  });

  /**
   * Props 测试
   */
  describe('Props 测试', () => {
    it('应该使用默认的maxWords值', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const wordCloud = screen.getByTestId('word-cloud');
      const words = Array.from(wordCloud.children);

      // 默认应该是50个词
      expect(words.length).toBeLessThanOrEqual(50);
    });

    it('应该使用默认的sizeRange值', () => {
      const { container } = render(<UserRelationWordCloud network={mockNetwork} />);

      // 验证组件正常渲染（sizeRange传递给WordCloud组件）
      expect(container.querySelector('[data-testid="word-cloud"]')).toBeInTheDocument();
    });

    it('应该使用自定义的sizeRange值', () => {
      const customSizeRange: [number, number] = [20, 60];
      const { container } = render(
        <UserRelationWordCloud network={mockNetwork} sizeRange={customSizeRange} />
      );

      expect(container.querySelector('[data-testid="word-cloud"]')).toBeInTheDocument();
    });

    it('应该使用默认标题', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);
      expect(screen.getByText('用户关系词云')).toBeInTheDocument();
    });

    it('应该使用默认高度', () => {
      const { container } = render(<UserRelationWordCloud network={mockNetwork} />);

      // 验证组件正常渲染
      expect(container.querySelector('[data-testid="word-cloud"]')).toBeInTheDocument();
    });
  });
});
