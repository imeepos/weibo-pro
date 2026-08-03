/**
 * UserRelationWordCloud 组件测试 - 关系类型切换
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
   * 关系类型切换测试
   */
  describe('关系类型切换', () => {
    it('应该能够切换到"评论"关系类型', async () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const commentToggle = screen.getByTestId('toggle-comment');
      fireEvent.click(commentToggle);

      await waitFor(() => {
        const toggleGroup = screen.getByTestId('toggle-group');
        expect(toggleGroup).toHaveAttribute('data-value', 'comment');
      });
    });

    it('应该能够切换到"点赞"关系类型', async () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const likeToggle = screen.getByTestId('toggle-like');
      fireEvent.click(likeToggle);

      await waitFor(() => {
        const toggleGroup = screen.getByTestId('toggle-group');
        expect(toggleGroup).toHaveAttribute('data-value', 'like');
      });
    });

    it('应该能够切换到"转发"关系类型', async () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const repostToggle = screen.getByTestId('toggle-repost');
      fireEvent.click(repostToggle);

      await waitFor(() => {
        const toggleGroup = screen.getByTestId('toggle-group');
        expect(toggleGroup).toHaveAttribute('data-value', 'repost');
      });
    });

    it('应该在切换关系类型时重新计算数据', async () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      // 切换到"评论"类型
      const commentToggle = screen.getByTestId('toggle-comment');
      fireEvent.click(commentToggle);

      await waitFor(() => {
        // 只有参与评论关系的用户应该显示
        // 评论边: 1->2, 2->4, 4->5
        const user1 = screen.queryByTestId('word-用户A');
        const user2 = screen.queryByTestId('word-用户B');
        const user4 = screen.queryByTestId('word-用户D');

        expect(user1).toBeInTheDocument();
        expect(user2).toBeInTheDocument();
        expect(user4).toBeInTheDocument();
      });
    });

    it('应该正确过滤"点赞"类型的边', async () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const likeToggle = screen.getByTestId('toggle-like');
      fireEvent.click(likeToggle);

      await waitFor(() => {
        // 点赞边: 1->3, 3->4
        const user1 = screen.queryByTestId('word-用户A');
        const user3 = screen.queryByTestId('word-用户C');
        const user4 = screen.queryByTestId('word-用户D');

        expect(user1).toBeInTheDocument();
        expect(user3).toBeInTheDocument();
        expect(user4).toBeInTheDocument();
      });
    });

    it('应该正确过滤"转发"类型的边', async () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const repostToggle = screen.getByTestId('toggle-repost');
      fireEvent.click(repostToggle);

      await waitFor(() => {
        // 转发边: 2->3, 3->5
        const user2 = screen.queryByTestId('word-用户B');
        const user3 = screen.queryByTestId('word-用户C');
        const user5 = screen.queryByTestId('word-用户E');

        expect(user2).toBeInTheDocument();
        expect(user3).toBeInTheDocument();
        expect(user5).toBeInTheDocument();
      });
    });
  });
});
