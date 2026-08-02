import { config } from 'dotenv'
import { useEntityManager } from '@sker/entities'
import { EventEntity, PostNLPResultEntity, WeiboPostEntity, EventHourlyStatisticsEntity } from '@sker/entities'
import { EventQueryService } from '../services/data/events/event-query.service'
import { root } from '@sker/core'

// 加载环境变量
config()

interface TestResult {
  name: string
  success: boolean
  message: string
  data?: any
}

const results: TestResult[] = []

function logResult(result: TestResult) {
  const icon = result.success ? '' : ''
  const color = result.success ? '\x1b[32m' : '\x1b[31m'
  console.log(`${color}${icon} ${result.name}\x1b[0m`)
  console.log(`   ${result.message}`)
  if (result.data !== undefined) {
    console.log(`   数据: ${JSON.stringify(result.data, null, 2).split('\n').join('\n   ')}`)
  }
  console.log('')
}

async function testDatabaseConnection(): Promise<TestResult> {
  try {
    await useEntityManager(async (em) => {
      await em.query('SELECT 1')
    })
    return { name: '数据库连接', success: true, message: '连接成功' }
  } catch (error) {
    return { name: '数据库连接', success: false, message: `连接失败: ${error}` }
  }
}

async function testEventExists(eventId: string): Promise<TestResult> {
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

async function testPostNLPResults(eventId: string): Promise<TestResult> {
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
        relations: ['post']
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

async function testWeiboPosts(eventId: string): Promise<TestResult> {
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

async function testEventStatistics(eventId: string): Promise<TestResult> {
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

async function testHourlyStatistics(eventId: string): Promise<TestResult> {
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

async function testSentimentHotnessQuery(eventId: string): Promise<TestResult> {
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

async function testAllAPIEndpoints(eventId: string): Promise<TestResult> {
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

async function diagnoseSentimentHotnessIssue(eventId: string): Promise<TestResult> {
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

export async function testEventData(eventId: string) {
  console.log('\n==========================================')
  console.log(`事件数据诊断测试 - Event ID: ${eventId}`)
  console.log('==========================================\n')

  // 1. 数据库连接
  const connResult = await testDatabaseConnection()
  results.push(connResult)
  logResult(connResult)

  if (!connResult.success) {
    console.log('\x1b[31m无法连接数据库，停止测试\x1b[0m')
    return
  }

  // 2. 事件存在性
  const eventResult = await testEventExists(eventId)
  results.push(eventResult)
  logResult(eventResult)

  if (!eventResult.success) {
    console.log('\x1b[31m事件不存在，停止测试\x1b[0m')
    return
  }

  // 3. PostNLPResultEntity 数据
  const nlpResult = await testPostNLPResults(eventId)
  results.push(nlpResult)
  logResult(nlpResult)

  // 4. WeiboPostEntity 关联
  const postResult = await testWeiboPosts(eventId)
  results.push(postResult)
  logResult(postResult)

  // 5. EventStatisticsEntity 数据
  const statsResult = await testEventStatistics(eventId)
  results.push(statsResult)
  logResult(statsResult)

  // 6. EventHourlyStatisticsEntity 数据
  const hourlyResult = await testHourlyStatistics(eventId)
  results.push(hourlyResult)
  logResult(hourlyResult)

  // 7. 情感-热度散点图原始查询
  const scatterResult = await testSentimentHotnessQuery(eventId)
  results.push(scatterResult)
  logResult(scatterResult)

  // 8. API 端点测试
  const apiResult = await testAllAPIEndpoints(eventId)
  results.push(apiResult)
  logResult(apiResult)

  // 9. 问题诊断
  const diagnoseResult = await diagnoseSentimentHotnessIssue(eventId)
  results.push(diagnoseResult)
  logResult(diagnoseResult)

  // 总结
  console.log('==========================================')
  console.log('测试总结')
  console.log('==========================================')
  const successCount = results.filter(r => r.success).length
  const failCount = results.length - successCount
  console.log(`总计: ${results.length} 项测试`)
  console.log(`\x1b[32m通过: ${successCount}\x1b[0m`)
  console.log(`\x1b[31m失败: ${failCount}\x1b[0m`)
  console.log('')

  if (!scatterResult.success) {
    console.log('\x1b[31;1m"暂无散点图数据"根本原因:\x1b[0m')
    console.log(scatterResult.message)
  }
}

// 命令行执行
const eventId = process.argv[2]

if (!eventId) {
  console.log('\x1b[33m用法: pnpm tsx scripts/test-event-data.ts <eventId>\x1b[0m')
  console.log('\x1b[33m示例: pnpm tsx scripts/test-event-data.ts 12345\x1b[0m')
  process.exit(1)
}

testEventData(eventId).catch(console.error)
