import { describe, expect, it } from 'vitest';
import { buildMemoryGraphLayout } from './memory-graph-layout';

describe('buildMemoryGraphLayout', () => {
  it('renders a tree layout when graph.tree is present', () => {
    const layout = buildMemoryGraphLayout({
      persona: { id: 'p1', name: '画像A', avatar: null, description: null, traits: [] },
      memories: [],
      relations: [],
      tree: [
        {
          id: 'section-1',
          kind: 'section',
          label: '行为模式',
          description: null,
          count: 2,
          badge: null,
          timeRange: null,
          childrenCount: 1,
          children: [
            {
              id: 'event-1',
              kind: 'event_cluster',
              label: '事件A',
              description: '2 条帖子',
              count: 2,
              badge: '疑似协同',
              timeRange: {
                startAt: '2026-04-28T01:00:00.000Z',
                endAt: '2026-04-28T01:05:00.000Z',
              },
              childrenCount: 0,
              children: [],
            },
          ],
        },
      ],
      timeline: [],
      coordinationSignals: [],
      stats: {
        totalMemories: 0,
        totalEvents: 1,
        totalEvidencePosts: 2,
        totalWarnings: 0,
      },
    });

    expect(layout.nodes.some((node) => node.id === 'section-1')).toBe(true);
    expect(layout.nodes.some((node) => node.id === 'event-1')).toBe(true);
    expect(
      layout.edges.some((edge) => edge.source === 'section-1' && edge.target === 'event-1'),
    ).toBe(true);
  });
});
