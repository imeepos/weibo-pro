import { Container } from '@sker/core'
import { BrowserManager } from '../../browser'
import { JsonStore } from '../../store'
import { WeiboCrawler, WeiboLogin, WeiboClient } from './index'

async function main() {
  const container = new Container()

  // 注册依赖
  container.register(BrowserManager)
  container.register(WeiboClient)
  container.register(WeiboLogin)
  container.register(JsonStore, { useValue: new JsonStore('./data/weibo') })
  container.register(WeiboCrawler)

  // 获取爬虫实例
  const crawler = container.resolve(WeiboCrawler)

  try {
    // 启动爬虫（会触发登录）
    await crawler.start()

    // 搜索微博
    console.log('搜索微博...')
    const contents = await crawler.search({
      keyword: 'AI',
      maxCount: 10,
      sortBy: 'hot',
    })
    console.log(`找到 ${contents.length} 条微博`)

    // 获取详情
    if (contents.length > 0) {
      const detail = await crawler.getDetail(contents[0].id)
      console.log('微博详情:', detail.content)

      // 获取评论
      const comments = await crawler.getComments(contents[0].id, 20)
      console.log(`获取到 ${comments.length} 条评论`)
    }

    // 获取用户信息
    const creator = await crawler.getCreator('1234567890')
    console.log('用户信息:', creator.name)
  } finally {
    await crawler.close()
  }
}

main().catch(console.error)
