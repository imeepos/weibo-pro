import { describe, expect, it } from 'vitest';
import type { UserRelationNetwork } from '@sker/sdk';
import { DEFAULT_PERFORMANCE_CONFIG } from '@sker/ui/lib/graph-performance-optimizer';
import { DEFAULT_WEIGHTS } from './NodeSizeCalculator';
import { buildGraphData } from './UserRelationGraph3D.data';

describe('buildGraphData', () => {
  it('removes invalid nodes and edges before sending data to the 3D renderer', () => {
    const network: UserRelationNetwork = {
      nodes: [
        {
          id: '1001',
          name: '央视新闻',
          followers: 120000000,
          influence: 100,
          postCount: 80000,
          verified: true,
          userType: 'official',
        },
        {
          id: '1002',
          name: '财经观察员',
          followers: 2400000,
          influence: 80,
          postCount: 12000,
          verified: true,
          userType: 'kol',
        },
        {
          id: '9999',
          name: '用户_9999',
          followers: 0,
          influence: 0,
          postCount: 0,
          verified: false,
          userType: 'normal',
        },
      ],
      edges: [
        { source: '1001', target: '1002', weight: 12, type: 'comprehensive', interactions: {} },
        { source: '1001', target: '1001', weight: 99, type: 'comprehensive', interactions: {} },
        { source: '1001', target: '404', weight: 10, type: 'comprehensive', interactions: {} },
        { source: '1002', target: '1001', weight: 0, type: 'comprehensive', interactions: {} },
      ],
      statistics: {
        totalUsers: 3,
        totalRelations: 4,
        avgDegree: 2.67,
        density: 1,
      },
    };

    const graphData = buildGraphData(network, DEFAULT_WEIGHTS, DEFAULT_PERFORMANCE_CONFIG, false);

    expect(graphData.nodes.map((node) => node.id).sort()).toEqual(['1001', '1002']);
    expect(graphData.links).toEqual([
      {
        source: '1001',
        target: '1002',
        value: 12,
        type: 'comprehensive',
      },
    ]);
    expect(graphData.backgroundNodes).toEqual([]);
  });
});
