import { DataSource, Repository } from 'typeorm'
import { Injectable } from '@sker/core'
import type { IStore } from '../store.interface'
import type { ContentItem, CommentItem, CreatorItem } from '../types'

interface EntityMapping {
  content: any
  comment: any
  creator: any
}

@Injectable()
export class DatabaseStore<T extends EntityMapping = any> implements IStore {
  private contentRepo: Repository<T['content']>
  private commentRepo: Repository<T['comment']>
  private creatorRepo: Repository<T['creator']>

  constructor(
    private dataSource: DataSource,
    private entities: T
  ) {
    this.contentRepo = dataSource.getRepository(entities.content)
    this.commentRepo = dataSource.getRepository(entities.comment)
    this.creatorRepo = dataSource.getRepository(entities.creator)
  }

  async storeContent(item: ContentItem): Promise<void> {
    const entity = this.contentRepo.create(this.mapContent(item))
    await this.contentRepo.save(entity)
  }

  async storeComment(item: CommentItem): Promise<void> {
    const entity = this.commentRepo.create(this.mapComment(item))
    await this.commentRepo.save(entity)
  }

  async storeCreator(item: CreatorItem): Promise<void> {
    const entity = this.creatorRepo.create(this.mapCreator(item))
    await this.creatorRepo.save(entity)
  }

  private mapContent(item: ContentItem): any {
    const now = Date.now()
    return {
      user_id: item.authorId,
      nickname: item.authorName,
      title: item.title,
      content: item.content,
      publish_time: item.publishTime.getTime(),
      like_count: String(item.likeCount),
      comment_count: String(item.commentCount),
      share_count: String(item.shareCount),
      view_count: String(item.viewCount || 0),
      add_ts: now,
      last_modify_ts: now,
    }
  }

  private mapComment(item: CommentItem): any {
    const now = Date.now()
    return {
      user_id: item.authorId,
      nickname: item.authorName,
      content: item.content,
      publish_time: item.publishTime.getTime(),
      like_count: String(item.likeCount),
      sub_comment_count: String(item.replyCount || 0),
      parent_comment_id: item.parentId,
      add_ts: now,
      last_modify_ts: now,
    }
  }

  private mapCreator(item: CreatorItem): any {
    const now = Date.now()
    return {
      user_id: item.id,
      nickname: item.name,
      avatar: item.avatar,
      desc: item.description,
      follows: String(item.followingCount || 0),
      fans: String(item.followersCount),
      add_ts: now,
      last_modify_ts: now,
    }
  }
}
