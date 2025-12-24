import { StoreFactory, JsonStore, CsvStore, ExcelStore, DatabaseStore } from '@sker/crawler-core'
import { DataSource } from 'typeorm'
import type { ContentItem } from '@sker/crawler-core'

// 1. 使用工厂创建存储
const jsonStore = StoreFactory.create({
  type: 'json',
  baseDir: './data/json'
})

const csvStore = StoreFactory.create({
  type: 'csv',
  baseDir: './data/csv'
})

const excelStore = StoreFactory.create({
  type: 'excel',
  baseDir: './data/excel'
})

// 2. 直接实例化
const store = new JsonStore('./output')

// 3. 数据库存储
const dataSource = new DataSource({
  type: 'sqlite',
  database: './data.db',
  entities: [/* your entities */],
  synchronize: true
})

await dataSource.initialize()

const dbStore = StoreFactory.create({
  type: 'database',
  database: {
    dataSource,
    entities: {
      content: ContentEntity,
      comment: CommentEntity,
      creator: CreatorEntity
    }
  }
})

// 4. 存储数据
const content: ContentItem = {
  id: '123',
  platform: 'weibo',
  authorId: 'user123',
  authorName: '张三',
  content: '这是一条微博',
  publishTime: new Date(),
  url: 'https://weibo.com/123',
  likeCount: 100,
  commentCount: 20,
  shareCount: 5
}

await store.storeContent(content)
