export interface EventUserAbnormalSignal {
  type:
    | 'night_activity'
    | 'regular_interval'
    | 'burst_posting'
    | 'high_similarity'
    | 'extreme_sentiment'
    | 'low_interaction'
    | 'single_device'
  severity: 'low' | 'medium' | 'high'
  description: string
  value: number | string | Record<string, unknown>
}

export interface EventAbnormalUser {
  userId: string
  screenName: string
  followers: number
  verified: boolean
  location: string
  postCount: number
  riskLevel: 'low' | 'medium' | 'high'
  riskScore: number
  confidence: number
  isAbnormal: boolean
  accountType: 'bot' | 'troll' | 'zombie' | 'suspicious' | 'normal'
  lastActive: string
  summary: string
  abnormalSignals: EventUserAbnormalSignal[]
}

export interface EventUserRiskProfile {
  totalUsers: number
  activeUsers: number
  abnormalUserCount: number
  averageRiskScore: number
  riskDistribution: {
    low: number
    medium: number
    high: number
  }
  topSignals: Array<{
    type: EventUserAbnormalSignal['type']
    label: string
    count: number
  }>
  topRiskUsers: Array<{
    userId: string
    screenName: string
    riskLevel: 'low' | 'medium' | 'high'
    riskScore: number
  }>
}
