import { Injectable } from '@sker/core'
import type { ICrawler, SearchOptions } from './crawler.interface'
import type { ILogin } from './login.interface'
import type { IStore } from './store.interface'
import type { ContentItem, CommentItem, CreatorItem } from './types'

@Injectable()
export abstract class AbstractCrawler implements ICrawler {
  abstract readonly platform: string
  abstract readonly login: ILogin
  abstract readonly store: IStore

  async start(): Promise<void> {
    await this.login.begin()
    await this.onStart()
  }

  abstract search(options: SearchOptions): Promise<ContentItem[]>
  abstract getDetail(contentId: string): Promise<ContentItem>
  abstract getComments(contentId: string, maxCount?: number): Promise<CommentItem[]>
  abstract getCreator(creatorId: string): Promise<CreatorItem>

  async close(): Promise<void> {
    await this.onClose()
  }

  protected async onStart(): Promise<void> {}
  protected async onClose(): Promise<void> {}
}
