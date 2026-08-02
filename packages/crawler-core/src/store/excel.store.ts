import { Workbook } from 'exceljs'
import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
import type { IStore } from '../store.interface'
import type { ContentItem, CommentItem, CreatorItem } from '../types'

export class ExcelStore implements IStore {
  private contentPath: string
  private commentPath: string
  private creatorPath: string

  constructor(baseDir: string = './data') {
    this.contentPath = join(baseDir, 'content.xlsx')
    this.commentPath = join(baseDir, 'comments.xlsx')
    this.creatorPath = join(baseDir, 'creators.xlsx')
  }

  async storeContent(item: ContentItem): Promise<void> {
    const workbook = await this.load(this.contentPath)
    const sheet = workbook.getWorksheet('Content') || workbook.addWorksheet('Content')

    if (sheet.rowCount === 0) {
      sheet.addRow(['ID', 'Platform', 'Author ID', 'Author Name', 'Title', 'Content', 'Publish Time', 'URL', 'Likes', 'Comments', 'Shares', 'Views'])
    }

    sheet.addRow([item.id, item.platform, item.authorId, item.authorName, item.title, item.content, item.publishTime, item.url, item.likeCount, item.commentCount, item.shareCount, item.viewCount])
    await this.save(workbook, this.contentPath)
  }

  async storeComment(item: CommentItem): Promise<void> {
    const workbook = await this.load(this.commentPath)
    const sheet = workbook.getWorksheet('Comments') || workbook.addWorksheet('Comments')

    if (sheet.rowCount === 0) {
      sheet.addRow(['ID', 'Content ID', 'Author ID', 'Author Name', 'Content', 'Publish Time', 'Likes', 'Replies', 'Parent ID'])
    }

    sheet.addRow([item.id, item.contentId, item.authorId, item.authorName, item.content, item.publishTime, item.likeCount, item.replyCount, item.parentId])
    await this.save(workbook, this.commentPath)
  }

  async storeCreator(item: CreatorItem): Promise<void> {
    const workbook = await this.load(this.creatorPath)
    const sheet = workbook.getWorksheet('Creators') || workbook.addWorksheet('Creators')

    if (sheet.rowCount === 0) {
      sheet.addRow(['ID', 'Platform', 'Name', 'Avatar', 'Description', 'Followers', 'Following', 'Posts', 'Verified', 'URL'])
    }

    sheet.addRow([item.id, item.platform, item.name, item.avatar, item.description, item.followersCount, item.followingCount, item.postsCount, item.verified, item.url])
    await this.save(workbook, this.creatorPath)
  }

  private async load(path: string): Promise<Workbook> {
    const workbook = new Workbook()
    try {
      await workbook.xlsx.readFile(path)
    } catch {
      // 读取失败时返回空 workbook
    }
    return workbook
  }

  private async save(workbook: Workbook, path: string): Promise<void> {
    await fs.mkdir(dirname(path), { recursive: true })
    await workbook.xlsx.writeFile(path)
  }
}
