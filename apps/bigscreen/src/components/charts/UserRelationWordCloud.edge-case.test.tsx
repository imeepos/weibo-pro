/**
 * UserRelationWordCloud 组件测试 - 边界情况
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
  noEdgesNetwork,
  largeNetwork,
  selfLoopNetwork,
  duplicateEdgesNetwork,
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
   * 边界情况测试
   */
  describe('边界情况', () => {
    it('应该处理只有节点没有边的网络', () => {
      render(<UserRelationWordCloud network={noEdgesNetwork} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('应该处理大数据集', () => {
      render(<UserRelationWordCloud network={largeNetwork} maxWords={50} />);

      const wordCloud = screen.getByTestId('word-cloud');
      const words = Array.from(wordCloud.children);

      // 验证限制了词数
      expect(words.length).toBeLessThanOrEqual(50);
    });

    it('应该处理自环边（source === target）', () => {
      render(<UserRelationWordCloud network={selfLoopNetwork} />);

      // 应该正常渲染，自环边计入连线数
      const user1 = screen.getByTestId('word-用户A');
      expect(user1).toBeInTheDocument();
    });

    it('应该处理重复边', () => {
      render(<UserRelationWordCloud network={duplicateEdgesNetwork} />);

      // 应该正常渲染，重复边都计入连线数
      const user1 = screen.getByTestId('word-用户A');
      expect(user1).toBeInTheDocument();
    });
  });
});
