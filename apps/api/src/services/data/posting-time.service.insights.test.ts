import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostingTimeService } from './posting-time.service';
import { mockEntityManager } from '../../test-setup';
import {
  setupPostingTimeTest,
  createPost,
} from './posting-time.service.test-helpers';

// Mock dependencies
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('PostingTimeService', () => {
  let service: PostingTimeService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    const harness = setupPostingTimeTest();
    service = harness.service;
    mockQueryBuilder = harness.mockQueryBuilder;
    vi.clearAllMocks();
  });

  describe('洞察生成', () => {
    it('应该生成工作时间发帖高峰洞察', async () => {
      // 周一到周五，9-18点发帖（每天10条，共50条）
      const mockPosts = [];
      const dates = [
        '2024-01-15', // 周一
        '2024-01-16', // 周二
        '2024-01-17', // 周三
        '2024-01-18', // 周四
        '2024-01-19', // 周五
      ];

      for (const dateStr of dates) {
        for (let hour = 9; hour <= 18; hour++) {
          // 使用 padStart 确保小时是两位数
          const hourStr = String(hour).padStart(2, '0');
          mockPosts.push(createPost({
            id: `post-${dateStr}-${hour}`,
            created_at: new Date(`${dateStr}T${hourStr}:00:00+08:00`),
          }));
        }
      }

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.insights).toContain('发帖高峰集中在工作时间');
    });

    it('应该生成周末活跃度洞察', async () => {
      // 周日和周六发帖占比 > 40%
      const mockPosts = [];
      // 周日 40条
      for (let i = 0; i < 40; i++) {
        mockPosts.push(createPost({
          id: `sun-${i}`,
          created_at: new Date('2024-01-14T10:00:00+08:00'),
        }));
      }
      // 周六 30条
      for (let i = 0; i < 30; i++) {
        mockPosts.push(createPost({
          id: `sat-${i}`,
          created_at: new Date('2024-01-20T10:00:00+08:00'),
        }));
      }
      // 工作日 30条
      for (let i = 0; i < 30; i++) {
        mockPosts.push(createPost({
          id: `work-${i}`,
          created_at: new Date('2024-01-15T10:00:00+08:00'),
        }));
      }

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockPosts);

      const result = await service.getPostingTimeHeatmap('event-123');

      expect(result.insights).toContain('周末发帖活跃度较高');
    });
  });
});
