// 用户数据服务的共享类型定义（由 users.service 聚合导出）

export type RiskLevel = 'low' | 'medium' | 'high';

export interface UserListItem {
  id: string;
  username: string;
  nickname: string;
  followers: number;
  following: number;
  posts: number;
  verified: boolean;
  location: string;
  riskLevel: RiskLevel;
  activities: {
    posts: number;
    comments: number;
  };
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  tags: string[];
  lastActive: string;
  avatar?: string;
}

export interface UserListResponse {
  users: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface RiskLevelConfig {
  level: RiskLevel;
  name: string;
  description: string;
  color: string;
  minScore: number;
  maxScore: number;
  actionRequired: boolean;
  autoActions: string[];
  count?: number;
}

export interface UserStatistics {
  total: number;
  active: number;
  suspended: number;
  banned: number;
  monitoring: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  newUsers: {
    today: number;
    week: number;
    month: number;
  };
  activeUsers: {
    today: number;
    week: number;
    month: number;
  };
  averageRiskScore: number;
  trends: {
    totalGrowthRate: number;
    riskScoreChange: number;
    newUsersGrowthRate: number;
  };
  trendData: {
    total: number[];
    highRisk: number[];
    mediumRisk: number[];
    lowRisk: number[];
  };
  changes: {
    total: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}
