import type { EventKeywordTimeSeries } from './types.sentiment';

export interface EventTopicOverview {
  topTopics: Array<{
    title: string
    count: number
    sentiment: string
    trend: 'up' | 'down' | 'stable'
  }>
  timeSeries: EventKeywordTimeSeries[]
}

export interface EventOpinionRepresentativePost {
  postId: string
  author: string
  excerpt: string
  sentiment: 'positive' | 'negative' | 'neutral'
  engagement: number
}

export interface EventOpinionCluster {
  id: string
  label: string
  stance: 'supportive' | 'critical' | 'neutral'
  summary: string
  postCount: number
  userCount: number
  keywords: string[]
  representativePosts: EventOpinionRepresentativePost[]
}

export interface EventEmotionMapItem {
  label: string
  weight: number
}

export interface EventUserEmotionInsight {
  userId: string
  screenName: string
  postCount: number
  emotionTilt: 'positive' | 'negative' | 'neutral'
  summary: string
}
