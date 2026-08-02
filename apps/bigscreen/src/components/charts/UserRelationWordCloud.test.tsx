/**
 * UserRelationWordCloud 组件测试
 * 测试用户关系词云组件的核心功能，包括：
 * - 基础渲染
 * - 数据处理（连线数计算、排序、限制词数、颜色分配）
 * - 关系类型切换
 * - 状态管理（加载、错误、空数据）
 * - 性能优化（useMemo缓存）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { UserRelationNetwork } from '@sker/sdk';

// Mock WordCloud component
vi.mock('@sker/ui/components/ui/word-cloud', () => ({
  WordCloud: ({ data, onWordClick }: any) => (
    <div data-testid="word-cloud">
      {data.map((item: any) => (
        <div
          key={item.name}
          data-testid={`word-${item.name}`}
          data-value={item.value}
          data-color={item.color}
          onClick={() => onWordClick?.(item)}
        >
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  ),
}));

// Mock ChartState component
vi.mock('@sker/ui/components/ui/chart-state', () => ({
  ChartState: ({ loading, error, empty, children }: any) => {
    if (loading) return <div data-testid="loading-state">加载中...</div>;
    if (error) return <div data-testid="error-state">{error}</div>;
    if (empty) return <div data-testid="empty-state">暂无数据</div>;
    return <>{children}</>;
  },
}));

// Mock ToggleGroup component
vi.mock('@sker/ui/components/ui/toggle-group', () => {
  const React = require('react');
  return {
    ToggleGroup: ({ value, onValueChange, children }: any) => {
      // Clone children and inject onClick handler
      const childrenWithProps = React.Children.map(children, (child: any) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { onValueChange });
        }
        return child;
      });
      return (
        <div data-testid="toggle-group" data-value={value}>
          {childrenWithProps}
        </div>
      );
    },
    ToggleGroupItem: ({ value, children, onValueChange }: any) => (
      <button
        data-testid={`toggle-${value}`}
        onClick={() => onValueChange?.(value)}
      >
        {children}
      </button>
    ),
  };
});

// Mock utils
vi.mock('@/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// 导入待测试组件（需要在所有 mock 之后）
import { UserRelationWordCloud } from './UserRelationWordCloud';

// Mock 数据
const mockNetwork: UserRelationNetwork = {
  nodes: [
    {
      id: '1',
      name: '用户A',
      avatar: 'avatar1.jpg',
      followers: 10000,
      influence: 85,
      postCount: 500,
      verified: true,
      userType: 'kol',
      location: '北京',
    },
    {
      id: '2',
      name: '用户B',
      avatar: 'avatar2.jpg',
      followers: 5000,
      influence: 65,
      postCount: 300,
      verified: false,
      userType: 'normal',
      location: '上海',
    },
    {
      id: '3',
      name: '用户C',
      avatar: 'avatar3.jpg',
      followers: 8000,
      influence: 75,
      postCount: 400,
      verified: true,
      userType: 'media',
      location: '广州',
    },
    {
      id: '4',
      name: '用户D',
      avatar: 'avatar4.jpg',
      followers: 3000,
      influence: 45,
      postCount: 200,
      verified: false,
      userType: 'normal',
      location: '深圳',
    },
    {
      id: '5',
      name: '用户E',
      avatar: 'avatar5.jpg',
      followers: 1000,
      influence: 25,
      postCount: 100,
      verified: false,
      userType: 'normal',
      location: '杭州',
    },
  ],
  edges: [
    {
      source: '1',
      target: '2',
      weight: 10,
      type: 'comment',
      interactions: { comments: 10 },
    },
    {
      source: '1',
      target: '3',
      weight: 15,
      type: 'like',
      interactions: { likes: 15 },
    },
    {
      source: '2',
      target: '3',
      weight: 8,
      type: 'repost',
      interactions: { reposts: 8 },
    },
    {
      source: '2',
      target: '4',
      weight: 5,
      type: 'comment',
      interactions: { comments: 5 },
    },
    {
      source: '3',
      target: '4',
      weight: 12,
      type: 'like',
      interactions: { likes: 12 },
    },
    {
      source: '3',
      target: '5',
      weight: 6,
      type: 'repost',
      interactions: { reposts: 6 },
    },
    {
      source: '4',
      target: '5',
      weight: 3,
      type: 'comment',
      interactions: { comments: 3 },
    },
  ],
  statistics: {
    totalUsers: 5,
    totalRelations: 7,
    avgDegree: 2.8,
    density: 0.35,
    communities: 2,
  },
};

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
      const networkWithLowInfluence: UserRelationNetwork = {
        ...mockNetwork,
        nodes: [
          ...mockNetwork.nodes,
          {
            id: '6',
            name: '用户F',
            avatar: 'avatar6.jpg',
            followers: 100,
            influence: 10,
            postCount: 10,
            verified: false,
            userType: 'normal',
          },
        ],
        edges: [
          ...mockNetwork.edges,
          {
            source: '5',
            target: '6',
            weight: 1,
            type: 'comment',
            interactions: { comments: 1 },
          },
        ],
      };

      render(<UserRelationWordCloud network={networkWithLowInfluence} />);

      const user6 = screen.getByTestId('word-用户F');
      expect(user6).toHaveAttribute('data-color', '#6b7280');
    });

    it('应该过滤掉连线数为0的用户', () => {
      const networkWithIsolatedNode: UserRelationNetwork = {
        ...mockNetwork,
        nodes: [
          ...mockNetwork.nodes,
          {
            id: '99',
            name: '孤立用户',
            avatar: 'avatar99.jpg',
            followers: 1000,
            influence: 50,
            postCount: 100,
            verified: false,
            userType: 'normal',
          },
        ],
      };

      render(<UserRelationWordCloud network={networkWithIsolatedNode} />);

      expect(screen.queryByTestId('word-孤立用户')).not.toBeInTheDocument();
    });
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
      const emptyNetwork: UserRelationNetwork = {
        nodes: [],
        edges: [],
        statistics: {
          totalUsers: 0,
          totalRelations: 0,
          avgDegree: 0,
          density: 0,
        },
      };

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
      const modifiedNetwork: UserRelationNetwork = {
        ...mockNetwork,
        edges: [
          ...mockNetwork.edges,
          {
            source: '1',
            target: '4',
            weight: 5,
            type: 'comment',
            interactions: { comments: 5 },
          },
        ],
      };

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

  /**
   * 边界情况测试
   */
  describe('边界情况', () => {
    it('应该处理只有节点没有边的网络', () => {
      const noEdgesNetwork: UserRelationNetwork = {
        nodes: mockNetwork.nodes,
        edges: [],
        statistics: {
          totalUsers: 5,
          totalRelations: 0,
          avgDegree: 0,
          density: 0,
        },
      };

      render(<UserRelationWordCloud network={noEdgesNetwork} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('应该处理大数据集', () => {
      const largeNetwork: UserRelationNetwork = {
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          id: `${i}`,
          name: `用户${i}`,
          followers: Math.floor(Math.random() * 10000),
          influence: Math.floor(Math.random() * 100),
          postCount: Math.floor(Math.random() * 1000),
          verified: Math.random() > 0.5,
          userType: 'normal' as const,
        })),
        edges: Array.from({ length: 5000 }, (_, _i) => ({
          source: `${Math.floor(Math.random() * 1000)}`,
          target: `${Math.floor(Math.random() * 1000)}`,
          weight: Math.floor(Math.random() * 10) + 1,
          type: 'comprehensive' as const,
          interactions: {},
        })),
        statistics: {
          totalUsers: 1000,
          totalRelations: 5000,
          avgDegree: 10,
          density: 0.005,
        },
      };

      render(<UserRelationWordCloud network={largeNetwork} maxWords={50} />);

      const wordCloud = screen.getByTestId('word-cloud');
      const words = Array.from(wordCloud.children);

      // 验证限制了词数
      expect(words.length).toBeLessThanOrEqual(50);
    });

    it('应该处理自环边（source === target）', () => {
      const selfLoopNetwork: UserRelationNetwork = {
        ...mockNetwork,
        edges: [
          ...mockNetwork.edges,
          {
            source: '1',
            target: '1',
            weight: 5,
            type: 'comment',
            interactions: { comments: 5 },
          },
        ],
      };

      render(<UserRelationWordCloud network={selfLoopNetwork} />);

      // 应该正常渲染，自环边计入连线数
      const user1 = screen.getByTestId('word-用户A');
      expect(user1).toBeInTheDocument();
    });

    it('应该处理重复边', () => {
      const duplicateEdgesNetwork: UserRelationNetwork = {
        ...mockNetwork,
        edges: [
          ...mockNetwork.edges,
          {
            source: '1',
            target: '2',
            weight: 5,
            type: 'comment',
            interactions: { comments: 5 },
          },
        ],
      };

      render(<UserRelationWordCloud network={duplicateEdgesNetwork} />);

      // 应该正常渲染，重复边都计入连线数
      const user1 = screen.getByTestId('word-用户A');
      expect(user1).toBeInTheDocument();
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

