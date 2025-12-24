import { Injectable } from '@sker/core'
import { AbstractCrawler } from '../../abstract-crawler'
import type { ILogin } from '../../login.interface'
import type { IStore } from '../../store.interface'
import type { SearchOptions } from '../../crawler.interface'
import type { ContentItem, CommentItem, CreatorItem } from '../../types'
import { DouyinClient } from './douyin-client'
import { DouyinLogin } from './douyin-login'

interface SearchResponse {
  data?: Array<{ aweme_info?: any }>
}

interface VideoDetailResponse {
  aweme_detail?: any
}

interface CommentsResponse {
  comments?: any[]
  has_more?: boolean
  cursor?: number
}

interface CreatorResponse {
  user?: any
}

@Injectable()
export class DouyinCrawler extends AbstractCrawler {
  readonly platform = 'douyin'
  readonly login: ILogin
  readonly store: IStore

  constructor(
    private readonly client: DouyinClient,
    login: DouyinLogin,
    store: IStore,
  ) {
    super()
    this.login = login
    this.store = store
  }

  async search(options: SearchOptions): Promise<ContentItem[]> {
    const { keyword, maxCount = 20 } = options
    const results: ContentItem[] = []
    let offset = 0

    while (results.length < maxCount) {
      const response = await this.client.searchVideos(keyword, offset, 15) as SearchResponse
      const items = response?.data || []

      if (items.length === 0) break

      for (const item of items) {
        if (results.length >= maxCount) break

        const awemeInfo = item.aweme_info
        if (!awemeInfo) continue

        const contentItem = this.transformToContentItem(awemeInfo)
        results.push(contentItem)
        await this.store.storeContent(contentItem)
      }

      offset += items.length
    }

    return results
  }

  async getDetail(contentId: string): Promise<ContentItem> {
    const detail = await this.client.getVideoDetail(contentId) as VideoDetailResponse
    const contentItem = this.transformToContentItem(detail.aweme_detail || detail)
    await this.store.storeContent(contentItem)
    return contentItem
  }

  async getComments(contentId: string, maxCount = 100): Promise<CommentItem[]> {
    const results: CommentItem[] = []
    let cursor = 0

    while (results.length < maxCount) {
      const response = await this.client.getComments(contentId, cursor, 20) as CommentsResponse
      const comments = response?.comments || []

      if (comments.length === 0) break

      for (const comment of comments) {
        if (results.length >= maxCount) break

        const commentItem = this.transformToCommentItem(comment, contentId)
        results.push(commentItem)
        await this.store.storeComment(commentItem)
      }

      if (!response.has_more) break
      cursor = response.cursor || 0
    }

    return results
  }

  async getCreator(creatorId: string): Promise<CreatorItem> {
    const response = await this.client.getCreatorInfo(creatorId) as CreatorResponse
    const userInfo = response?.user || {}

    const creatorItem: CreatorItem = {
      id: userInfo.sec_uid || creatorId,
      platform: this.platform,
      name: userInfo.nickname || '',
      avatar: userInfo.avatar_thumb?.url_list?.[0],
      description: userInfo.signature,
      followersCount: userInfo.follower_count || 0,
      followingCount: userInfo.following_count || 0,
      postsCount: userInfo.aweme_count || 0,
      verified: userInfo.verification_type > 0,
      url: `https://www.douyin.com/user/${userInfo.sec_uid}`,
      metadata: { userInfo },
    }

    await this.store.storeCreator(creatorItem)
    return creatorItem
  }

  private transformToContentItem(aweme: any): ContentItem {
    return {
      id: aweme.aweme_id,
      platform: this.platform,
      authorId: aweme.author?.sec_uid || '',
      authorName: aweme.author?.nickname || '',
      title: aweme.desc?.substring(0, 50),
      content: aweme.desc || '',
      publishTime: new Date(aweme.create_time * 1000),
      url: `https://www.douyin.com/video/${aweme.aweme_id}`,
      likeCount: aweme.statistics?.digg_count || 0,
      commentCount: aweme.statistics?.comment_count || 0,
      shareCount: aweme.statistics?.share_count || 0,
      viewCount: aweme.statistics?.play_count || 0,
      videos: aweme.video?.play_addr?.url_list || [],
      images: aweme.images?.map((img: any) => img.url_list?.[0]).filter(Boolean) || [],
      tags: aweme.text_extra?.map((tag: any) => tag.hashtag_name).filter(Boolean) || [],
      metadata: { aweme },
    }
  }

  private transformToCommentItem(comment: any, contentId: string): CommentItem {
    return {
      id: comment.cid,
      contentId,
      authorId: comment.user?.sec_uid || '',
      authorName: comment.user?.nickname || '',
      content: comment.text || '',
      publishTime: new Date(comment.create_time * 1000),
      likeCount: comment.digg_count || 0,
      replyCount: comment.reply_comment_total || 0,
      parentId: comment.reply_id || undefined,
      metadata: { comment },
    }
  }
}
