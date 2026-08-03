/**
 * SpreadBreadthService - 边界条件测试
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

describe('SpreadBreadthService - 边界条件', () => {
  let service: ReturnType<typeof setupSpreadBreadthTest>['service'];
  let mockQueryBuilder: ReturnType<typeof setupSpreadBreadthTest>['mockQueryBuilder'];

  beforeEach(() => {
    const ctx = setupSpreadBreadthTest();
    service = ctx.service;
    mockQueryBuilder = ctx.mockQueryBuilder;
  });

  it('应该处理重复转发', async () => {
    const mockPostsData = mockPosts(['post1']);
    const mockReposts = [
      { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
      { postId: 'post1', repostId: 'repost2', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:05:00Z') },
    ];

    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

    const result = await service.getBreadthAnalysis('event-123');

    expect(result.totalReposts).toBe(2);
    expect(result.uniqueReposters).toBe(1);
  });

  it('应该处理循环转发', async () => {
    const mockPostsData = mockPosts(['post1']);
    const mockReposts = [
      { postId: 'post1', repostId: 'repost1', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T10:00:00Z') },
      { postId: 'repost1', repostId: 'repost2', userId: '100002', screenName: 'User B', userClass: null, verified: false, createdAt: new Date('2024-01-01T11:00:00Z') },
      { postId: 'repost2', repostId: 'repost3', userId: '100001', screenName: 'User A', userClass: null, verified: false, createdAt: new Date('2024-01-01T12:00:00Z') },
    ];

    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockPostsData); // posts
    mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockReposts); // reposts

    const result = await service.getBreadthAnalysis('event-123');

    expect(result.spreadDepth).toBeGreaterThan(0);
    expect(result.uniqueReposters).toBe(2);
  });
});
