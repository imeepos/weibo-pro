import React from 'react'
import { EChart } from '@sker/ui/components/ui/echart'
import { motion } from 'framer-motion'
import { useTheme } from '@/hooks/useTheme'

interface EngagementTrendDataPoint {
  timestamp: string
  comment_count: number
  repost_count: number
  like_count: number
  engagement_rate?: number
}

interface EngagementTrendChartProps {
  data: EngagementTrendDataPoint[]
  height?: number
  className?: string
}

/**
 * 互动指标趋势图 - 展示评论、转发、点赞随时间的变化
 * 基于小时级统计数据 (EventHourlyStatisticsEntity)
 */
const EngagementTrendChart: React.FC<EngagementTrendChartProps> = ({
  data,
  height = 300,
  className = ''
}) => {
  const { isDark } = useTheme()

  const option = React.useMemo(() => {
    if (!data || data.length === 0) {
      return null
    }

    const timeLabels = data.map(item => {
      const date = new Date(item.timestamp)
      return date.toLocaleDateString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric'
      })
    })

    const commentData = data.map(d => d.comment_count)
    const repostData = data.map(d => d.repost_count)
    const likeData = data.map(d => d.like_count)
    const totalData = data.map(d => d.comment_count + d.repost_count + d.like_count)

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#ffffff' },
        axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } }
      },
      legend: {
        data: ['评论', '转发', '点赞', '总量'],
        textStyle: { color: isDark ? '#f3f4f6' : '#111827' },
        top: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: timeLabels,
        axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
        axisLabel: { color: isDark ? '#9ca3af' : '#6b7280' }
      },
      yAxis: {
        type: 'value',
        name: '数量',
        axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
        axisLabel: { color: isDark ? '#9ca3af' : '#6b7280' },
        splitLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } }
      },
      series: [
        {
          name: '评论',
          type: 'line',
          data: commentData,
          smooth: true,
          stack: 'engagement',
          areaStyle: { opacity: 0.3 },
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
          symbol: 'circle',
          symbolSize: 4
        },
        {
          name: '转发',
          type: 'line',
          data: repostData,
          smooth: true,
          stack: 'engagement',
          areaStyle: { opacity: 0.3 },
          lineStyle: { color: '#10b981', width: 2 },
          itemStyle: { color: '#10b981' },
          symbol: 'circle',
          symbolSize: 4
        },
        {
          name: '点赞',
          type: 'line',
          data: likeData,
          smooth: true,
          stack: 'engagement',
          areaStyle: { opacity: 0.3 },
          lineStyle: { color: '#ec4899', width: 2 },
          itemStyle: { color: '#ec4899' },
          symbol: 'circle',
          symbolSize: 4
        },
        {
          name: '总量',
          type: 'line',
          data: totalData,
          smooth: true,
          lineStyle: { color: '#f59e0b', width: 3 },
          itemStyle: { color: '#f59e0b' },
          symbol: 'circle',
          symbolSize: 6
        }
      ]
    }
  }, [data, isDark])

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-muted-foreground text-sm">暂无互动趋势数据</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-full ${className}`}
    >
      {option && <EChart option={option} opts={{ renderer: 'canvas' }} height={height} />}
    </motion.div>
  )
}

export default EngagementTrendChart
