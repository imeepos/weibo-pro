import { Container } from '@sker/core'
import { BrowserManager } from '../../browser'
import { JsonStore } from '../../store'
import { ZhihuClient, ZhihuCrawler, ZhihuLogin } from './index'

async function main() {
  const container = new Container()

  container.register(BrowserManager)
  container.register(ZhihuClient)
  container.register(ZhihuLogin)

  const store = new JsonStore('./data/zhihu')
  const client = container.resolve(ZhihuClient)
  const login = container.resolve(ZhihuLogin)
  const crawler = new ZhihuCrawler(client, login, store)

  await crawler.start()

  try {
    console.log('搜索知乎内容...')
    const contents = await crawler.search({
      keyword: 'TypeScript',
      maxCount: 10,
    })
    console.log(`找到 ${contents.length} 条内容`)

    if (contents.length > 0) {
      const firstContent = contents[0]
      console.log(`\n获取内容详情: ${firstContent.title}`)
      await crawler.getDetail(firstContent.id)

      console.log('\n获取评论...')
      const comments = await crawler.getComments(`answer:${firstContent.id}`, 20)
      console.log(`找到 ${comments.length} 条评论`)

      if (firstContent.authorId) {
        console.log(`\n获取创作者信息: ${firstContent.authorName}`)
        await crawler.getCreator(firstContent.authorId)
      }
    }
  } finally {
    await crawler.close()
  }
}

main().catch(console.error)
