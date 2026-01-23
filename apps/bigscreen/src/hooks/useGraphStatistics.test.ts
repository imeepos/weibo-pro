import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGraphStatistics } from './useGraphStatistics';
import type { GraphData } from '@sker/ui/components/ui/force-graph-3d';
import type { UserRelationNode } from '@sker/sdk';

describe('useGraphStatistics', () => {
  // 测试数据
  const mockNodes: UserRelationNode[] = [
    { id: '1', name: '用户A', followers: 1000, influence: 0.8, postCount: 100, verified: true, userType: 'kol', location: '北京' },
    { id: '2', name: '用户B', followers: 500, influence: 0.5, postCount: 50, verified: false, userType: 'normal', location: '上海' },
    { id: '3', name: '用户C', followers: 2000, influence: 0.9, postCount: 200, verified: true, userType: 'media', location: '北京' },
    { id: '4', name: '用户D', followers: 300, influence: 0.3, postCount: 30, verified: false, userType: 'normal', location: '广州' },
    { id: '5', name: '用户E', followers: 800, influence: 0.6, postCount: 80, verified: false, userType: 'normal', location: '上海' },
  ];

  const mockGraphData: GraphData = {
    nodes: [
      { id: '1', name: '用户A', val: 3, color: '#ff0000', communityId: 0 },
      { id: '2', name: '用户B', val: 2, color: '#ff0000', communityId: 0 },
      { id: '3', name: '用户C', val: 4, color: '#00ff00', communityId: 1 },
      { id: '4', name: '用户D', val: 1, color: '#00ff00', communityId: 1 },
      { id: '5', name: '用户E', val: 2, color: '#0000ff', communityId: 2 },
    ],
    links: [
      { source: '1', target: '2', value: 1 },
      { source: '1', target: '3', value: 2 },
      { source: '2', target: '3', value: 1 },
      { source: '3', target: '4', value: 1 },
      { source: '5', target: '1', value: 1 },
    ],
  };

  describe('群组统计', () => {
    it('应该按 communityId 分组并统计节点数量', () => {
      const { result } = renderHook(() => useGraphStatistics(mockGraphData, mockNodes));

      expect(result.current.communityStats).toHaveLength(3);
      // 群组0有2个节点，群组1有2个节点，群组2有1个节点
      expect(result.current.communityStats[0].nodeCount).toBe(2);
      expect(result.current.communityStats[1].nodeCount).toBe(2);
      expect(result.current.communityStats[2].nodeCount).toBe(1);
    });

    it('应该按节点数量降序排列', () => {
      const { result } = renderHook(() => useGraphStatistics(mockGraphData, mockNodes));

      const counts = result.current.communityStats.map(c => c.nodeCount);
      for (let i = 0; i < counts.length - 1; i++) {
        expect(counts[i]).toBeGreaterThanOrEqual(counts[i + 1]);
      }
    });

    it('应该���含群组颜色信息', () => {
      const { result } = renderHook(() => useGraphStatistics(mockGraphData, mockNodes));

      result.current.communityStats.forEach(stat => {
        expect(stat.color).toBeDefined();
        expect(stat.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('用户连线排名', () => {
    it('应该按连线数量（度数）降序排列', () => {
      const { result } = renderHook(() => useGraphStatistics(mockGraphData, mockNodes));

      const degrees = result.current.topUsers.map(u => u.degree);
      for (let i = 0; i < degrees.length - 1; i++) {
        expect(degrees[i]).toBeGreaterThanOrEqual(degrees[i + 1]);
      }
    });

    it('应该返回最多10个用户', () => {
      const { result } = renderHook(() => useGraphStatistics(mockGraphData, mockNodes));

      expect(result.current.topUsers.length).toBeLessThanOrEqual(10);
    });

    it('应该包含用户详细信息', () => {
      const { result } = renderHook(() => useGraphStatistics(mockGraphData, mockNodes));

      result.current.topUsers.forEach(user => {
        expect(user.id).toBeDefined();
        expect(user.name).toBeDefined();
        expect(user.degree).toBeGreaterThanOrEqual(0);
      });
    });

    it('用户C应该排名第一（度数为4）', () => {
      const { result } = renderHook(() => useGraphStatistics(mockGraphData, mockNodes));

      expect(result.current.topUsers[0].id).toBe('3');
      expect(result.current.topUsers[0].name).toBe('用户C');
      expect(result.current.topUsers[0].degree).toBe(4);
    });
  });

  describe('区域统计', () => {
    it('应该按 location 分组并统计用户数量', () => {
      const { result } = renderHook(() => useGraphStatistics(mockGraphData, mockNodes));

      expect(result.current.locationStats.length).toBeGreaterThan(0);
      // 北京2人，上海2人，广州1人
      const beijing = result.current.locationStats.find(l => l.location === '北京');
      const shanghai = result.current.locationStats.find(l => l.location === '上海');
      const guangzhou = result.current.locationStats.find(l => l.location === '广州');

      expect(beijing?.count).toBe(2);
      expect(shanghai?.count).toBe(2);
      expect(guangzhou?.count).toBe(1);
    });

    it('应该按用户数量降序排列', () => {
      const { result } = renderHook(() => useGraphStatistics(mockGraphData, mockNodes));

      const counts = result.current.locationStats.map(l => l.count);
      for (let i = 0; i < counts.length - 1; i++) {
        expect(counts[i]).toBeGreaterThanOrEqual(counts[i + 1]);
      }
    });

    it('应该计算百分比', () => {
      const { result } = renderHook(() => useGraphStatistics(mockGraphData, mockNodes));

      const totalPercentage = result.current.locationStats.reduce((sum, l) => sum + l.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });
  });

  describe('边界情况', () => {
    it('空数据应该返回空数组', () => {
      const emptyGraphData: GraphData = { nodes: [], links: [] };
      const { result } = renderHook(() => useGraphStatistics(emptyGraphData, []));

      expect(result.current.communityStats).toEqual([]);
      expect(result.current.topUsers).toEqual([]);
      expect(result.current.locationStats).toEqual([]);
    });

    it('null graphData 应该返回空数组', () => {
      const { result } = renderHook(() => useGraphStatistics(null, mockNodes));

      expect(result.current.communityStats).toEqual([]);
      expect(result.current.topUsers).toEqual([]);
      expect(result.current.locationStats).toEqual([]);
    });

    it('没有 location 的用户应该归类为"未知"', () => {
      const nodesWithoutLocation: UserRelationNode[] = [
        { id: '1', name: '用户A', followers: 1000, influence: 0.8, postCount: 100, verified: true, userType: 'kol' },
      ];
      const graphData: GraphData = {
        nodes: [{ id: '1', name: '用户A', val: 1, color: '#ff0000', communityId: 0 }],
        links: [],
      };

      const { result } = renderHook(() => useGraphStatistics(graphData, nodesWithoutLocation));

      const unknown = result.current.locationStats.find(l => l.location === '未知');
      expect(unknown?.count).toBe(1);
    });
  });
});
