import type { SpreadBreadthAnalysis, AggregatedPropagation } from '@sker/sdk';

export const mockData: SpreadBreadthAnalysis = {
  totalReposts: 100,
  uniqueReposters: 80,
  spreadDepth: 5,
  spreadWidth: 4.5,
  breadthIndex: 0.75,
  propagationPaths: [
    { source: 'post1', target: 'user1', weight: 1, level: 1 },
    { source: 'user1', target: 'user2', weight: 1, level: 2 },
  ],
  spreadTimeline: [],
  repostByUserType: [],
};

export const mockAggregatedPropagation: AggregatedPropagation = {
  nodes: [
    {
      id: 'source-1',
      name: '原帖作者',
      type: 'source',
      level: 0,
      count: 1,
      totalWeight: 100,
    },
    {
      id: 'agg-vip-1',
      name: 'VIP用户(50人)',
      type: 'aggregated',
      level: 1,
      userType: 'vip',
      count: 50,
      totalWeight: 200,
      topUsers: [
        { userId: 'u1', screenName: '大V用户1', weight: 50, followers: 100000 },
        { userId: 'u2', screenName: '大V用户2', weight: 30, followers: 80000 },
      ],
    },
    {
      id: 'agg-ordinary-1',
      name: '普通用户(100人)',
      type: 'aggregated',
      level: 1,
      userType: 'ordinary',
      count: 100,
      totalWeight: 150,
    },
    {
      id: 'agg-verified-1',
      name: '认证用户(30人)',
      type: 'aggregated',
      level: 1,
      userType: 'verified',
      count: 30,
      totalWeight: 80,
    },
    {
      id: 'top-user-1',
      name: '超级大V',
      type: 'top_user',
      level: 1,
      count: 1,
      totalWeight: 500,
    },
  ],
  links: [
    { source: 'source-1', target: 'agg-vip-1', weight: 200, level: 1 },
    { source: 'source-1', target: 'agg-ordinary-1', weight: 150, level: 1 },
    { source: 'source-1', target: 'agg-verified-1', weight: 80, level: 1 },
    { source: 'source-1', target: 'top-user-1', weight: 500, level: 1 },
  ],
  levelStats: [
    {
      level: 0,
      totalUsers: 1,
      totalReposts: 0,
      byUserType: {
        vip: { count: 0, reposts: 0 },
        ordinary: { count: 1, reposts: 0 },
        verified: { count: 0, reposts: 0 },
      },
    },
    {
      level: 1,
      totalUsers: 181,
      totalReposts: 930,
      byUserType: {
        vip: { count: 50, reposts: 200 },
        ordinary: { count: 100, reposts: 150 },
        verified: { count: 30, reposts: 80 },
      },
    },
  ],
};

export const mockDataWithAggregation: SpreadBreadthAnalysis = {
  ...mockData,
  aggregatedPropagation: mockAggregatedPropagation,
};
