import type { UserTypeDistribution } from '@sker/sdk';

/**
 * 用户类型名称映射
 */
export const userTypeNameMap: Record<string, string> = {
  vip: 'VIP用户',
  ordinary: '普通用户',
  verified: '认证用户',
};

/**
 * 获取用户类型
 */
export function getUserType(repost: any): 'vip' | 'ordinary' | 'verified' {
  if (repost.verified) {
    return 'verified';
  } else if (repost.userClass === 1 || repost.userClass === 2) {
    return 'vip';
  }
  return 'ordinary';
}

/**
 * 计算用户类型分布
 */
export function calculateUserTypeDistribution(reposts: Array<any>): UserTypeDistribution[] {
  const typeCounts = {
    vip: 0,
    ordinary: 0,
    verified: 0,
  };

  for (const repost of reposts) {
    const userClass = repost.userClass;
    const verified = repost.verified;

    if (verified) {
      typeCounts.verified++;
    } else if (userClass === 1 || userClass === 2) {
      typeCounts.vip++;
    } else {
      typeCounts.ordinary++;
    }
  }

  const total = reposts.length;
  if (total === 0) {
    return [
      { type: 'vip', count: 0, percentage: 0 },
      { type: 'ordinary', count: 0, percentage: 0 },
      { type: 'verified', count: 0, percentage: 0 },
    ];
  }

  return [
    {
      type: 'vip',
      count: typeCounts.vip,
      percentage: (typeCounts.vip / total) * 100,
    },
    {
      type: 'ordinary',
      count: typeCounts.ordinary,
      percentage: (typeCounts.ordinary / total) * 100,
    },
    {
      type: 'verified',
      count: typeCounts.verified,
      percentage: (typeCounts.verified / total) * 100,
    },
  ];
}
