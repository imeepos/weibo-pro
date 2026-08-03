/**
 * SpreadBreadthService - 聚合传播数据测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockEntityManager } from '../../test-setup';
import { setupSpreadBreadthTest, mockPosts } from './spread-breadth.service.test-helpers';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('SpreadBreadthService - 聚合传播数据', () => {
  let service: ReturnType<typeof setupSpreadBreadthTest>['service'];
  let mockQueryBuilder: ReturnType<typeof setupSpreadBreadthTest>['mockQueryBuilder'];

  beforeEach(() => {
    const ctx = setupSpreadBreadthTest();
    service = ctx.service;
    mockQueryBuilder = ctx.mockQueryBuilder;
  });

  it('应该生成聚合节点数据', async () => {
    const mockPostsData = mockPosts(['post1']);
    const mockReposts = [
      { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
      { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'User B', userClass: null, verified: true, createdAt: new Date('2024-01-01T10:05:00Z') },
      { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'User C', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:10:00Z') },
    ];

    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData);
    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

    const result = await service.getBreadthAnalysis('event-123');

    // 测试 aggregatedPropagation 字段存在
    expect(result.aggregatedPropagation).toBeDefined();
    expect(result.aggregatedPropagation?.nodes).toBeDefined();
    expect(result.aggregatedPropagation?.links).toBeDefined();
    expect(result.aggregatedPropagation?.levelStats).toBeDefined();
  });

  it('应该按用户类型聚合节点', async () => {
    const mockPostsData = mockPosts(['post1']);
    const mockReposts = [
      // Level 1 - 各类型用户
      { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'VIP User 1', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
      { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'VIP User 2', userClass: 2, verified: false, createdAt: new Date('2024-01-01T10:05:00Z') },
      { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'Verified User', userClass: null, verified: true, createdAt: new Date('2024-01-01T10:10:00Z') },
      { postId: 'post1', repostId: 'repost4', userId: '100004', screenName: 'Ordinary User', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:15:00Z') },
      // Level 2 - 更多用户
      { postId: 'repost1', repostId: 'repost5', userId: '100005', screenName: 'VIP User 3', userClass: 1, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
      { postId: 'repost2', repostId: 'repost6', userId: '100006', screenName: 'Ordinary User 2', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:05:00Z') },
    ];

    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData);
    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

    const result = await service.getBreadthAnalysis('event-123');

    // 测试每层有 VIP/普通/认证 三种聚合节点
    const aggregatedNodes = result.aggregatedPropagation?.nodes || [];
    const level1Nodes = aggregatedNodes.filter(n => n.level === 1 && n.type === 'aggregated');

    // 应该有按用户类型分组的聚合节点
    const userTypes = level1Nodes.map(n => n.userType);
    expect(userTypes).toContain('vip');
    expect(userTypes).toContain('ordinary');
    expect(userTypes).toContain('verified');
  });

  it('应该保留每层 Top N 用户', async () => {
    const mockPostsData = mockPosts(['post1']);
    // 创建多个用户的转发数据
    const mockReposts = [
      { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'Top User 1', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:00:00Z'), followers: 10000 },
      { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'Top User 2', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:05:00Z'), followers: 8000 },
      { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'Top User 3', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:10:00Z'), followers: 6000 },
      { postId: 'post1', repostId: 'repost4', userId: '100004', screenName: 'Normal User 1', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:15:00Z'), followers: 100 },
      { postId: 'post1', repostId: 'repost5', userId: '100005', screenName: 'Normal User 2', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:20:00Z'), followers: 50 },
    ];

    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData);
    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

    const result = await service.getBreadthAnalysis('event-123');

    // 测试 topUsers 数组包含正确的用户
    const aggregatedNodes = result.aggregatedPropagation?.nodes || [];
    const nodesWithTopUsers = aggregatedNodes.filter(n => n.topUsers && n.topUsers.length > 0);

    expect(nodesWithTopUsers.length).toBeGreaterThan(0);

    // 验证 topUsers 结构
    for (const node of nodesWithTopUsers) {
      for (const topUser of node.topUsers || []) {
        expect(topUser.userId).toBeDefined();
        expect(topUser.screenName).toBeDefined();
        expect(topUser.weight).toBeDefined();
      }
    }
  });

  it('应该正确计算层级统计', async () => {
    const mockPostsData = mockPosts(['post1']);
    const mockReposts = [
      // Level 1
      { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'VIP User', userClass: 1, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
      { postId: 'post1', repostId: 'repost2', userId: '100002', screenName: 'Verified User', userClass: null, verified: true, createdAt: new Date('2024-01-01T10:05:00Z') },
      { postId: 'post1', repostId: 'repost3', userId: '100003', screenName: 'Ordinary User', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:10:00Z') },
      // Level 2
      { postId: 'repost1', repostId: 'repost4', userId: '100004', screenName: 'VIP User 2', userClass: 2, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
      { postId: 'repost2', repostId: 'repost5', userId: '100005', screenName: 'Ordinary User 2', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:05:00Z') },
    ];

    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData);
    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

    const result = await service.getBreadthAnalysis('event-123');

    // 测试 levelStats 数据正确
    const levelStats = result.aggregatedPropagation?.levelStats || [];

    expect(levelStats.length).toBeGreaterThan(0);

    // 验证 Level 1 统计
    const level1Stats = levelStats.find(s => s.level === 1);
    expect(level1Stats).toBeDefined();
    expect(level1Stats?.totalUsers).toBe(3);
    expect(level1Stats?.totalReposts).toBe(3);
    expect(level1Stats?.byUserType.vip.count).toBe(1);
    expect(level1Stats?.byUserType.verified.count).toBe(1);
    expect(level1Stats?.byUserType.ordinary.count).toBe(1);

    // 验证 Level 2 统计
    const level2Stats = levelStats.find(s => s.level === 2);
    expect(level2Stats).toBeDefined();
    expect(level2Stats?.totalUsers).toBe(2);
    expect(level2Stats?.totalReposts).toBe(2);
  });

  it('应该限制聚合节点总数', async () => {
    const mockPostsData = mockPosts(['post1']);
    // 创建大量转发数据
    const mockReposts = Array.from({ length: 500 }, (_, i) => ({
      postId: i < 100 ? 'post1' : `repost${Math.floor(i / 5)}`,
      repostId: `repost${i}`,
      userId: `10000${i}`,
      screenName: `User ${i}`,
      userClass: i % 3 === 0 ? 1 : null,
      verified: i % 5 === 0,
      createdAt: new Date(`2024-01-01T${10 + Math.floor(i / 60)}:${i % 60}:00Z`),
    }));

    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData);
    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts);

    const result = await service.getBreadthAnalysis('event-123');

    // 测试节点数量不超过合理范围（如 50 个）
    const aggregatedNodes = result.aggregatedPropagation?.nodes || [];
    expect(aggregatedNodes.length).toBeLessThanOrEqual(50);
  });
});
