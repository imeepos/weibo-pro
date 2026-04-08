import { Injectable } from '@sker/core'
import { DataSource, EntityManager } from 'typeorm'
import type { IStore } from '../store.interface'
import type { ContentItem, CommentItem, CreatorItem } from '../types'

interface EntityMapping {
  content: any
  comment: any
  creator: any
}

/**
 * 数据库存储实现 - 使用useEntityManager自动管理连接
 *
 * 重要特性：
 * - 自动释放数据库连接，防止连接泄露
 * - 支持测试环境传入自定义DataSource
 * - 每次操作都使用新的EntityManager
 */
@Injectable()
export class DatabaseStore<T extends EntityMapping = any> implements IStore {
  private testDataSource?: DataSource

  constructor(
    private entities: T,
    dataSource?: DataSource
  ) {
    // 如果传入了DataSource，保存为测试用DataSource
    if (dataSource) {
      this.testDataSource = dataSource
    }
  }

  /**
   * 使用EntityManager执行操作
   *
   * 生产环境：使用全局DataSource和useEntityManager
   * 测试环境：使用传入的测试DataSource
   */
  private async withEntityManager<T>(
    callback: (manager: EntityManager) => Promise<T>
  ): Promise<T> {
    if (this.testDataSource) {
      // 测试环境：直接使用测试DataSource
      const manager = this.testDataSource.createEntityManager()
      try {
        return await callback(manager)
      } finally {
        // 释放EntityManager持有的连接
        const queryRunner = (manager as any).queryRunner
        if (queryRunner && typeof queryRunner.release === 'function') {
          await queryRunner.release()
        }
      }
    } else {
      // 生产环境：延迟导入useEntityManager避免循环依赖
      // @ts-ignore - 动态导入在运行时可以解析
      const { useEntityManager } = await import('@sker/entities')
      return await useEntityManager(callback)
    }
  }

  async storeContent(item: ContentItem): Promise<void> {
    await this.withEntityManager(async (manager) => {
      const repo = manager.getRepository(this.entities.content)
      const entity = repo.create(this.mapContent(item))
      await repo.save(entity)
    })
  }

  async storeComment(item: CommentItem): Promise<void> {
    await this.withEntityManager(async (manager) => {
      const repo = manager.getRepository(this.entities.comment)
      const entity = repo.create(this.mapComment(item))
      await repo.save(entity)
    })
  }

  async storeCreator(item: CreatorItem): Promise<void> {
    await this.withEntityManager(async (manager) => {
      const repo = manager.getRepository(this.entities.creator)
      const entity = repo.create(this.mapCreator(item))
      await repo.save(entity)
    })
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
