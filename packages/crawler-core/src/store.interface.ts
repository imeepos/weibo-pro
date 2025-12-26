import type { ContentItem, CommentItem, CreatorItem } from './types'

export interface IStore {
  storeContent(item: ContentItem): Promise<void>
  storeComment(item: CommentItem): Promise<void>
  storeCreator(item: CreatorItem): Promise<void>
}
