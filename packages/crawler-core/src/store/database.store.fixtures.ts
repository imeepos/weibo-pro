import { EntitySchema } from 'typeorm'

// Mock 实体类定义
export class MockContentEntity {
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

export class MockCommentEntity {
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

export class MockCreatorEntity {
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
export const MockContentSchema = new EntitySchema<MockContentEntity>({
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

export const MockCommentSchema = new EntitySchema<MockCommentEntity>({
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

export const MockCreatorSchema = new EntitySchema<MockCreatorEntity>({
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
