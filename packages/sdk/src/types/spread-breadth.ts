/**
 * 传播广度分析相关类型
 */

// 传播广度分析相关类型 - 聚合节点类型
export interface AggregatedNode {
  id: string                    // 唯一标识
  name: string                  // 显示名称（如"认证用户(128人)"）
  type: 'source' | 'aggregated' | 'top_user'
  level: number                 // 传播层级
  userType?: 'vip' | 'ordinary' | 'verified'
  count: number                 // 包含的用户数
  totalWeight: number           // 总权重（转发量）
  topUsers?: TopUser[]          // 展开时显示的 Top 用户
}

export interface TopUser {
  userId: string
  screenName: string
  weight: number
  followers?: number
}

// 层级统计
export interface LevelStats {
  level: number
  totalUsers: number
  totalReposts: number
  byUserType: {
    vip: { count: number; reposts: number }
    ordinary: { count: number; reposts: number }
    verified: { count: number; reposts: number }
  }
}

// 聚合传播数据
export interface AggregatedPropagation {
  nodes: AggregatedNode[]
  links: PropagationPath[]
  levelStats: LevelStats[]
}

export interface PropagationPath {
  source: string
  target: string
  weight: number
  level: number
}

export interface SpreadTimelinePoint {
  timestamp: string
  count: number
  cumulative: number
}

export interface UserTypeDistribution {
  type: 'vip' | 'ordinary' | 'verified'
  count: number
  percentage: number
}

export interface SpreadBreadthAnalysis {
  totalReposts: number
  uniqueReposters: number
  spreadDepth: number
  spreadWidth: number
  breadthIndex: number
  propagationPaths: PropagationPath[]
  spreadTimeline: SpreadTimelinePoint[]
  repostByUserType: UserTypeDistribution[]
  aggregatedPropagation?: AggregatedPropagation
}
