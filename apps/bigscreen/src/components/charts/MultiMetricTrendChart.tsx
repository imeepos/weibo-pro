import React from 'react'
import { EChart } from '@sker/ui/components/ui/echart'
import { motion } from 'framer-motion'
import { useTheme } from '@/hooks/useTheme'

interface MultiMetricTrendDataPoint {
  timestamp: string
  post_count: number
  user_count: number
  hotness: number
  engagement_rate?: number
  sentiment_positive?: number
  sentiment_negative?: number
  sentiment_neutral?: number
}

interface MultiMetricTrendChartProps {
  data: MultiMetricTrendDataPoint[]
  height?: number
  className?: string
}

/**
 * 多指标时间序列图 - 帖子数、用户数、热度值双Y轴展示
 * 基于小时级统计数据 (EventHourlyStatisticsEntity)
 */
const MultiMetricTrendChart: React.FC<MultiMetricTrendChartProps> = ({
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

    const postData = data.map(d => d.post_count)
    const userData = data.map(d => d.user_count)
    const hotnessData = data.map(d => d.hotness)

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#ffffff' },
        axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } }
      },
      legend: {
        data: ['帖子数', '用户数', '热度值'],
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
      yAxis: [
        {
          type: 'value',
          name: '数量',
          position: 'left',
          axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
          axisLabel: { color: isDark ? '#9ca3af' : '#6b7280' },
          splitLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } }
        },
        {
          type: 'value',
          name: '热度',
          position: 'right',
          axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
          axisLabel: { color: isDark ? '#9ca3af' : '#6b7280' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '帖子数',
          type: 'bar',
          yAxisIndex: 0,
          data: postData,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.8)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.3)' }
              ]
            }
          }
        },
        {
          name: '用户数',
          type: 'line',
          yAxisIndex: 0,
          data: userData,
          smooth: true,
          lineStyle: { color: '#8b5cf6', width: 2 },
          itemStyle: { color: '#8b5cf6' },
          symbol: 'circle',
          symbolSize: 4,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(139, 92, 246, 0.3)' },
                { offset: 1, color: 'rgba(139, 92, 246, 0.05)' }
              ]
            }
          }
        },
        {
          name: '热度值',
          type: 'line',
          yAxisIndex: 1,
          data: hotnessData,
          smooth: true,
          lineStyle: { color: '#ef4444', width: 3 },
          itemStyle: { color: '#ef4444' },
          symbol: 'circle',
          symbolSize: 6
        }
      ]
    }
  }, [data, isDark])

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-muted-foreground text-sm">暂多指标趋势数据</p>
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

export default MultiMetricTrendChart
