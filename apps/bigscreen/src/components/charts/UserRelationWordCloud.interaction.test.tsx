/**
 * UserRelationWordCloud 组件测试 - 交互测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
   * 交互测试
   */
  describe('交互测试', () => {
    it('应该在点击词时触发回调', () => {
      const handleWordClick = vi.fn();
      render(
        <UserRelationWordCloud
          network={mockNetwork}
          onWordClick={handleWordClick}
        />
      );

      const user1 = screen.getByTestId('word-用户A');
      fireEvent.click(user1);

      expect(handleWordClick).toHaveBeenCalledTimes(1);
      expect(handleWordClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          name: '用户A',
          connectionCount: 2,
        })
      );
    });

    it('应该传递正确的用户信息给回调', () => {
      const handleWordClick = vi.fn();
      render(
        <UserRelationWordCloud
          network={mockNetwork}
          onWordClick={handleWordClick}
        />
      );

      const user3 = screen.getByTestId('word-用户C');
      fireEvent.click(user3);

      expect(handleWordClick).toHaveBeenCalledWith({
        id: '3',
        name: '用户C',
        connectionCount: 4,
      });
    });
  });
});
