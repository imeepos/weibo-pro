/**
 * UserRelationWordCloud 组件测试 - 性能测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  MockWordCloud,
  MockChartState,
  MockToggleGroup,
  MockToggleGroupItem,
  mockCn,
} from './UserRelationWordCloud.mocks';
import { mockNetwork, modifiedNetwork } from './UserRelationWordCloud.fixtures';

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
   * 性能测试
   */
  describe('性能测试', () => {
    it('应该使用useMemo缓存计算结果', () => {
      const { rerender } = render(<UserRelationWordCloud network={mockNetwork} />);

      const initialWordCloud = screen.getByTestId('word-cloud');
      const initialWords = Array.from(initialWordCloud.children);

      // 重新渲染但数据未变化
      rerender(<UserRelationWordCloud network={mockNetwork} />);

      const rerenderedWordCloud = screen.getByTestId('word-cloud');
      const rerenderedWords = Array.from(rerenderedWordCloud.children);

      // 验证词数相同（说明使用了缓存）
      expect(rerenderedWords.length).toBe(initialWords.length);
    });

    it('应该在网络数据变化时重新计算', () => {
      const { rerender } = render(<UserRelationWordCloud network={mockNetwork} />);

      const initialUser1 = screen.getByTestId('word-用户A');
      expect(initialUser1).toHaveAttribute('data-value', '2');

      // 修改网络数据
      rerender(<UserRelationWordCloud network={modifiedNetwork} />);

      const updatedUser1 = screen.getByTestId('word-用户A');
      expect(updatedUser1).toHaveAttribute('data-value', '3');
    });

    it('应该在关系类型变化时重新计算', async () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const initialUser1 = screen.getByTestId('word-用户A');
      expect(initialUser1).toHaveAttribute('data-value', '2');

      // 切换到评论类型
      const commentToggle = screen.getByTestId('toggle-comment');
      fireEvent.click(commentToggle);

      await waitFor(() => {
        const updatedUser1 = screen.getByTestId('word-用户A');
        // 评论类型下，用户A只有1条边 (1->2)
        expect(updatedUser1).toHaveAttribute('data-value', '1');
      });
    });
  });
});
