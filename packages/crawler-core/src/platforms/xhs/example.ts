import { XhsCrawler } from './xhs-crawler'

async function main() {
  const crawler = new XhsCrawler()

  try {
    // 启动爬虫（会自动触发登录）
    await crawler.start()

    // 搜索笔记
    console.log('搜索笔记...')
    const notes = await crawler.search({
      keyword: '美食',
      maxCount: 10,
    })
    console.log(`找到 ${notes.length} 条笔记`)

    // 获取笔记详情
    if (notes.length > 0) {
      const noteId = notes[0]?.id
      if (!noteId) {
        console.log('未找到有效笔记ID')
        return
      }
      console.log(`\n获取笔记详情: ${noteId}`)
      const detail = await crawler.getDetail(noteId)
      console.log('标题:', detail.title)
      console.log('内容:', detail.content.slice(0, 100))

      // 获取评论
      console.log(`\n获取评论...`)
      const comments = await crawler.getComments(noteId, 20)
      console.log(`找到 ${comments.length} 条评论`)

      // 获取创作者信息
      console.log(`\n获取创作者信息: ${detail.authorId}`)
      const creator = await crawler.getCreator(detail.authorId)
      console.log('昵称:', creator.name)
      console.log('粉丝数:', creator.followersCount)
      console.log('笔记数:', creator.postsCount)
    }

    // 保存数据
    console.log('\n保存数据...')
    for (const note of notes) {
      await crawler.store.storeContent(note)
    }
    console.log('数据已保存')
  } catch (error) {
    console.error('爬取失败:', error)
  } finally {
    await crawler.close()
  }
}

main()
