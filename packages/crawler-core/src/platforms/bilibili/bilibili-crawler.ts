import { Injectable } from '@sker/core'
import { AbstractCrawler } from '../../abstract-crawler'
import type { ILogin } from '../../login.interface'
import type { IStore } from '../../store.interface'
import type { SearchOptions } from '../../crawler.interface'
import type { ContentItem, CommentItem, CreatorItem } from '../../types'
import { BilibiliClient } from './bilibili-client'
import { BilibiliLogin } from './bilibili-login'

interface SearchResponse {
  result?: Array<{
    bvid?: string
    aid?: number
    title?: string
    description?: string
    author?: string
    mid?: number
    play?: number
    video_review?: number
    favorites?: number
    pubdate?: number
    pic?: string
  }>
}

interface VideoDetailResponse {
  View?: {
    bvid: string
    aid: number
    title: string
    desc: string
    owner: { mid: number; name: string }
    stat: { view: number; like: number; coin: number; favorite: number; share: number; reply: number }
    pubdate: number
    pic: string
  }
}

interface CommentsResponse {
  replies?: Array<{
    rpid: number
    oid: number
    member: { mid: string; uname: string }
    content: { message: string }
    ctime: number
    like: number
    rcount: number
    parent?: number
  }>
  cursor?: { next: number; is_end: boolean }
}

interface CreatorResponse {
  mid: number
  name: string
  face: string
  sign: string
  follower: number
  following: number
}

@Injectable()
export class BilibiliCrawler extends AbstractCrawler {
  readonly platform = 'bilibili'
  readonly login: ILogin
  readonly store: IStore

  constructor(
    private readonly client: BilibiliClient,
    login: BilibiliLogin,
    store: IStore,
  ) {
    super()
    this.login = login
    this.store = store
  }

  async search(options: SearchOptions): Promise<ContentItem[]> {
    const { keyword, maxCount = 20 } = options
    const results: ContentItem[] = []
    let page = 1

    while (results.length < maxCount) {
      const response = (await this.client.searchVideos(keyword, page, 20)) as SearchResponse
      const items = response?.result || []

      if (items.length === 0) break

      for (const item of items) {
        if (results.length >= maxCount) break
        if (!item.bvid) continue

        const contentItem: ContentItem = {
          id: item.bvid,
          platform: this.platform,
          authorId: String(item.mid || ''),
          authorName: item.author || '',
          title: item.title,
          content: item.description || '',
          publishTime: new Date((item.pubdate || 0) * 1000),
          url: `https://www.bilibili.com/video/${item.bvid}`,
          likeCount: 0,
          commentCount: item.video_review || 0,
          shareCount: 0,
          viewCount: item.play || 0,
          images: item.pic ? [item.pic] : [],
          metadata: { item },
        }

        results.push(contentItem)
        await this.store.storeContent(contentItem)
      }

      page++
    }

    return results
  }

  async getDetail(contentId: string): Promise<ContentItem> {
    const detail = (await this.client.getVideoDetail(contentId)) as VideoDetailResponse
    const view = detail.View!

    const contentItem: ContentItem = {
      id: view.bvid,
      platform: this.platform,
      authorId: String(view.owner.mid),
      authorName: view.owner.name,
      title: view.title,
      content: view.desc,
      publishTime: new Date(view.pubdate * 1000),
      url: `https://www.bilibili.com/video/${view.bvid}`,
      likeCount: view.stat.like,
      commentCount: view.stat.reply,
      shareCount: view.stat.share,
      viewCount: view.stat.view,
      images: [view.pic],
      metadata: { view },
    }

    await this.store.storeContent(contentItem)
    return contentItem
  }

  async getComments(contentId: string, maxCount = 100): Promise<CommentItem[]> {
    const results: CommentItem[] = []
    let next = 0

    while (results.length < maxCount) {
      const response = (await this.client.getComments(contentId, next)) as CommentsResponse
      const comments = response?.replies || []

      if (comments.length === 0) break

      for (const comment of comments) {
        if (results.length >= maxCount) break

        const commentItem: CommentItem = {
          id: String(comment.rpid),
          contentId,
          authorId: comment.member.mid,
          authorName: comment.member.uname,
          content: comment.content.message,
          publishTime: new Date(comment.ctime * 1000),
          likeCount: comment.like,
          replyCount: comment.rcount,
          parentId: comment.parent ? String(comment.parent) : undefined,
          metadata: { comment },
        }

        results.push(commentItem)
        await this.store.storeComment(commentItem)
      }

      if (response.cursor?.is_end) break
      next = response.cursor?.next || 0
    }

    return results
  }

  async getCreator(creatorId: string): Promise<CreatorItem> {
    const info = (await this.client.getCreatorInfo(Number(creatorId))) as CreatorResponse

    const creatorItem: CreatorItem = {
      id: String(info.mid),
      platform: this.platform,
      name: info.name,
      avatar: info.face,
      description: info.sign,
      followersCount: info.follower,
      followingCount: info.following,
      verified: false,
      url: `https://space.bilibili.com/${info.mid}`,
      metadata: { info },
    }

    await this.store.storeCreator(creatorItem)
    return creatorItem
  }
}
