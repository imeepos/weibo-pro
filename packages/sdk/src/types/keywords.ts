/**
 * 关键词相关类型
 */

export interface KeywordWordCloudItem {
  keyword: string
  weight: number
  sentiment?: 'positive' | 'negative' | 'neutral'
}
