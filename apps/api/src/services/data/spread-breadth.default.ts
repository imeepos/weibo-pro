import type { SpreadBreadthAnalysis } from '@sker/sdk';

/**
 * 返回默认的空传播广度数据结构
 */
export function getDefaultBreadthAnalysis(): SpreadBreadthAnalysis {
  return {
    totalReposts: 0,
    uniqueReposters: 0,
    spreadDepth: 0,
    spreadWidth: 0,
    breadthIndex: 0,
    propagationPaths: [],
    spreadTimeline: [],
    repostByUserType: [
      { type: 'vip', count: 0, percentage: 0 },
      { type: 'ordinary', count: 0, percentage: 0 },
      { type: 'verified', count: 0, percentage: 0 },
    ],
  };
}
