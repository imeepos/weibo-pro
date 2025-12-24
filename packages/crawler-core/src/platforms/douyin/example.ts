import { EnvironmentInjector } from '@sker/core'
import { BrowserManager } from '../../browser'
import { JsonStore } from '../../store'
import { DouyinClient, DouyinLogin, DouyinCrawler } from './index'

async function main() {
  const injector = EnvironmentInjector.createWithAutoProviders([
    { provide: BrowserManager, useClass: BrowserManager },
    { provide: DouyinClient, useClass: DouyinClient },
    { provide: DouyinLogin, useClass: DouyinLogin },
    { provide: JsonStore, useFactory: () => new JsonStore('./data/douyin') },
    { provide: DouyinCrawler, useClass: DouyinCrawler },
  ])

  const crawler = injector.get(DouyinCrawler)

  try {
    await crawler.start()

    console.log('搜索视频...')
    const videos = await crawler.search({
      keyword: '美食',
      maxCount: 10,
    })
    console.log(`找到 ${videos.length} 个视频`)

    if (videos.length > 0) {
      const firstVideo = videos[0]!
      console.log('\n获取视频详情...')
      const detail = await crawler.getDetail(firstVideo.id)
      console.log(`视频标题: ${detail.title}`)
      console.log(`点赞数: ${detail.likeCount}`)

      console.log('\n获取评论...')
      const comments = await crawler.getComments(firstVideo.id, 20)
      console.log(`找到 ${comments.length} 条评论`)

      console.log('\n获取创作者信息...')
      const creator = await crawler.getCreator(firstVideo.authorId)
      console.log(`创作者: ${creator.name}`)
      console.log(`粉丝数: ${creator.followersCount}`)
    }
  } catch (error) {
    console.error('爬取失败:', error)
  } finally {
    await crawler.close()
  }
}

main()
