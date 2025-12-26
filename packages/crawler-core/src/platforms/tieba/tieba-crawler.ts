import { Injectable } from '@sker/core'
import { AbstractCrawler } from '../../abstract-crawler'
import { TiebaClient, SearchSortType } from './tieba-client'
import { TiebaLogin } from './tieba-login'
import type { IStore } from '../../store.interface'
import type { SearchOptions } from '../../crawler.interface'
import type { ContentItem, CommentItem, CreatorItem } from '../../types'

@Injectable()
export class TiebaCrawler extends AbstractCrawler {
  readonly platform = 'tieba'
  readonly login: TiebaLogin
  readonly store: IStore

  private client: TiebaClient

  constructor(login: TiebaLogin, store: IStore, client: TiebaClient) {
    super()
    this.login = login
    this.store = store
    this.client = client
  }

  async search(options: SearchOptions): Promise<ContentItem[]> {
    const { keyword, maxCount = 20, sortBy = 'time' } = options
    const searchType = sortBy === 'hot' ? SearchSortType.RELEVANCE : SearchSortType.TIME_DESC

    const results: ContentItem[] = []
    let page = 1

    while (results.length < maxCount) {
      const notes = await this.client.searchByKeyword(keyword, page, 10, searchType)
      if (notes.length === 0) break

      for (const note of notes) {
        results.push({
          id: note.id,
          platform: this.platform,
          authorId: note.authorId,
          authorName: note.authorName,
          title: note.title,
          content: note.content,
          publishTime: new Date(note.publishTime),
          url: note.url,
          likeCount: 0,
          commentCount: note.replyCount,
          shareCount: 0,
          metadata: { note },
        })

        if (results.length >= maxCount) break
      }

      page++
    }

    return results.slice(0, maxCount)
  }

  async getDetail(contentId: string): Promise<ContentItem> {
    const note = await this.client.getNoteDetail(contentId)
    if (!note) {
      throw new Error(`Content not found: ${contentId}`)
    }

    return {
      id: note.id,
      platform: this.platform,
      authorId: note.authorId,
      authorName: note.authorName,
      title: note.title,
      content: note.content,
      publishTime: new Date(note.publishTime),
      url: note.url,
      likeCount: 0,
      commentCount: note.replyCount,
      shareCount: 0,
      metadata: { note },
    }
  }

  async getComments(contentId: string, maxCount = 100): Promise<CommentItem[]> {
    const results: CommentItem[] = []
    let page = 1

    while (results.length < maxCount) {
      const comments = await this.client.getComments(contentId, page)
      if (comments.length === 0) break

      for (const comment of comments) {
        results.push({
          id: comment.id,
          contentId,
          authorId: comment.authorId,
          authorName: comment.authorName,
          content: comment.content,
          publishTime: new Date(comment.publishTime),
          likeCount: comment.likeCount,
          metadata: { comment },
        })

        if (results.length >= maxCount) break
      }

      page++
    }

    return results.slice(0, maxCount)
  }

  async getCreator(creatorId: string): Promise<CreatorItem> {
    return {
      id: creatorId,
      platform: this.platform,
      name: creatorId,
      followersCount: 0,
      verified: false,
      url: `https://tieba.baidu.com/home/main?un=${encodeURIComponent(creatorId)}`,
    }
  }
}
