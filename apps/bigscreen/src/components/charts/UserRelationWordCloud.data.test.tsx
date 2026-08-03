/**
 * UserRelationWordCloud 组件测试 - 数据处理
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
import {
  mockNetwork,
  networkWithLowInfluence,
  networkWithIsolatedNode,
} from './UserRelationWordCloud.fixtures';

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
   * 数据处理测试
   */
  describe('数据处理', () => {
    it('应该正确计算用户连线数', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      // 用户1: 2条边 (1->2, 1->3)
      const user1 = screen.getByTestId('word-用户A');
      expect(user1).toHaveAttribute('data-value', '2');

      // 用户2: 3条边 (1->2, 2->3, 2->4)
      const user2 = screen.getByTestId('word-用户B');
      expect(user2).toHaveAttribute('data-value', '3');

      // 用户3: 4条边 (1->3, 2->3, 3->4, 3->5)
      const user3 = screen.getByTestId('word-用户C');
      expect(user3).toHaveAttribute('data-value', '4');
    });

    it('应该按连线数降序排序', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const wordCloud = screen.getByTestId('word-cloud');
      const words = Array.from(wordCloud.children);

      // 验证第一个是连线数最多的用户
      expect(words[0]).toHaveAttribute('data-testid', 'word-用户C');
      expect(words[0]).toHaveAttribute('data-value', '4');
    });

    it('应该限制最大词数', () => {
      const maxWords = 3;
      render(<UserRelationWordCloud network={mockNetwork} maxWords={maxWords} />);

      const wordCloud = screen.getByTestId('word-cloud');
      const words = Array.from(wordCloud.children);

      expect(words.length).toBeLessThanOrEqual(maxWords);
    });

    it('应该根据影响力分配颜色 - 琥珀色 (>=80)', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const user1 = screen.getByTestId('word-用户A');
      expect(user1).toHaveAttribute('data-color', '#f59e0b');
    });

    it('应该根据影响力分配颜色 - 蓝色 (>=60)', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const user2 = screen.getByTestId('word-用户B');
      expect(user2).toHaveAttribute('data-color', '#3b82f6');
    });

    it('应该根据影响力分配颜色 - 绿色 (>=40)', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const user4 = screen.getByTestId('word-用户D');
      expect(user4).toHaveAttribute('data-color', '#10b981');
    });

    it('应该根据影响力分配颜色 - 紫色 (>=20)', () => {
      render(<UserRelationWordCloud network={mockNetwork} />);

      const user5 = screen.getByTestId('word-用户E');
      expect(user5).toHaveAttribute('data-color', '#8b5cf6');
    });

    it('应该根据影响力分配颜色 - 灰色 (<20)', () => {
      render(<UserRelationWordCloud network={networkWithLowInfluence} />);

      const user6 = screen.getByTestId('word-用户F');
      expect(user6).toHaveAttribute('data-color', '#6b7280');
    });

    it('应该过滤掉连线数为0的用户', () => {
      render(<UserRelationWordCloud network={networkWithIsolatedNode} />);

      expect(screen.queryByTestId('word-孤立用户')).not.toBeInTheDocument();
    });
  });
});
