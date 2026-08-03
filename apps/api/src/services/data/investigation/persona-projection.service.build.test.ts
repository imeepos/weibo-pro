import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersonaProjectionService } from './persona-projection.service';
import { useEntityManager } from '@sker/entities';
import { baseInput } from './persona-projection.service.test-fixtures';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn(),
  };
});

describe('PersonaProjectionService - buildProjection', () => {
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
});
