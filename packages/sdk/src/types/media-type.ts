/**
 * 媒体类型分布相关类型
 */
export type MediaType = 'text' | 'image' | 'video' | 'link' | 'mixed'

export interface MediaTypeItem {
  type: MediaType
  count: number
  percentage: number
  avgEngagement: number
}

export interface MediaTypeTrend {
  timestamp: string
  types: {
    text: number
    image: number
    video: number
    link: number
    mixed: number
  }
}

export interface MediaEngagement {
  type: MediaType
  avgLikes: number
  avgComments: number
  avgReposts: number
}

export interface MediaTypeAnalysis {
  distribution: MediaTypeItem[]
  totalPosts: number
  trend: MediaTypeTrend[]
  engagementByType: MediaEngagement[]
}
