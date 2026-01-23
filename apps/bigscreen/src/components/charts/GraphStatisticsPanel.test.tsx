/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GraphStatisticsPanel } from './GraphStatisticsPanel';
import type { CommunityStats, TopUser, LocationStats } from '../../hooks/useGraphStatistics';

describe('GraphStatisticsPanel', () => {
  const mockCommunityStats: CommunityStats[] = [
    { communityId: 0, nodeCount: 5, color: '#ff0000', members: [{ id: '1', name: '用户A' }, { id: '2', name: '用户B' }] },
    { communityId: 1, nodeCount: 3, color: '#00ff00', members: [{ id: '3', name: '用户C' }] },
  ];

  const mockTopUsers: TopUser[] = [
    { id: '1', name: '用户A', degree: 10, followers: 1000, verified: true, userType: 'kol', location: '北京' },
    { id: '2', name: '用户B', degree: 8, followers: 500, verified: false, userType: 'normal', location: '上海' },
    { id: '3', name: '用户C', degree: 5, followers: 2000, verified: true, userType: 'media', location: '北京' },
  ];

  const mockLocationStats: LocationStats[] = [
    { location: '北京', count: 10, percentage: 50 },
    { location: '上海', count: 6, percentage: 30 },
    { location: '广州', count: 4, percentage: 20 },
  ];

  describe('渲染', () => {
    it('应该正确渲染面板', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      expect(screen.getByText('统计信息')).toBeInTheDocument();
    });

    it('应该显示三个 Tab', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      expect(screen.getByText('群组')).toBeInTheDocument();
      expect(screen.getByText('用户')).toBeInTheDocument();
      expect(screen.getByText('区域')).toBeInTheDocument();
    });
  });

  describe('Tab 切换', () => {
    it('默认显示群组 Tab 内容', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      // 群组内容应该可见
      expect(screen.getByText('群组 #1')).toBeInTheDocument();
    });

    it('点击用户 Tab 应该显示用户排名', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      fireEvent.click(screen.getByText('用户'));

      expect(screen.getByText('用户A')).toBeInTheDocument();
      expect(screen.getByText('10 连线')).toBeInTheDocument();
    });

    it('点击区域 Tab 应该显示区域统计', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      fireEvent.click(screen.getByText('区域'));

      expect(screen.getByText('北京')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('群组统计', () => {
    it('应该显示群组颜色标识', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      const colorIndicators = document.querySelectorAll('[data-testid="community-color"]');
      expect(colorIndicators.length).toBeGreaterThan(0);
    });

    it('应该显示群组节点数量', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      expect(screen.getByText('5 人')).toBeInTheDocument();
      expect(screen.getByText('3 人')).toBeInTheDocument();
    });
  });

  describe('用户排名', () => {
    it('应该显示用户排名序号', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      fireEvent.click(screen.getByText('用户'));

      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });

    it('应该显示认证标识', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      fireEvent.click(screen.getByText('用户'));

      // 用户A 和 用户C 是认证用户
      const verifiedBadges = document.querySelectorAll('[data-testid="verified-badge"]');
      expect(verifiedBadges.length).toBe(2);
    });
  });

  describe('区域统计', () => {
    it('应该显示进度条', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      fireEvent.click(screen.getByText('区域'));

      const progressBars = document.querySelectorAll('[data-testid="location-progress"]');
      expect(progressBars.length).toBe(3);
    });
  });

  describe('折叠功能', () => {
    it('点击折叠按钮应该隐藏内容', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      const collapseButton = screen.getByTestId('collapse-button');
      fireEvent.click(collapseButton);

      // 内容应该被隐藏
      expect(screen.queryByText('群组 #1')).not.toBeInTheDocument();
    });

    it('再次点击应该展开内容', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      const collapseButton = screen.getByTestId('collapse-button');
      fireEvent.click(collapseButton); // 折叠
      fireEvent.click(collapseButton); // 展开

      expect(screen.getByText('群组 #1')).toBeInTheDocument();
    });
  });

  describe('空数据处理', () => {
    it('空群组数据应该显示空状态', () => {
      render(
        <GraphStatisticsPanel
          communityStats={[]}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
        />
      );

      expect(screen.getByText('暂无群组数据')).toBeInTheDocument();
    });

    it('空用户数据应该显示空状态', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={[]}
          locationStats={mockLocationStats}
        />
      );

      fireEvent.click(screen.getByText('用户'));

      expect(screen.getByText('暂无用户数据')).toBeInTheDocument();
    });

    it('空区域数据应该显示空状态', () => {
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={[]}
        />
      );

      fireEvent.click(screen.getByText('区域'));

      expect(screen.getByText('暂无区域数据')).toBeInTheDocument();
    });
  });

  describe('回调函数', () => {
    it('点击用户应该触发 onUserClick', () => {
      const onUserClick = vi.fn();
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
          onUserClick={onUserClick}
        />
      );

      fireEvent.click(screen.getByText('用户'));
      fireEvent.click(screen.getByText('用户A'));

      expect(onUserClick).toHaveBeenCalledWith(mockTopUsers[0]);
    });

    it('点击群组应该触发 onCommunityClick', () => {
      const onCommunityClick = vi.fn();
      render(
        <GraphStatisticsPanel
          communityStats={mockCommunityStats}
          topUsers={mockTopUsers}
          locationStats={mockLocationStats}
          onCommunityClick={onCommunityClick}
        />
      );

      fireEvent.click(screen.getByText('群组 #1'));

      expect(onCommunityClick).toHaveBeenCalledWith(mockCommunityStats[0]);
    });
  });
});
