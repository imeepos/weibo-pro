import { EnvironmentInjector } from '@sker/core'
import { BrowserManager } from '../../browser'
import { JsonStore } from '../../store'
import { TiebaCrawler, TiebaLogin, TiebaClient } from './index'

async function main() {
  const injector = EnvironmentInjector.createWithAutoProviders([
    { provide: BrowserManager, useClass: BrowserManager },
    { provide: TiebaClient, useClass: TiebaClient },
    { provide: TiebaLogin, useClass: TiebaLogin },
    { provide: JsonStore, useValue: new JsonStore('./data/tieba') },
    { provide: TiebaCrawler, useClass: TiebaCrawler },
  ])

  const crawler = injector.get(TiebaCrawler)

  try {
    await crawler.start()

    console.log('搜索贴吧帖子...')
    const contents = await crawler.search({
      keyword: '编程',
      maxCount: 10,
      sortBy: 'time',
    })
    console.log(`找到 ${contents.length} 条帖子`)

    if (contents.length > 0) {
      const detail = await crawler.getDetail(contents[0]!.id)
      console.log('帖子详情:', detail.title)

      const comments = await crawler.getComments(contents[0]!.id, 20)
      console.log(`获取到 ${comments.length} 条评论`)
    }

    const creator = await crawler.getCreator('用户名')
    console.log('用户信息:', creator.name)
  } finally {
    await crawler.close()
  }
}

main().catch(console.error)
