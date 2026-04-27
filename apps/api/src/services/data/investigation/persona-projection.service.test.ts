import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersonaProjectionService } from './persona-projection.service';
import { useEntityManager } from '@sker/entities';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn(),
  };
});

describe('PersonaProjectionService', () => {
  const baseInput = {
    weiboUserId: '100',
    screenName: '用户A',
    avatar: null,
    summary: { short: '摘要', long: '长摘要', confidence: 0.9 },
    identity: {
      inferredRole: '热点自媒体',
      roleConfidence: 0.8,
      accountNature: ['media'],
      stableTraits: ['热点追逐'],
    },
    behavior: {
      activityPattern: ['夜间活跃'],
      postingRhythm: 'bursty',
      escalationPattern: ['突发追热点'],
      historicalStability: 'medium',
    },
    content: {
      primaryTopics: ['体育'],
      narrativeStyles: ['情绪放大'],
      emotionalTendency: ['negative'],
      stancePattern: ['对立'],
    },
    risk: {
      overallLevel: 'high' as const,
      overallScore: 87,
      riskDrivers: [{ label: '情绪极化', reason: '负向占比高', confidence: 0.8 }],
      reviewRecommendation: 'human_review' as const,
    },
    relations: { keyConnections: [], clusterRole: null, coordinationSignals: [] },
    memoryDrafts: [
      {
        type: 'insight' as const,
        name: '热点追逐型',
        description: null,
        content: '长期追逐热点并放大情绪',
        evidenceRefs: [{ sourceTable: 'weibo_posts', sourceId: '1', score: 0.8 }],
        relationDrafts: [
          {
            relationType: 'related' as const,
            targetKind: 'memory' as const,
            targetRef: '情绪放大型',
          },
        ],
      },
      {
        type: 'concept' as const,
        name: '情绪放大型',
        description: null,
        content: '偏好情绪化表达',
        evidenceRefs: [{ sourceTable: 'weibo_posts', sourceId: '2', score: 0.7 }],
        relationDrafts: [],
      },
    ],
    metadata: {
      sampledPosts: 20,
      sampledComments: 0,
      sampledReposts: 3,
      windowDays: 90,
      model: 'gpt-5',
      promptVersion: 'v1',
      generatedAt: '2026-04-23T00:00:00.000Z',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes distilled output into persona, memory, relation, and evidence layers', async () => {
    const service = new PersonaProjectionService();

    const result = await service.buildProjection(baseInput);

    expect(result.persona.traits).toEqual(['热点追逐']);
    expect(result.memories).toHaveLength(2);
    expect(result.evidence[0]?.sourceTable).toBe('weibo_posts');
  });

  it('creates memory relations when relationDrafts point to sibling memory names', async () => {
    const savedEntities: Record<string, any[]> = {};
    let sequence = 0;

    vi.mocked(useEntityManager).mockImplementation(async (handler: any) => {
      const createRepo = (entityName: string) => ({
        async findOne() {
          return null;
        },
        async find(options?: any) {
          if (entityName === 'MemoryEntity') {
            return [];
          }
          if (entityName === 'MemoryClosureEntity' && options?.where?.descendant_id) {
            return [{
              ancestor_id: options.where.descendant_id,
              descendant_id: options.where.descendant_id,
              path: [options.where.descendant_id],
              depth: 0,
            }];
          }
          return [];
        },
        create(input: any) {
          return { ...input };
        },
        async save(input: any) {
          const entity = {
            id: input.id ?? `${entityName}-${++sequence}`,
            ...input,
            created_at: input.created_at ?? new Date('2026-04-23T00:00:00.000Z'),
            updated_at: input.updated_at ?? new Date('2026-04-23T00:00:00.000Z'),
          };
          savedEntities[entityName] ??= [];
          savedEntities[entityName].push(entity);
          return entity;
        },
        async delete() {
          return;
        },
      });

      return handler({
        getRepository(entity: any) {
          return createRepo(entity.name);
        },
      });
    });

    const service = new PersonaProjectionService();
    await service.publishProfile(baseInput);

    expect(savedEntities.MemoryRelationEntity).toHaveLength(1);
    expect(savedEntities.MemoryRelationEntity?.[0]).toMatchObject({
      relation_type: 'related',
    });
    expect(savedEntities.MemoryClosureEntity?.length).toBeGreaterThanOrEqual(3);
  });

  it('creates a synthetic person memory when relationDraft targets a persona', async () => {
    const savedEntities: Record<string, any[]> = {};
    let sequence = 0;

    vi.mocked(useEntityManager).mockImplementation(async (handler: any) => {
      const createRepo = (entityName: string) => ({
        async findOne() {
          return null;
        },
        async find(options?: any) {
          if (entityName === 'MemoryEntity') {
            return [];
          }
          if (entityName === 'MemoryClosureEntity' && options?.where?.descendant_id) {
            return [{
              ancestor_id: options.where.descendant_id,
              descendant_id: options.where.descendant_id,
              path: [options.where.descendant_id],
              depth: 0,
            }];
          }
          return [];
        },
        create(input: any) {
          return { ...input };
        },
        async save(input: any) {
          const entity = {
            id: input.id ?? `${entityName}-${++sequence}`,
            ...input,
            created_at: input.created_at ?? new Date('2026-04-23T00:00:00.000Z'),
            updated_at: input.updated_at ?? new Date('2026-04-23T00:00:00.000Z'),
          };
          savedEntities[entityName] ??= [];
          savedEntities[entityName].push(entity);
          return entity;
        },
        async delete() {
          return;
        },
      });

      return handler({
        getRepository(entity: any) {
          return createRepo(entity.name);
        },
      });
    });

    const service = new PersonaProjectionService();
    await service.publishProfile({
      ...baseInput,
      memoryDrafts: [
        {
          type: 'insight',
          name: '热点追逐型',
          description: null,
          content: '长期追逐热点并放大情绪',
          evidenceRefs: [{ sourceTable: 'weibo_posts', sourceId: '1', score: 0.8 }],
          relationDrafts: [
            {
              relationType: 'related',
              targetKind: 'persona',
              targetRef: '用户B Persona',
            },
          ],
        },
      ],
    });

    expect(savedEntities.MemoryEntity?.some((item) => item.name === '用户B Persona' && item.type === 'person')).toBe(true);
    expect(savedEntities.MemoryRelationEntity?.length).toBe(1);
  });
});
