import { Injectable } from '@sker/core'
import { AbstractCrawler } from '../../abstract-crawler'
import { XhsClient } from './xhs-client'
import { XhsLogin } from './xhs-login'
import type { ILogin } from '../../login.interface'
import type { IStore } from '../../store.interface'
import type { SearchOptions } from '../../crawler.interface'
import type { ContentItem, CommentItem, CreatorItem } from '../../types'
import { JsonStore } from '../../store'

@Injectable()
export class XhsCrawler extends AbstractCrawler {
  readonly platform = 'xiaohongshu'
  readonly login: ILogin
  readonly store: IStore
  private client: XhsClient

  constructor() {
    super()
    this.client = new XhsClient()
    this.login = new XhsLogin()
    this.store = new JsonStore('./data/xhs')
  }

  protected async onStart(): Promise<void> {
    const page = (this.login as XhsLogin).getPage()
    if (page) {
      this.client.setPage(page)
    }

    const context = (this.login as XhsLogin).getContext()
    if (context) {
      const cookies = await context.cookies()
      const cookieDict = cookies.reduce(
        (acc, c) => {
          acc[c.name] = c.value
          return acc
        },
        {} as Record<string, string>
      )
      await this.client.loadCookies(cookieDict)
    }
  }

  async search(options: SearchOptions): Promise<ContentItem[]> {
    const { keyword, maxCount = 20 } = options
    const result = await this.client.searchNotes(keyword, 1, maxCount)
    const items = (result as any)?.items || []

    return items.map((item: any) => this.transformNote(item))
  }

  async getDetail(contentId: string): Promise<ContentItem> {
    const note = await this.client.getNoteDetail(contentId)
    return this.transformNote({ note_card: note })
  }

  async getComments(contentId: string, maxCount = 100): Promise<CommentItem[]> {
    const result = await this.client.getComments(contentId)
    const comments = (result as any)?.comments || []

    return comments.slice(0, maxCount).map((comment: any) => ({
      id: comment.id,
      contentId,
      authorId: comment.user_info?.user_id || '',
      authorName: comment.user_info?.nickname || '',
      content: comment.content || '',
      publishTime: new Date(comment.create_time),
      likeCount: comment.like_count || 0,
      replyCount: comment.sub_comment_count || 0,
      metadata: comment,
    }))
  }

  async getCreator(creatorId: string): Promise<CreatorItem> {
    const data = await this.client.getCreatorInfo(creatorId)
    const basicInfo = data.basicInfo || {}

    return {
      id: creatorId,
      platform: this.platform,
      name: basicInfo.nickname || '',
      avatar: basicInfo.imageb || '',
      description: basicInfo.desc || '',
      followersCount: basicInfo.fansCount || 0,
      followingCount: basicInfo.followCount || 0,
      postsCount: basicInfo.noteCount || 0,
      verified: basicInfo.redOfficialVerifyType > 0,
      url: `https://www.xiaohongshu.com/user/profile/${creatorId}`,
      metadata: data,
    }
  }

  private transformNote(item: any): ContentItem {
    const note = item.note_card || item
    const user = note.user || {}
    const interactInfo = note.interact_info || {}

    return {
      id: note.note_id,
      platform: this.platform,
      authorId: user.user_id || '',
      authorName: user.nickname || '',
      title: note.title || '',
      content: note.desc || '',
      publishTime: new Date(note.time || Date.now()),
      url: `https://www.xiaohongshu.com/explore/${note.note_id}`,
      likeCount: interactInfo.liked_count || 0,
      commentCount: interactInfo.comment_count || 0,
      shareCount: interactInfo.share_count || 0,
      images: note.image_list?.map((img: any) => img.url_default || img.url) || [],
      videos: note.video?.media?.stream?.h264?.[0]?.master_url ? [note.video.media.stream.h264[0].master_url] : [],
      tags: note.tag_list?.map((tag: any) => tag.name) || [],
      metadata: note,
    }
  }
}
