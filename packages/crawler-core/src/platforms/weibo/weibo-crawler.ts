import { Injectable } from '@sker/core'
import { AbstractCrawler } from '../../abstract-crawler'
import { WeiboClient, SearchType } from './weibo-client'
import { WeiboLogin } from './weibo-login'
import type { IStore } from '../../store.interface'
import type { SearchOptions } from '../../crawler.interface'
import type { ContentItem, CommentItem, CreatorItem } from '../../types'

@Injectable()
export class WeiboCrawler extends AbstractCrawler {
  readonly platform = 'weibo'
  readonly login: WeiboLogin
  readonly store: IStore

  private client: WeiboClient

  constructor(login: WeiboLogin, store: IStore, client: WeiboClient) {
    super()
    this.login = login
    this.store = store
    this.client = client
  }

  async search(options: SearchOptions): Promise<ContentItem[]> {
    const { keyword, maxCount = 20, sortBy = 'time' } = options
    const searchType = sortBy === 'hot' ? SearchType.HOT : SearchType.REALTIME

    const results: ContentItem[] = []
    let page = 1

    while (results.length < maxCount) {
      const data = await this.client.searchByKeyword(keyword, page, searchType) as any
      const cards = data.cards || []

      for (const card of cards) {
        if (card.card_type !== 9) continue
        const mblog = card.mblog
        if (!mblog) continue

        const item = this.parseContentItem(mblog)
        results.push(item)

        if (results.length >= maxCount) break
      }

      if (cards.length === 0) break
      page++
    }

    return results.slice(0, maxCount)
  }

  async getDetail(contentId: string): Promise<ContentItem> {
    const data = await this.client.getNoteDetail(contentId) as any
    if (!data?.mblog) {
      throw new Error(`Content not found: ${contentId}`)
    }
    return this.parseContentItem(data.mblog)
  }

  async getComments(contentId: string, maxCount = 100): Promise<CommentItem[]> {
    const results: CommentItem[] = []
    let maxId = 0
    let maxIdType = 0

    while (results.length < maxCount) {
      const data = await this.client.getComments(contentId, maxId, maxIdType) as any
      const comments = data.data || []

      for (const comment of comments) {
        results.push(this.parseCommentItem(comment, contentId))
        if (results.length >= maxCount) break
      }

      maxId = data.max_id || 0
      maxIdType = data.max_id_type || 0

      if (maxId === 0 || comments.length === 0) break
    }

    return results.slice(0, maxCount)
  }

  async getCreator(creatorId: string): Promise<CreatorItem> {
    const data = await this.client.getCreatorInfo(creatorId) as any
    const userInfo = data.userInfo

    return {
      id: creatorId,
      platform: this.platform,
      name: userInfo.screen_name,
      avatar: userInfo.avatar_hd || userInfo.profile_image_url,
      description: userInfo.description,
      followersCount: userInfo.followers_count || 0,
      followingCount: userInfo.follow_count || 0,
      postsCount: userInfo.statuses_count || 0,
      verified: userInfo.verified || false,
      url: `https://m.weibo.cn/u/${creatorId}`,
      metadata: { userInfo },
    }
  }

  private parseContentItem(mblog: any): ContentItem {
    return {
      id: mblog.id,
      platform: this.platform,
      authorId: mblog.user.id,
      authorName: mblog.user.screen_name,
      content: mblog.text_raw || mblog.text,
      publishTime: new Date(mblog.created_at),
      url: `https://m.weibo.cn/detail/${mblog.id}`,
      likeCount: mblog.attitudes_count || 0,
      commentCount: mblog.comments_count || 0,
      shareCount: mblog.reposts_count || 0,
      images: mblog.pics?.map((p: any) => p.large?.url || p.url) || [],
      metadata: { mblog },
    }
  }

  private parseCommentItem(comment: any, contentId: string): CommentItem {
    return {
      id: comment.id,
      contentId,
      authorId: comment.user.id,
      authorName: comment.user.screen_name,
      content: comment.text_raw || comment.text,
      publishTime: new Date(comment.created_at),
      likeCount: comment.like_count || 0,
      replyCount: comment.total_number || 0,
      metadata: { comment },
    }
  }
}
