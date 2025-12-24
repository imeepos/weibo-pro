import { BrowserManager } from '../../browser'
import { JsonStore } from '../../store'
import { BilibiliClient, BilibiliCrawler, BilibiliLogin } from './index'

async function main() {
  // 创建依赖实例
  const browserManager = new BrowserManager()
  const client = new BilibiliClient()
  const login = new BilibiliLogin(client, browserManager)
  const store = new JsonStore('./data/bilibili')
  const crawler = new BilibiliCrawler(client, login, store)

  try {
    // 启动爬虫（自动登录）
    await crawler.start()

    // 搜索视频
    console.log('搜索视频...')
    const videos = await crawler.search({ keyword: 'AI编程', maxCount: 10 })
    console.log(`找到 ${videos.length} 个视频`)

    // 获取视频详情
    if (videos.length > 0) {
      const firstVideo = videos[0]!
      console.log('\n获取视频详情...')
      const detail = await crawler.getDetail(firstVideo.id)
      console.log(`标题: ${detail.title}`)
      console.log(`播放: ${detail.viewCount}, 点赞: ${detail.likeCount}`)

      // 获取评论
      console.log('\n获取评论...')
      const comments = await crawler.getComments(firstVideo.id, 20)
      console.log(`获取到 ${comments.length} 条评论`)

      // 获取UP主信息
      console.log('\n获取UP主信息...')
      const creator = await crawler.getCreator(firstVideo.authorId)
      console.log(`UP主: ${creator.name}`)
      console.log(`粉丝: ${creator.followersCount}`)
    }

    // 关闭爬虫
    await crawler.close()
  } catch (error) {
    console.error('爬取失败:', error)
  }
}

main()
