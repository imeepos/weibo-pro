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

  it('includes aggregation metadata and graph payloads in persona projection metadata', async () => {
    const service = new PersonaProjectionService();

    const result = await service.buildProjection({
      ...baseInput,
      metadata: {
        ...baseInput.metadata,
        extractorVersion: 'post-v1',
        aggregationVersion: 'agg-v1',
        eventWindowCount: 1,
        coordinationSignalCount: 1,
        warnings: ['帖子 998 提取失败：timeout'],
        graphTree: [{ id: 'event-1', kind: 'event_cluster', label: '事件A' }],
        timeline: [
          {
            bucketStart: '2026-04-28T01:00:00.000Z',
            bucketEnd: '2026-04-28T01:05:00.000Z',
            postCount: 2,
            sameContentCount: 2,
            eventCount: 1,
          },
        ],
        coordinationSignals: [
          {
            id: 'signal-1',
            label: '疑似协同传播',
          },
        ],
      } as any,
    });

    expect((result.persona.metadata as any).aggregation.extractorVersion).toBe('post-v1');
    expect(Array.isArray((result.persona.metadata as any).graphTree)).toBe(true);
    expect(Array.isArray((result.persona.metadata as any).timeline)).toBe(true);
    expect(Array.isArray((result.persona.metadata as any).coordinationSignals)).toBe(true);
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

    expect(savedEntities.MemoryRelationEntity?.some((item) => item.relation_type === 'related')).toBe(true);
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
    expect(savedEntities.MemoryRelationEntity?.some((item) => item.relation_type === 'related')).toBe(true);
  });

  it('creates section hubs and contains relations for llm wiki memories', async () => {
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
          ...baseInput.memoryDrafts[0]!,
          section: 'behavior',
          stability: 'stable',
        },
        {
          ...baseInput.memoryDrafts[1]!,
          section: 'content',
          stability: 'tentative',
        },
      ],
    });

    expect(savedEntities.MemoryEntity?.some((item) => item.name === '行为模式')).toBe(true);
    expect(savedEntities.MemoryEntity?.some((item) => item.name === '内容倾向')).toBe(true);
    expect(savedEntities.MemoryRelationEntity?.some((item) => item.relation_type === 'contains')).toBe(true);
    expect(savedEntities.PersonaEntity?.[0]?.metadata?.organizationMethod).toBe('llm_wiki_v1');
  });

  it('falls back to inferred section when legacy memory drafts omit section', async () => {
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
      memoryDrafts: [{
        ...baseInput.memoryDrafts[0]!,
        name: '认证账号画像',
        content: '账号为认证媒体账号',
        section: undefined,
        stability: undefined,
      }],
    });

    expect(savedEntities.MemoryEntity?.some((item) => item.name === '身份画像')).toBe(true);
  });
});
