/**
 * 社区发现与演化追踪相关类型
 */

// 社区发现相关类型
export interface CommunityMember {
  userId: string
  screenName: string
  role: 'leader' | 'active' | 'peripheral'
  inDegree: number
  outDegree: number
}

export interface Community {
  id: string
  name: string
  members: CommunityMember[]
  size: number
  density: number
  avgInfluence: number
  topKeywords: string[]
  sentiment: { positive: number; negative: number; neutral: number }
}

export interface CommunityLink {
  sourceCommunity: string
  targetCommunity: string
  weight: number
}

export interface BridgeUser {
  userId: string
  screenName: string
  communities: string[]
  bridgeScore: number
}

export interface CommunityAnalysis {
  communities: Community[]
  modularity: number
  totalCommunities: number
  interCommunityLinks: CommunityLink[]
  bridgeUsers: BridgeUser[]
}

// 社区演化追踪相关类型
export interface CommunityTimeSlice {
  timestamp: string
  communities: Community[]
  modularity: number
  totalMembers: number
}

export interface EvolutionEvent {
  type: 'birth' | 'death' | 'split' | 'merge' | 'growth' | 'shrink'
  timestamp: string
  involvedCommunities: string[]
  magnitude: number
  description: string
}

export interface KeyChange {
  communityId: string
  changeType: string
  beforeSize: number
  afterSize: number
  keyMembers: string[]
}

export interface TrendPrediction {
  predictedCommunityCount: number
  predictedModularity: number
  confidence: number
}

export interface CommunityEvolutionAnalysis {
  timeSlices: CommunityTimeSlice[]
  evolutionEvents: EvolutionEvent[]
  overallStability: number
  keyChanges: KeyChange[]
  trendPrediction: TrendPrediction
}
