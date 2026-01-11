import { config } from 'dotenv'
import { useEntityManager, EventEntity } from '@sker/entities'

// 加载环境变量
config()

async function main() {
  const events = await useEntityManager(async (em) => {
    return await em.find(EventEntity, {
      order: { created_at: 'DESC' },
      take: 5
    })
  })

  console.log('\n==========================================')
  console.log('最近的事件列表')
  console.log('==========================================\n')

  if (events.length === 0) {
    console.log('没有找到任何事件')
    return
  }

  events.forEach((e, i) => {
    console.log(`${i + 1}. ID: ${e.id}`)
    console.log(`   标题: ${e.title}`)
    console.log(`   热度: ${e.hotness}`)
    console.log(`   创建时间: ${e.created_at}`)
    console.log('')
  })

  console.log('==========================================')
  if (events[0]) {
    console.log(`测试命令: pnpm test:event ${events[0].id}`)
  }
  console.log('==========================================\n')
}

main().catch(console.error)
