import type { ContentItem, CommentItem, CreatorItem } from './types'
import type { ILogin } from './login.interface'
import type { IStore } from './store.interface'

export interface SearchOptions {
  keyword: string
  maxCount?: number
  startTime?: Date
  endTime?: Date
  sortBy?: 'time' | 'hot'
}

export interface ICrawler {
  readonly platform: string
  readonly login: ILogin
  readonly store: IStore

  start(): Promise<void>
  search(options: SearchOptions): Promise<ContentItem[]>
  getDetail(contentId: string): Promise<ContentItem>
  getComments(contentId: string, maxCount?: number): Promise<CommentItem[]>
  getCreator(creatorId: string): Promise<CreatorItem>
  close(): Promise<void>
}
