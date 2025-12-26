import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
import type { IStore } from '../store.interface'
import type { ContentItem, CommentItem, CreatorItem } from '../types'

export class CsvStore implements IStore {
  private contentPath: string
  private commentPath: string
  private creatorPath: string

  constructor(baseDir: string = './data') {
    this.contentPath = join(baseDir, 'content.csv')
    this.commentPath = join(baseDir, 'comments.csv')
    this.creatorPath = join(baseDir, 'creators.csv')
  }

  async storeContent(item: ContentItem): Promise<void> {
    const headers = ['id', 'platform', 'authorId', 'authorName', 'title', 'content', 'publishTime', 'url', 'likeCount', 'commentCount', 'shareCount', 'viewCount']
    const row = [item.id, item.platform, item.authorId, item.authorName, item.title || '', item.content, item.publishTime.toISOString(), item.url, item.likeCount, item.commentCount, item.shareCount, item.viewCount || 0]
    await this.append(this.contentPath, headers, row)
  }

  async storeComment(item: CommentItem): Promise<void> {
    const headers = ['id', 'contentId', 'authorId', 'authorName', 'content', 'publishTime', 'likeCount', 'replyCount', 'parentId']
    const row = [item.id, item.contentId, item.authorId, item.authorName, item.content, item.publishTime.toISOString(), item.likeCount, item.replyCount || 0, item.parentId || '']
    await this.append(this.commentPath, headers, row)
  }

  async storeCreator(item: CreatorItem): Promise<void> {
    const headers = ['id', 'platform', 'name', 'avatar', 'description', 'followersCount', 'followingCount', 'postsCount', 'verified', 'url']
    const row = [item.id, item.platform, item.name, item.avatar || '', item.description || '', item.followersCount, item.followingCount || 0, item.postsCount || 0, item.verified, item.url]
    await this.append(this.creatorPath, headers, row)
  }

  private async append(path: string, headers: string[], row: any[]): Promise<void> {
    await fs.mkdir(dirname(path), { recursive: true })
    const exists = await fs.access(path).then(() => true).catch(() => false)
    const csv = exists ? '' : headers.join(',') + '\n'
    const line = row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    await fs.appendFile(path, csv + line + '\n')
  }
}
