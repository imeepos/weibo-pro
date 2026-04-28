import { describe, expect, it } from 'vitest';
import { buildMemoryGraphLayout } from './memory-graph-layout';

describe('buildMemoryGraphLayout', () => {
  it('does not create persona-to-leaf edges when graph contains section hubs', () => {
    const layout = buildMemoryGraphLayout({
      persona: { id: 'p1', name: '用户A', avatar: null, description: '画像', traits: ['热点追逐'] },
      memories: [
        {
          id: 'hub-1',
          name: '行为模式',
          description: 'behavior section hub',
          content: 'behavior section hub',
          type: 'concept',
          createdAt: '2026-04-23T00:00:00.000Z',
          section: 'behavior',
          isSectionHub: true,
          stability: 'stable',
        },
        {
          id: 'leaf-1',
          name: '夜间活跃',
          description: null,
          content: '夜间活跃',
          type: 'fact',
          createdAt: '2026-04-23T00:00:00.000Z',
          section: 'behavior',
          isSectionHub: false,
          stability: 'stable',
        },
      ],
      relations: [{ id: 'r1', sourceId: 'hub-1', targetId: 'leaf-1', relationType: 'contains' }],
    });

    expect(layout.edges.some((edge) => edge.id === 'persona-leaf-1')).toBe(false);
    expect(layout.edges.some((edge) => edge.id === 'persona-hub-1')).toBe(true);
  });

  it('keeps legacy persona-to-memory edges when there are no hubs', () => {
    const layout = buildMemoryGraphLayout({
      persona: { id: 'p1', name: '用户A', avatar: null, description: '画像', traits: ['热点追逐'] },
      memories: [
        {
          id: 'leaf-1',
          name: '热点追逐型',
          description: null,
          content: '长期追逐热点',
          type: 'insight',
          createdAt: '2026-04-23T00:00:00.000Z',
        },
      ],
      relations: [],
    });

    expect(layout.edges.some((edge) => edge.id === 'persona-leaf-1')).toBe(true);
  });
});
