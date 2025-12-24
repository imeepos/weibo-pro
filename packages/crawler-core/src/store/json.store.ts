import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
import type { IStore } from '../store.interface'
import type { ContentItem, CommentItem, CreatorItem } from '../types'

export class JsonStore implements IStore {
  private contentPath: string
  private commentPath: string
  private creatorPath: string

  constructor(baseDir: string = './data') {
    this.contentPath = join(baseDir, 'content.json')
    this.commentPath = join(baseDir, 'comments.json')
    this.creatorPath = join(baseDir, 'creators.json')
  }

  async storeContent(item: ContentItem): Promise<void> {
    await this.append(this.contentPath, item)
  }

  async storeComment(item: CommentItem): Promise<void> {
    await this.append(this.commentPath, item)
  }

  async storeCreator(item: CreatorItem): Promise<void> {
    await this.append(this.creatorPath, item)
  }

  private async append(path: string, item: any): Promise<void> {
    await fs.mkdir(dirname(path), { recursive: true })
    const data = await this.read(path)
    data.push(item)
    await fs.writeFile(path, JSON.stringify(data, null, 2))
  }

  private async read(path: string): Promise<any[]> {
    try {
      const content = await fs.readFile(path, 'utf-8')
      return JSON.parse(content)
    } catch {
      return []
    }
  }
}
