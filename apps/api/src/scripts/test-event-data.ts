import { config } from 'dotenv'
import { results, logResult } from './test-event-data.helpers'
import {
  testDatabaseConnection,
  testEventExists,
  testPostNLPResults,
  testWeiboPosts,
  testEventStatistics,
  testHourlyStatistics,
  testSentimentHotnessQuery,
  testAllAPIEndpoints,
  diagnoseSentimentHotnessIssue,
} from './test-event-data.checks'

// 加载环境变量
config()

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
