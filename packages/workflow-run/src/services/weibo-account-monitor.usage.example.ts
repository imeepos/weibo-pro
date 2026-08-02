/**
 * 账号监控服务使用示例
 *
 * 展示如何使用 WeiboAccountMonitorService 进行账号监控和告警
 */

import { WeiboAccountMonitorService } from './weibo-account-monitor.service'
import { root } from '@sker/core'

async function main() {
  // 1. 获取监控服务实例
  const monitorService = root.get(WeiboAccountMonitorService)

  console.log('=== 微博账号监控示例 ===\n')

  // 2. 获取当前监控指标
  const metrics = await monitorService.getMetrics()
  console.log('📊 当前账号状态：')
  console.log(`   总账号数：${metrics.total}`)
  console.log(`   ACTIVE 账号：${metrics.active}`)
  console.log(`   EXPIRED 账号：${metrics.expired}`)
  console.log(`   Redis 健康账号：${metrics.available}`)
  console.log(`   可用率：${metrics.availabilityRate}%`)
  console.log(`   最后检查时间：${metrics.lastCheckTime.toISOString()}`)

  // 3. 检查告警
  const alerts = await monitorService.checkAlerts(metrics)

  if (alerts.length > 0) {
    console.log(`\n⚠️  发现 ${alerts.length} 个告警：`)
    monitorService.sendAlerts(alerts)
  } else {
    console.log('\n✅ 所有指标正常，无告警')
  }

  // 4. 采集快照（用于历史趋势记录）
  await monitorService.takeSnapshot()
  console.log('\n📸 已采集当前状态快照')

  // 5. 显示趋势数据
  if (metrics.trend.length > 0) {
    console.log('\n📈 24小时趋势：')
    metrics.trend.slice(0, 5).forEach((snapshot, index) => {
      console.log(`   ${index + 1}. ${snapshot.timestamp.toISOString()}`)
      console.log(`      可用率：${snapshot.availabilityRate}%`)
    })
  } else {
    console.log('\n📈 暂无历史趋势数据')
  }
}

// 示例：定时监控任务
async function monitoringJob() {
  const monitorService = root.get(WeiboAccountMonitorService)

  // 每5分钟执行一次监控
  setInterval(async () => {
    try {
      console.log(`\n[${new Date().toISOString()}] 开始账号监控检查...`)

      // 获取指标
      const metrics = await monitorService.getMetrics()

      // 检查告警
      const alerts = await monitorService.checkAlerts(metrics)

      // 发送告警
      if (alerts.length > 0) {
        monitorService.sendAlerts(alerts)
      }

      console.log('✅ 监控检查完成')
    } catch (error) {
      console.error('❌ 监控检查失败：', error)
    }
  }, 5 * 60 * 1000) // 5分钟
}

// 示例：每小时快照任务
async function snapshotJob() {
  const monitorService = root.get(WeiboAccountMonitorService)

  // 每小时执行一次快照
  setInterval(async () => {
    try {
      console.log(`\n[${new Date().toISOString()}] 开始采集账号快照...`)
      await monitorService.takeSnapshot()
      console.log('✅ 快照采集完成')
    } catch (error) {
      console.error('❌ 快照采集失败：', error)
    }
  }, 60 * 60 * 1000) // 1小时
}

export { main, monitoringJob, snapshotJob }
