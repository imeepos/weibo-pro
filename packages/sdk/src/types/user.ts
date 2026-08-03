/**
 * 用户相关类型
 */
import type { RiskLevel, TimeRange } from './base'

export interface UserListItem {
  id: string
  username: string
  nickname: string
  followers: number
  following: number
  posts: number
  verified: boolean
  location: string
  riskLevel: RiskLevel
  activities: {
    posts: number
    comments: number
  }
  sentiment: {
    positive: number
    negative: number
    neutral: number
  }
  tags: string[]
  lastActive: string
  avatar?: string
}

export interface RiskLevelConfig {
  level: RiskLevel
  name: string
  description: string
  color: string
  minScore: number
  maxScore: number
  actionRequired: boolean
  autoActions: string[]
  count?: number
}

export interface UserStatistics {
  total: number
  filteredCount: number
  coverageRate: number
  active: number
  suspended: number
  banned: number
  monitoring: number
  riskDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
  newUsers: {
    today: number
    week: number
    month: number
  }
  activeUsers: {
    today: number
    week: number
    month: number
  }
  averageRiskScore: number
  trends: {
    totalGrowthRate: number
    riskScoreChange: number
    newUsersGrowthRate: number
  }
  trendData: {
    total: number[]
    highRisk: number[]
    mediumRisk: number[]
    lowRisk: number[]
  }
  changes: {
    total: number
    highRisk: number
    mediumRisk: number
    lowRisk: number
  }
}

export interface UserListQueryParams {
  timeRange?: TimeRange
  page?: number
  pageSize?: number
}

export interface UserListResponse {
  users: UserListItem[]
  total: number
  filteredCount: number
  coverageRate: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}
