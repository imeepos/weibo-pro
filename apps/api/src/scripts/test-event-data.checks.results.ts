import { useEntityManager } from '@sker/entities'
import { PostNLPResultEntity, EventHourlyStatisticsEntity, EventEntity, WeiboPostEntity } from '@sker/entities'
import type { TestResult } from './test-event-data.helpers'

export async function testPostNLPResults(eventId: string): Promise<TestResult> {
  try {
    const count = await useEntityManager(async (em) => {
      return await em.count(PostNLPResultEntity, { where: { event_id: eventId } })
    })

    if (count === 0) {
      return {
        name: 'PostNLPResultEntity 数据',
        success: false,
        message: `没有找到 NLP 分析结果 (PostNLPResultEntity.event_id = ${eventId})`
      }
    }

    const samples = await useEntityManager(async (em) => {
      return await em.find(PostNLPResultEntity, {
        where: { event_id: eventId },
        take: 3,
        relations: {
          post: true
        }
      })
    })

    return {
      name: 'PostNLPResultEntity 数据',
      success: true,
      message: `找到 ${count} 条 NLP 分析结果`,
      data: {
        total: count,
        samples: samples.map(s => ({
          post_id: s.post_id,
          post_deleted: s.post?.deleted_at,
          sentiment: s.sentiment,
          keywords_count: s.keywords?.length || 0
        }))
      }
    }
  } catch (error) {
    return { name: 'PostNLPResultEntity 数据', success: false, message: `查询失败: ${error}` }
  }
}

export async function testWeiboPosts(eventId: string): Promise<TestResult> {
  try {
    const result = await useEntityManager(async (em) => {
      const [total, deleted, active] = await Promise.all([
        em.createQueryBuilder(PostNLPResultEntity, 'nlp')
          .innerJoin('nlp.post', 'post')
          .where('nlp.event_id = :eventId', { eventId })
          .getCount(),
        em.createQueryBuilder(PostNLPResultEntity, 'nlp')
          .innerJoin('nlp.post', 'post')
          .where('nlp.event_id = :eventId', { eventId })
          .andWhere('post.deleted_at IS NOT NULL')
          .getCount(),
        em.createQueryBuilder(PostNLPResultEntity, 'nlp')
          .innerJoin('nlp.post', 'post')
          .where('nlp.event_id = :eventId', { eventId })
          .andWhere('post.deleted_at IS NULL')
          .getCount()
      ])
      return { total, deleted, active }
    })

    if (result.total === 0) {
      return {
        name: 'WeiboPostEntity 关联',
        success: false,
        message: '没有关联的微博帖子'
      }
    }

    return {
      name: 'WeiboPostEntity 关联',
      success: true,
      message: `关联帖子总数: ${result.total}, 未删除: ${result.active}, 已删除: ${result.deleted}`,
      data: result
    }
  } catch (error) {
    return { name: 'WeiboPostEntity 关联', success: false, message: `查询失败: ${error}` }
  }
}

export async function testEventStatistics(eventId: string): Promise<TestResult> {
  try {
    const stats = await useEntityManager(async (em) => {
      return await em.find(EventHourlyStatisticsEntity, {
        where: { event_id: eventId },
        order: { year: 'DESC', month: 'DESC', day: 'DESC', hour: 'DESC' },
        take: 3
      })
    })

    if (stats.length === 0) {
      return {
        name: 'EventHourlyStatisticsEntity 数据',
        success: false,
        message: '没有找到事件统计数据'
      }
    }

    return {
      name: 'EventHourlyStatisticsEntity 数据',
      success: true,
      message: `找到 ${stats.length} 条统计记录`,
      data: stats.map(s => ({
        hotness: s.hotness,
        snapshot_at: `${s.year}-${s.month}-${s.day} ${s.hour}:00`,
        post_count: s.post_count
      }))
    }
  } catch (error) {
    return { name: 'EventHourlyStatisticsEntity 数据', success: false, message: `查询失败: ${error}` }
  }
}

export async function testHourlyStatistics(eventId: string): Promise<TestResult> {
  try {
    const stats = await useEntityManager(async (em) => {
      return await em.find(EventHourlyStatisticsEntity, {
        where: { event_id: eventId },
        order: { year: 'DESC', month: 'DESC', day: 'DESC', hour: 'DESC' },
        take: 5
      })
    })

    if (stats.length === 0) {
      return {
        name: 'EventHourlyStatisticsEntity 数据',
        success: false,
        message: '没有找到小时级统计数据'
      }
    }

    return {
      name: 'EventHourlyStatisticsEntity 数据',
      success: true,
      message: `找到 ${stats.length} 条小时级统计记录`,
      data: stats.map(s => ({
        time: `${s.year}-${s.month}-${s.day} ${s.hour}:00`,
        hotness: s.hotness,
        post_count: s.post_count,
        sentiment_positive: s.sentiment_positive,
        sentiment_negative: s.sentiment_negative
      }))
    }
  } catch (error) {
    return { name: 'EventHourlyStatisticsEntity 数据', success: false, message: `查询失败: ${error}` }
  }
}

