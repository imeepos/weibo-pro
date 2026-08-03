import { describe, expect, it } from 'vitest';
import type { UserRelationNetwork } from '@sker/sdk';
import { sanitizeUserRelationNetwork } from './UserRelationGraph3D.sanitize';

const node = (id: string, name: string) => ({
  id,
  name,
  followers: 100,
  influence: 10,
  postCount: 5,
  verified: false,
  userType: 'normal' as const,
});

describe('sanitizeUserRelationNetwork', () => {
  it('keeps the strongest visible relations when an edge display threshold is provided', () => {
    const network: UserRelationNetwork = {
      nodes: [node('1', '用户A'), node('2', '用户B'), node('3', '用户C'), node('4', '用户D')],
      edges: [
        { source: '1', target: '2', weight: 20, type: 'comprehensive', interactions: {} },
        { source: '2', target: '3', weight: 10, type: 'comprehensive', interactions: {} },
        { source: '3', target: '4', weight: 5, type: 'comprehensive', interactions: {} },
        { source: '1', target: '4', weight: 1, type: 'comprehensive', interactions: {} },
      ],
      statistics: {
        totalUsers: 4,
        totalRelations: 4,
        avgDegree: 2,
        density: 0.67,
      },
    };

    const sanitized = sanitizeUserRelationNetwork(network, 50);

    expect(sanitized.edges.map((edge) => `${edge.source}-${edge.target}:${edge.weight}`)).toEqual([
      '1-2:20',
      '2-3:10',
    ]);
    expect(sanitized.nodes.map((item) => item.id).sort()).toEqual(['1', '2', '3']);
    expect(sanitized.statistics).toMatchObject({
      totalUsers: 3,
      totalRelations: 2,
      avgDegree: 1.33,
      density: 0.6667,
    });
  });
});
