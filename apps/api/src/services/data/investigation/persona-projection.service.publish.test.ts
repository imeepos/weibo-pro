import { describe, expect, it, vi } from 'vitest';
import { PersonaProjectionService } from './persona-projection.service';
import { useEntityManager } from '@sker/entities';
import { baseInput } from './persona-projection.service.test-fixtures';
import { setupPersonaProjectionPublishMocks } from './persona-projection.service.test-helpers';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn(),
  };
});

describe('PersonaProjectionService - publishProfile', () => {
  it('creates memory relations when relationDrafts point to sibling memory names', async () => {
    const { savedEntities } = setupPersonaProjectionPublishMocks();

    const service = new PersonaProjectionService();
    await service.publishProfile(baseInput);

    expect(savedEntities.MemoryRelationEntity?.some((item) => item.relation_type === 'related')).toBe(true);
    expect(savedEntities.MemoryClosureEntity?.length).toBeGreaterThanOrEqual(3);
  });

  it('creates a synthetic person memory when relationDraft targets a persona', async () => {
    const { savedEntities } = setupPersonaProjectionPublishMocks();

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
    const { savedEntities } = setupPersonaProjectionPublishMocks();

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
    const { savedEntities } = setupPersonaProjectionPublishMocks();

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
