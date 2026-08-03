import { useEntityManager } from '@sker/entities'
import { EventEntity } from '@sker/entities'
import type { TestResult } from './test-event-data.helpers'

export async function testDatabaseConnection(): Promise<TestResult> {
  try {
    await useEntityManager(async (em) => {
      await em.query('SELECT 1')
    })
    return { name: '数据库连接', success: true, message: '连接成功' }
  } catch (error) {
    return { name: '数据库连接', success: false, message: `连接失败: ${error}` }
  }
}

export async function testEventExists(eventId: string): Promise<TestResult> {
  try {
    const event = await useEntityManager(async (em) => {
      return await em.findOne(EventEntity, { where: { id: eventId } })
    })
    if (!event) {
      return { name: '事件存在性', success: false, message: `事件 ${eventId} 不存在` }
    }
    return {
      name: '事件存在性',
      success: true,
      message: `事件存在: ${event.title}`,
      data: { id: event.id, title: event.title, hotness: event.hotness }
    }
  } catch (error) {
    return { name: '事件存在性', success: false, message: `查询失败: ${error}` }
  }
}

