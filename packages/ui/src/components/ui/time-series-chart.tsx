'use client'

import React, { useMemo } from 'react'
import { type EChartsOption } from 'echarts-for-react'
import { EChart } from './echart'
import { useEChartTheme } from '@sker/ui/hooks/use-echart-theme'
import {
  buildTimeSeriesChartOption,
  type TimeSeriesDataItem,
} from '@sker/ui/lib/time-series-chart-option'

export type { TimeSeriesDataItem } from '@sker/ui/lib/time-series-chart-option'

export interface TimeSeriesChartProps {
  /** 数据 */
  data: TimeSeriesDataItem[]
  /** 标题 */
  title?: string
  /** 高度(px) */
  height?: number
  /** 自定义类名 */
  className?: string
  /** 是否显示图例 */
  showLegend?: boolean
  /** 是否显示工具栏 */
  showToolbox?: boolean
  /** 时间轴标签格式化 */
  timeFormatter?: (timestamp: string) => string
  /** 系列配置 */
  series?: {
    /** 总量系列名称 */
    totalLabel?: string
    /** 正面系列名称 */
    positiveLabel?: string
    /** 负面系列名称 */
    negativeLabel?: string
    /** 中性系列名称 */
    neutralLabel?: string
    /** 是否显示总量 */
    showTotal?: boolean
    /** 是否显示情感分析 */
    showSentiment?: boolean
  }
}

/**
 * 时间序列图表
 *
 * 通用的时间序列折线图组件,支持多系列数据展示
 */
export function TimeSeriesChart({
  data,
  title = '时间序列分析',
  height = 400,
  className,
  showLegend = true,
  showToolbox = true,
  timeFormatter = defaultTimeFormatter,
  series = {},
}: TimeSeriesChartProps) {
  const { colors } = useEChartTheme()

  const {
    totalLabel = '总量',
    positiveLabel = '正面',
    negativeLabel = '负面',
    neutralLabel = '中性',
    showTotal = true,
    showSentiment = true,
  } = series

  const option = useMemo<EChartsOption>(
    () =>
      buildTimeSeriesChartOption({
        data,
        title,
        totalLabel,
        positiveLabel,
        negativeLabel,
        neutralLabel,
        showTotal,
        showSentiment,
        showLegend,
        showToolbox,
        colors,
      }),
    [
      data,
      title,
      totalLabel,
      positiveLabel,
      negativeLabel,
      neutralLabel,
      showTotal,
      showSentiment,
      showLegend,
      showToolbox,
      colors,
    ]
  )

  return <EChart option={option} height={height} className={className} />
}

/**
 * 默认时间格式化函数
 */
function defaultTimeFormatter(timestamp: string): string {
  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hours}:${minutes}`
}

TimeSeriesChart.displayName = 'TimeSeriesChart'
