export interface ContentItem {
  id: string
  platform: string
  authorId: string
  authorName: string
  title?: string
  content: string
  publishTime: Date
  url: string
  likeCount: number
  commentCount: number
  shareCount: number
  viewCount?: number
  images?: string[]
  videos?: string[]
  tags?: string[]
  metadata?: Record<string, any>
}

export interface CommentItem {
  id: string
  contentId: string
  authorId: string
  authorName: string
  content: string
  publishTime: Date
  likeCount: number
  replyCount?: number
  parentId?: string
  metadata?: Record<string, any>
}

export interface CreatorItem {
  id: string
  platform: string
  name: string
  avatar?: string
  description?: string
  followersCount: number
  followingCount?: number
  postsCount?: number
  verified: boolean
  url: string
  metadata?: Record<string, any>
}
