import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

// 配置 dayjs 时区插件
dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 格式化时间为北京时间字符串
 */
export function formatBeijingTime(date: Date | null | undefined): string {
  if (!date) return '无'
  return dayjs(date).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
}
