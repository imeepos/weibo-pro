import { describe, expect, it, vi } from 'vitest';
import { buildNetworkFromEdges } from './user-relation.mapper';

describe('buildNetworkFromEdges', () => {
  it('filters invalid relation data before building market-facing network output', async () => {
    const manager = {
      query: vi.fn(async (sql: string) => {
        if (sql.startsWith('SET')) return [];
        return [
          {
            id: '1001',
            screen_name: '央视新闻',
            followers_count: '120000000',
            statuses_count: '80000',
            verified: true,
            user_type: 'official',
            location: '北京',
          },
          {
            id: '1002',
            screen_name: '财经观察员',
            followers_count: '2400000',
            statuses_count: '12000',
            verified: true,
            user_type: 'kol',
            location: '上海',
          },
        ];
      }),
    };

    const network = await buildNetworkFromEdges(
      [
        { source_user_id: '1001', target_user_id: '1002', weight: '12' },
        { source_user_id: '1001', target_user_id: '1001', weight: '99' },
        { source_user_id: '1001', target_user_id: '9999', weight: '10' },
        { source_user_id: null, target_user_id: '1002', weight: '8' },
        { source_user_id: '1002', target_user_id: '1001', weight: '0' },
      ],
      'comprehensive',
      manager
    );

    expect(network.nodes).toHaveLength(2);
    expect(network.nodes.map((node) => node.name)).toEqual(['央视新闻', '财经观察员']);
    expect(network.edges).toEqual([
      {
        source: '1001',
        target: '1002',
        weight: 12,
        type: 'comprehensive',
        interactions: {},
      },
    ]);
    expect(network.statistics).toMatchObject({
      totalUsers: 2,
      totalRelations: 1,
      avgDegree: 1,
      density: 1,
    });
  });
});
