import { describe, expect, it, vi } from 'vitest';
import { EventInstitutionService } from './event-institution.service';
import { mockEntityManager } from '../../../test-setup';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('EventInstitutionService', () => {
  it('aggregates institution accounts by influence and interaction', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      addGroupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([
        {
          userId: 'user-1',
          screenName: '新华社',
          verifiedType: 1,
          avatar: 'https://example.com/a.png',
          postCount: '5',
          interactionCount: '120',
          influenceScore: '9800',
          sentimentPositive: '0.6',
          sentimentNegative: '0.1',
        },
      ]),
    };

    vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
      createQueryBuilder: vi.fn(() => query),
    } as any);

    const service = new EventInstitutionService();
    const result = await service.getEventInstitutions('event-1');

    expect(result).toEqual([
      expect.objectContaining({
        userId: 'user-1',
        institutionType: 'state_media',
        postCount: 5,
        interactionCount: 120,
      }),
    ]);
  });
});
