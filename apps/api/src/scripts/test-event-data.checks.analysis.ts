import { useEntityManager } from '@sker/entities'
import { PostNLPResultEntity, WeiboPostEntity, EventHourlyStatisticsEntity } from '@sker/entities'
import { EventQueryService } from '../services/data/events/event-query.service'
import { root } from '@sker/core'
import type { TestResult } from './test-event-data.helpers'

export async function testSentimentHotnessQuery(eventId: string): Promise<TestResult> {
  try {
    const results = await useEntityManager(async (em) => {
      return await em
        .createQueryBuilder(PostNLPResultEntity, 'nlp')
        .innerJoin('nlp.post', 'post')
        .innerJoin(EventHourlyStatisticsEntity, 'stats', 'stats.event_id = nlp.event_id')
        .select('nlp.post_id', 'postId')
        .addSelect(
          '(nlp.sentiment->>\'positive_prob\')::numeric - (nlp.sentiment->>\'negative_prob\')::numeric',
          'sentimentScore'
        )
        .addSelect('stats.hotness', 'hotness')
        .addSelect('nlp.created_at', 'timestamp')
        .where('nlp.event_id = :eventId', { eventId })
        .andWhere('post.deleted_at IS NULL')
        .orderBy('nlp.created_at', 'DESC')
        .limit(10)
        .getRawMany()
    })

    if (results.length === 0) {
      return {
        name: '情感-热度散点图查询 (原始 SQL)',
        success: false,
        message: '查询结果为空 - 这是"暂无散点图数据"的直接原因',
        data: { possibleReasons: ['1. NLP 结果不存在', '2. 关联帖子已删除 (deleted_at IS NULL)', '3. 统计数据不存在'] }
      }
    }

    return {
      name: '情感-热度散点图查询 (原始 SQL)',
      success: true,
      message: `查询成功，返回 ${results.length} 条记录`,
      data: results
    }
  } catch (error) {
    return { name: '情感-热度散点图查询 (原始 SQL)', success: false, message: `查询失败: ${error}` }
  }
}

export async function testAllAPIEndpoints(eventId: string): Promise<TestResult> {
  try {
    const queryService = root.get(EventQueryService)

    const endpoints = [
      { name: 'getSentimentHotness', fn: () => queryService.getSentimentHotness(eventId) },
      { name: 'getSentimentIntensity', fn: () => queryService.getSentimentIntensity(eventId) },
      { name: 'getEngagementTrend', fn: () => queryService.getEngagementTrend(eventId) },
      { name: 'getAnomalies', fn: () => queryService.getAnomalies(eventId) },
      { name: 'getPeaks', fn: () => queryService.getPeaks(eventId, 168) },
    ]

    const results: Record<string, any> = {}

    for (const endpoint of endpoints) {
      try {
        const data = await endpoint.fn()
        results[endpoint.name] = {
          success: true,
          count: Array.isArray(data) ? data.length : 'N/A',
          sample: Array.isArray(data) ? data.slice(0, 2) : data
        }
      } catch (error) {
        results[endpoint.name] = {
          success: false,
          error: String(error)
        }
      }
    }

    const failedCount = Object.values(results).filter((r: any) => !r.success).length

    return {
      name: 'API 端点测试',
      success: failedCount === 0,
      message: `测试 ${endpoints.length} 个端点，${failedCount} 个失败`,
      data: results
    }
  } catch (error) {
    return { name: 'API 端点测试', success: false, message: `测试失败: ${error}` }
  }
}

export async function diagnoseSentimentHotnessIssue(eventId: string): Promise<TestResult> {
  try {
    const diagnoses: string[] = []

    const nlpCount = await useEntityManager(async (em) => {
      return await em.count(PostNLPResultEntity, { where: { event_id: eventId } })
    })
    if (nlpCount === 0) {
      diagnoses.push(' PostNLPResultEntity 中没有该事件的 NLP 分析结果')
    }

    const deletedCount = await useEntityManager(async (em) => {
      return await em.createQueryBuilder(PostNLPResultEntity, 'nlp')
        .innerJoin('nlp.post', 'post')
        .where('nlp.event_id = :eventId', { eventId })
        .andWhere('post.deleted_at IS NOT NULL')
        .getCount()
    })
    if (deletedCount > 0) {
      diagnoses.push(` 有 ${deletedCount} 条关联的帖子已被删除 (deleted_at IS NOT NULL)`)
    }

    const statsCount = await useEntityManager(async (em) => {
      return await em.count(EventHourlyStatisticsEntity, { where: { event_id: eventId } })
    })
    if (statsCount === 0) {
      diagnoses.push(' EventHourlyStatisticsEntity 中没有该事件的统计数据')
    }

    if (diagnoses.length === 0) {
      return {
        name: '问题诊断',
        success: true,
        message: '未发现明显问题，可能需要检查具体的数据内容',
        data: { nlpCount, deletedCount, statsCount }
      }
    }

    return {
      name: '问题诊断',
      success: false,
      message: '发现以下问题:' + diagnoses.join(';'),
      data: { nlpCount, deletedCount, statsCount, diagnoses }
    }
  } catch (error) {
    return { name: '问题诊断', success: false, message: `诊断失败: ${error}` }
  }
}
