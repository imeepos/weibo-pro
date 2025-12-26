import { Injectable } from '@sker/core'
import { AbstractCrawler } from '../../abstract-crawler'
import type { ILogin } from '../../login.interface'
import type { IStore } from '../../store.interface'
import type { SearchOptions } from '../../crawler.interface'
import type { ContentItem, CommentItem, CreatorItem } from '../../types'
import { ZhihuClient } from './zhihu-client'
import { ZhihuLogin } from './zhihu-login'

interface SearchResponse {
  data?: Array<{
    type: string
    object?: {
      id: string
      type: string
      title?: string
      content?: string
      excerpt?: string
      author?: {
        id: string
        name: string
        url_token: string
      }
      question?: {
        id: string
      }
      created_time?: number
      updated_time?: number
      voteup_count?: number
      comment_count?: number
    }
  }>
}

interface CommentResponse {
  data?: Array<{
    id: string
    content: string
    author: {
      member: {
        id: string
        name: string
      }
    }
    created_time: number
    like_count: number
    child_comment_count: number
    reply_comment_id?: string
  }>
  paging?: {
    is_end: boolean
    next?: string
  }
}

interface CreatorResponse {
  id: string
  name: string
  url_token: string
  avatar_url: string
  headline: string
  follower_count: number
  following_count: number
  answer_count: number
  articles_count: number
  voteup_count: number
}

@Injectable()
export class ZhihuCrawler extends AbstractCrawler {
  readonly platform = 'zhihu'
  readonly login: ILogin
  readonly store: IStore

  constructor(
    private readonly client: ZhihuClient,
    login: ZhihuLogin,
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
    const limit = 20

    while (results.length < maxCount) {
      const response = (await this.client.searchQuestions(keyword, offset, limit)) as SearchResponse
      const items = response?.data || []

      if (items.length === 0) break

      for (const item of items) {
        if (results.length >= maxCount) break
        if (item.type !== 'search_result' || !item.object) continue

        const obj = item.object
        if (obj.type !== 'answer') continue

        const contentItem: ContentItem = {
          id: obj.id,
          platform: this.platform,
          authorId: obj.author?.id || '',
          authorName: obj.author?.name || '',
          title: obj.title,
          content: obj.excerpt || obj.content || '',
          publishTime: new Date((obj.created_time || 0) * 1000),
          url: `https://www.zhihu.com/question/${obj.question?.id}/answer/${obj.id}`,
          likeCount: obj.voteup_count || 0,
          commentCount: obj.comment_count || 0,
          shareCount: 0,
          metadata: { obj },
        }

        results.push(contentItem)
        await this.store.storeContent(contentItem)
      }

      offset += limit
    }

    return results
  }

  async getDetail(contentId: string): Promise<ContentItem> {
    const [questionId, answerId] = contentId.split('/')
    if (!questionId || !answerId) {
      throw new Error(`Invalid contentId: ${contentId}`)
    }
    const detail = (await this.client.getAnswerDetail(questionId, answerId)) as any

    const contentItem: ContentItem = {
      id: detail.id,
      platform: this.platform,
      authorId: detail.author?.id || '',
      authorName: detail.author?.name || '',
      title: detail.question?.title,
      content: detail.content || detail.excerpt || '',
      publishTime: new Date((detail.created_time || 0) * 1000),
      url: `https://www.zhihu.com/question/${questionId}/answer/${answerId}`,
      likeCount: detail.voteup_count || 0,
      commentCount: detail.comment_count || 0,
      shareCount: 0,
      metadata: { detail },
    }

    await this.store.storeContent(contentItem)
    return contentItem
  }

  async getComments(contentId: string, maxCount = 100): Promise<CommentItem[]> {
    const results: CommentItem[] = []
    const [contentType, id] = contentId.split(':')
    if (!contentType || !id) {
      throw new Error(`Invalid contentId: ${contentId}`)
    }
    let offset = ''

    while (results.length < maxCount) {
      const response = (await this.client.getRootComments(id, contentType, offset, 10)) as CommentResponse
      const comments = response?.data || []

      if (comments.length === 0) break

      for (const comment of comments) {
        if (results.length >= maxCount) break

        const commentItem: CommentItem = {
          id: String(comment.id),
          contentId,
          authorId: comment.author.member.id,
          authorName: comment.author.member.name,
          content: comment.content,
          publishTime: new Date(comment.created_time * 1000),
          likeCount: comment.like_count,
          replyCount: comment.child_comment_count,
          parentId: comment.reply_comment_id ? String(comment.reply_comment_id) : undefined,
          metadata: { comment },
        }

        results.push(commentItem)
        await this.store.storeComment(commentItem)
      }

      if (response.paging?.is_end) break
      offset = this.extractOffset(response.paging?.next || '')
    }

    return results
  }

  async getCreator(creatorId: string): Promise<CreatorItem> {
    const info = (await this.client.getCreatorInfo(creatorId)) as CreatorResponse

    const creatorItem: CreatorItem = {
      id: info.id,
      platform: this.platform,
      name: info.name,
      avatar: info.avatar_url,
      description: info.headline,
      followersCount: info.follower_count,
      followingCount: info.following_count,
      postsCount: info.answer_count + info.articles_count,
      verified: false,
      url: `https://www.zhihu.com/people/${info.url_token}`,
      metadata: { info },
    }

    await this.store.storeCreator(creatorItem)
    return creatorItem
  }

  private extractOffset(nextUrl: string): string {
    if (!nextUrl) return ''
    const url = new URL(nextUrl)
    return url.searchParams.get('offset') || ''
  }
}
