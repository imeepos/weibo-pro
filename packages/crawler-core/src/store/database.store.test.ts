import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DataSource, EntitySchema } from 'typeorm'
import { DatabaseStore } from './database.store'
import type { ContentItem, CommentItem, CreatorItem } from '../types'

// 配置TypeORM使用better-sqlite3
const _driverPath = require.resolve('better-sqlite3')

// Mock 实体类定义
class MockContentEntity {
  id!: string
  user_id!: string
  nickname!: string
  title!: string | null
  content!: string
  publish_time!: number
  like_count!: string
  comment_count!: string
  share_count!: string
  view_count!: string
  add_ts!: number
  last_modify_ts!: number
}

class MockCommentEntity {
  id!: string
  user_id!: string
  nickname!: string
  content!: string
  publish_time!: number
  like_count!: string
  sub_comment_count!: string
  parent_comment_id!: string | null
  add_ts!: number
  last_modify_ts!: number
}

class MockCreatorEntity {
  id!: string
  user_id!: string
  nickname!: string
  avatar!: string | null
  desc!: string | null
  follows!: string
  fans!: string
  add_ts!: number
  last_modify_ts!: number
}

// 定义 EntitySchema
const MockContentSchema = new EntitySchema<MockContentEntity>({
  name: 'MockContent',
  target: MockContentEntity,
  columns: {
    id: {
      type: String,
      primary: true,
      generated: 'uuid',
    },
    user_id: { type: String },
    nickname: { type: String },
    title: { type: String, nullable: true },
    content: { type: String },
    publish_time: { type: 'bigint' },
    like_count: { type: String },
    comment_count: { type: String },
    share_count: { type: String },
    view_count: { type: String },
    add_ts: { type: 'bigint' },
    last_modify_ts: { type: 'bigint' },
  },
})

const MockCommentSchema = new EntitySchema<MockCommentEntity>({
  name: 'MockComment',
  target: MockCommentEntity,
  columns: {
    id: {
      type: String,
      primary: true,
      generated: 'uuid',
    },
    user_id: { type: String },
    nickname: { type: String },
    content: { type: String },
    publish_time: { type: 'bigint' },
    like_count: { type: String },
    sub_comment_count: { type: String },
    parent_comment_id: { type: String, nullable: true },
    add_ts: { type: 'bigint' },
    last_modify_ts: { type: 'bigint' },
  },
})

const MockCreatorSchema = new EntitySchema<MockCreatorEntity>({
  name: 'MockCreator',
  target: MockCreatorEntity,
  columns: {
    id: {
      type: String,
      primary: true,
      generated: 'uuid',
    },
    user_id: { type: String },
    nickname: { type: String },
    avatar: { type: String, nullable: true },
    desc: { type: String, nullable: true },
    follows: { type: String },
    fans: { type: String },
    add_ts: { type: 'bigint' },
    last_modify_ts: { type: 'bigint' },
  },
})

describe('DatabaseStore', () => {
  let dataSource: DataSource
  let store: DatabaseStore

  beforeEach(async () => {
    // 创建内存 SQLite 数据库
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      driver: require('better-sqlite3'),
      entities: [MockContentSchema, MockCommentSchema, MockCreatorSchema],
      synchronize: true,
      logging: false,
    })

    await dataSource.initialize()

    // 传入DataSource用于测试
    store = new DatabaseStore(
      {
        content: MockContentEntity,
        comment: MockCommentEntity,
        creator: MockCreatorEntity,
      },
      dataSource
    )
  })

  afterEach(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy()
    }
  })

  describe('storeContent', () => {
    it('应该正确保存内容数据', async () => {
      const contentItem: ContentItem = {
        id: '123',
        platform: 'weibo',
        authorId: 'user123',
        authorName: 'Test User',
        title: 'Test Title',
        content: 'Test content',
        publishTime: new Date('2024-01-01T00:00:00Z'),
        url: 'https://example.com/post/123',
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
        viewCount: 100,
      }

      await store.storeContent(contentItem)

      const repo = dataSource.getRepository(MockContentEntity)
      const saved = await repo.findOne({ where: { user_id: 'user123' } })

      expect(saved).toBeDefined()
      expect(saved?.nickname).toBe('Test User')
      expect(saved?.title).toBe('Test Title')
      expect(saved?.content).toBe('Test content')
      expect(saved?.like_count).toBe('10')
      expect(saved?.comment_count).toBe('5')
      expect(saved?.share_count).toBe('2')
      expect(saved?.view_count).toBe('100')
    })

    it('应该正确处理时间戳', async () => {
      const publishTime = new Date('2024-01-01T12:00:00Z')
      const contentItem: ContentItem = {
        id: '123',
        platform: 'weibo',
        authorId: 'user123',
        authorName: 'Test User',
        content: 'Test content',
        publishTime,
        url: 'https://example.com/post/123',
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
      }

      await store.storeContent(contentItem)

      const repo = dataSource.getRepository(MockContentEntity)
      const saved = await repo.findOne({ where: { user_id: 'user123' } })

      expect(saved?.publish_time).toBe(publishTime.getTime())
    })
  })

  describe('storeComment', () => {
    it('应该正确保存评论数据', async () => {
      const commentItem: CommentItem = {
        id: 'comment123',
        contentId: 'post123',
        authorId: 'user456',
        authorName: 'Commenter',
        content: 'Test comment',
        publishTime: new Date('2024-01-01T00:00:00Z'),
        likeCount: 3,
        replyCount: 1,
      }

      await store.storeComment(commentItem)

      const repo = dataSource.getRepository(MockCommentEntity)
      const saved = await repo.findOne({ where: { user_id: 'user456' } })

      expect(saved).toBeDefined()
      expect(saved?.nickname).toBe('Commenter')
      expect(saved?.content).toBe('Test comment')
      expect(saved?.like_count).toBe('3')
      expect(saved?.sub_comment_count).toBe('1')
    })

    it('应该正确保存带父评论ID的评论', async () => {
      const commentItem: CommentItem = {
        id: 'comment123',
        contentId: 'post123',
        authorId: 'user456',
        authorName: 'Commenter',
        content: 'Test reply',
        publishTime: new Date('2024-01-01T00:00:00Z'),
        likeCount: 1,
        parentId: 'parent123',
      }

      await store.storeComment(commentItem)

      const repo = dataSource.getRepository(MockCommentEntity)
      const saved = await repo.findOne({ where: { user_id: 'user456' } })

      expect(saved?.parent_comment_id).toBe('parent123')
    })
  })

  describe('storeCreator', () => {
    it('应该正确保存创作者数据', async () => {
      const creatorItem: CreatorItem = {
        id: 'creator123',
        platform: 'weibo',
        name: 'Creator Name',
        avatar: 'https://example.com/avatar.jpg',
        description: 'Test description',
        followersCount: 1000,
        followingCount: 500,
        postsCount: 100,
        verified: true,
        url: 'https://example.com/user/creator123',
      }

      await store.storeCreator(creatorItem)

      const repo = dataSource.getRepository(MockCreatorEntity)
      const saved = await repo.findOne({ where: { user_id: 'creator123' } })

      expect(saved).toBeDefined()
      expect(saved?.nickname).toBe('Creator Name')
      expect(saved?.avatar).toBe('https://example.com/avatar.jpg')
      expect(saved?.desc).toBe('Test description')
      expect(saved?.fans).toBe('1000')
      expect(saved?.follows).toBe('500')
    })

    it('应该正确处理可选字段', async () => {
      const creatorItem: CreatorItem = {
        id: 'creator123',
        platform: 'weibo',
        name: 'Creator Name',
        followersCount: 1000,
        verified: false,
        url: 'https://example.com/user/creator123',
      }

      await store.storeCreator(creatorItem)

      const repo = dataSource.getRepository(MockCreatorEntity)
      const saved = await repo.findOne({ where: { user_id: 'creator123' } })

      // 数据库将undefined存储为null
      expect(saved?.avatar).toBeNull()
      expect(saved?.desc).toBeNull()
    })
  })

  describe('连接管理', () => {
    it('应该在操作后正确释放EntityManager', async () => {
      const contentItem: ContentItem = {
        id: '123',
        platform: 'weibo',
        authorId: 'user123',
        authorName: 'Test User',
        content: 'Test content',
        publishTime: new Date(),
        url: 'https://example.com/post/123',
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
      }

      // 执行多次操作
      for (let i = 0; i < 10; i++) {
        await store.storeContent({ ...contentItem, id: `123-${i}` })
      }

      // 验证数据正确保存
      const repo = dataSource.getRepository(MockContentEntity)
      const count = await repo.count()
      expect(count).toBe(10)
    })
  })
})
