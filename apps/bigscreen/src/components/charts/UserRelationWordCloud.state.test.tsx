/**
 * UserRelationWordCloud 组件测试 - 状态管理
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
import { mockNetwork, emptyNetwork } from './UserRelationWordCloud.fixtures';

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
   * 状态管理测试
   */
  describe('状态管理', () => {
    it('应该显示加载状态', () => {
      render(<UserRelationWordCloud network={null} isLoading={true} />);
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });

    it('应该显示错误状态', () => {
      const errorMessage = '加载失败';
      render(
        <UserRelationWordCloud
          network={null}
          error={new Error(errorMessage)}
        />
      );
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('应该显示空数据状态', () => {
      render(<UserRelationWordCloud network={null} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('应该在网络数据为空对象时显示空状态', () => {
      render(<UserRelationWordCloud network={emptyNetwork} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('应该在加载完成后显示词云', () => {
      const { rerender } = render(
        <UserRelationWordCloud network={null} isLoading={true} />
      );

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();

      rerender(<UserRelationWordCloud network={mockNetwork} isLoading={false} />);

      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      expect(screen.getByTestId('word-cloud')).toBeInTheDocument();
    });
  });
});
