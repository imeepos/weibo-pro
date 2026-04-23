import { describe, expect, it, vi } from 'vitest';
import { EventOpinionService } from './event-opinion.service';
import { mockEntityManager } from '../../../test-setup';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('EventOpinionService', () => {
  it('groups posts into stance-based opinion clusters', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          post_id: 'post-1',
          sentiment: { overall: 'negative' },
          keywords: [{ keyword: '追责', weight: 0.8, sentiment: 'negative' }],
          post: {
            id: 'post-1',
            text_raw: '应该追责相关责任方',
            comments_count: 30,
            reposts_count: 20,
            attitudes_count: 15,
            user: {
              screen_name: '用户A',
            },
          },
        },
        {
          post_id: 'post-2',
          sentiment: { overall: 'negative' },
          keywords: [{ keyword: '透明', weight: 0.7, sentiment: 'negative' }],
          post: {
            id: 'post-2',
            text_raw: '事件需要公开透明地回应',
            comments_count: 10,
            reposts_count: 6,
            attitudes_count: 8,
            user: {
              screen_name: '用户B',
            },
          },
        },
      ]),
    };

    vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
      createQueryBuilder: vi.fn(() => query),
    } as any);

    const service = new EventOpinionService();
    const clusters = await service.getEventOpinionClusters('event-1');

    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({
      stance: 'critical',
      postCount: 2,
      representativePosts: expect.arrayContaining([
        expect.objectContaining({ postId: 'post-1', author: '用户A' }),
      ]),
    });
    expect(clusters[0]?.keywords).toEqual(expect.arrayContaining(['追责', '透明']));
  });
});
