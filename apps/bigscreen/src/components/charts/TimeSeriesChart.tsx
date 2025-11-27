import React from 'react'
import { TimeSeriesChart as BaseTimeSeriesChart } from '@sker/ui/components/ui/time-series-chart'
import type { TimeSeriesData } from '@/types'

interface TimeSeriesChartProps {
  data: TimeSeriesData[]
  title?: string
  height?: number
  className?: string
  showLegend?: boolean
  showToolbox?: boolean
}

/**
 * 时间序列图表 (bigscreen 业务层封装)
 *
 * 基于 @sker/ui 的通用组件实现,仅处理类型适配
 */
const TimeSeriesChart: React.FC<TimeSeriesChartProps> = (props) => {
  return <BaseTimeSeriesChart {...props} />
}

export default TimeSeriesChart
