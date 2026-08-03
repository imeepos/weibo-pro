/**
 * 用户关系网络可视化相关类型
 */
import type { TimeRange } from './base'

export type UserRelationType = 'like' | 'comment' | 'repost' | 'comprehensive'

export interface UserRelationNode {
  id: string
  name: string
  avatar?: string
  followers: number
  influence: number
  postCount: number
  verified: boolean
  userType: 'official' | 'media' | 'kol' | 'normal'
  location?: string
}

export interface UserRelationEdge {
  source: string
  target: string
  weight: number
  type: UserRelationType
  interactions: {
    likes?: number
    comments?: number
    reposts?: number
  }
}

export interface UserRelationNetwork {
  nodes: UserRelationNode[]
  edges: UserRelationEdge[]
  statistics: {
    totalUsers: number
    totalRelations: number
    avgDegree: number
    density: number
    communities?: number
  }
}

export interface UserRelationQueryParams {
  type?: UserRelationType
  timeRange?: TimeRange
  minWeight?: number
  limit?: number
}
