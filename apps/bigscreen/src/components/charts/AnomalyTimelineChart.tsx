import React from 'react'
import { EChart } from '@sker/ui/components/ui/echart'
import { motion } from 'framer-motion'
import { cn } from '@/utils'
import { useTheme } from '@/hooks/useTheme'

interface AnomalyDataPoint {
  timestamp: string
  type: 'spike' | 'drop' | 'sentiment_shift'
  metric: string
  value: number
  expected: number
  confidence: number
}

interface AnomalyTimelineChartProps {
  data: AnomalyDataPoint[]
  height?: number
  minHeight?: number
  className?: string
}

/**
 * 异常时间线图 - 在时间轴上标记异常点
 * 基于异常检测数据 (EventAnomaly)
 */
const AnomalyTimelineChart: React.FC<AnomalyTimelineChartProps> = ({
  data,
  height,
  minHeight = 200,
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

    // 按类型分组
    const spikeData: [number, number][] = []
    const dropData: [number, number][] = []
    const sentimentData: [number, number][] = []

    data.forEach((item, index) => {
      const yValue = item.value
      if (item.type === 'spike') {
        spikeData.push([index, yValue])
      } else if (item.type === 'drop') {
        dropData.push([index, yValue])
      } else {
        sentimentData.push([index, yValue])
      }
    })

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#ffffff' },
        formatter: (params: any) => {
          if (params.data) {
            const index = params.data[0]
            const anomaly = data[index]
            if (anomaly) {
              const typeLabel = anomaly.type === 'spike' ? '峰值' : anomaly.type === 'drop' ? '低谷' : '情感变化'
              return `
                <div class="font-semibold mb-1">${typeLabel}</div>
                <div>时间: ${timeLabels[index]}</div>
                <div>指标: ${anomaly.metric}</div>
                <div>数值: ${anomaly.value}</div>
                <div>预期: ${anomaly.expected}</div>
                <div>置信度: ${Math.round(anomaly.confidence * 100)}%</div>
              `
            }
          }
          return ''
        }
      },
      legend: {
        show: true,
        data: ['峰值', '低谷', '情感变化'],
        top: 0,
        left: 'center',
        itemWidth: 20,
        itemHeight: 14,
        textStyle: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 12
        },
        selectedMode: false
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
          interval: 'auto',
          rotate: 30
        }
      },
      yAxis: {
        type: 'value',
        name: '数值',
        axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
        axisLabel: { color: isDark ? '#9ca3af' : '#6b7280' },
        splitLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } }
      },
      series: [
        {
          name: '峰值',
          type: 'effectScatter',
          data: spikeData,
          symbolSize: (val: [number, number]) => Math.max(10, Math.min(30, val[1] / 10)),
          itemStyle: {
            color: '#ef4444',
            shadowBlur: 10,
            shadowColor: 'rgba(239, 68, 68, 0.5)'
          },
          label: {
            show: true,
            position: 'top',
            formatter: () => '▲',
            color: '#ef4444',
            fontSize: 14
          }
        },
        {
          name: '低谷',
          type: 'effectScatter',
          data: dropData,
          symbolSize: (val: [number, number]) => Math.max(10, Math.min(30, val[1] / 10)),
          itemStyle: {
            color: '#f59e0b',
            shadowBlur: 10,
            shadowColor: 'rgba(245, 158, 11, 0.5)'
          },
          label: {
            show: true,
            position: 'bottom',
            formatter: () => '▼',
            color: '#f59e0b',
            fontSize: 14
          }
        },
        {
          name: '情感变化',
          type: 'effectScatter',
          data: sentimentData,
          symbolSize: (val: [number, number]) => Math.max(10, Math.min(30, Math.abs(val[1]) * 50)),
          itemStyle: {
            color: '#3b82f6',
            shadowBlur: 10,
            shadowColor: 'rgba(59, 130, 246, 0.5)'
          },
          label: {
            show: true,
            position: 'right',
            formatter: () => '◆',
            color: '#3b82f6',
            fontSize: 14
          }
        }
      ]
    }
  }, [data, isDark])

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height, minHeight }}>
        <p className="text-muted-foreground text-sm">暂无异常检测数据</p>
      </div>
    )
  }

  return (
    <EChart
      option={option}
      height={height} className={className}
    />
  )
}

export default AnomalyTimelineChart
