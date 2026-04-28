import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityManager } from '@sker/entities';
import { PersonaService } from './persona.service';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn(),
  };
});

describe('PersonaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns hub-aware memory graph nodes when section hubs exist', async () => {
    vi.mocked(useEntityManager).mockImplementation(async (handler: any) => {
      return handler({
        async findOneOrFail(entity: any) {
          if (entity.name === 'PersonaEntity') {
            return {
              id: 'persona-1',
              name: '用户A',
              avatar: null,
              description: '画像',
              traits: ['热点追逐'],
            };
          }
          throw new Error('unexpected entity');
        },
        async find(entity: any) {
          if (entity.name === 'MemoryEntity') {
            return [
              {
                id: 'hub-1',
                name: '行为模式',
                description: 'behavior section hub',
                content: 'behavior section hub',
                type: 'concept',
                created_at: new Date('2026-04-23T00:00:00.000Z'),
              },
              {
                id: 'leaf-1',
                name: '夜间活跃',
                description: null,
                content: '夜间活跃',
                type: 'fact',
                created_at: new Date('2026-04-23T00:00:00.000Z'),
              },
            ];
          }
          return [];
        },
        createQueryBuilder() {
          return {
            where() {
              return this;
            },
            orWhere() {
              return this;
            },
            async getMany() {
              return [
                {
                  id: 'r1',
                  source_id: 'hub-1',
                  target_id: 'leaf-1',
                  relation_type: 'contains',
                },
              ];
            },
          };
        },
      });
    });

    const service = new PersonaService({} as any, {} as any);
    const graph = await service.getMemoryGraph('persona-1');

    expect(graph.memories.find((item) => item.id === 'hub-1')?.isSectionHub).toBe(true);
    expect(graph.memories.find((item) => item.id === 'hub-1')?.section).toBe('behavior');
    expect(graph.memories.find((item) => item.id === 'leaf-1')?.isSectionHub).toBe(false);
  });
});
