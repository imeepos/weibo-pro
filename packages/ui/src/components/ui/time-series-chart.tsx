'use client'

import React, { useMemo } from 'react'
import { type EChartsOption } from 'echarts-for-react'
import { EChart } from './echart'
import { useEChartTheme } from '@sker/ui/hooks/use-echart-theme'

export interface TimeSeriesDataItem {
  /** 时间戳 */
  timestamp: string
  /** 主值 */
  value: number
  /** 正面值 */
  positive?: number
  /** 负面值 */
  negative?: number
  /** 中性值 */
  neutral?: number
}

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
  const { isDark, colors } = useEChartTheme()

  const {
    totalLabel = '总量',
    positiveLabel = '正面',
    negativeLabel = '负面',
    neutralLabel = '中性',
    showTotal = true,
    showSentiment = true,
  } = series

  const option = useMemo<EChartsOption>(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: colors.textMuted,
            fontSize: 14,
          },
        },
      }
    }

    // time 类型需要 [timestamp, value] 二维数组格式
    const values: [number, number | null][] = data.map((item) => [new Date(item.timestamp).getTime(), item.value ?? null])
    const positiveValues: [number, number | null][] = data.map((item) => [new Date(item.timestamp).getTime(), item.positive ?? null])
    const negativeValues: [number, number | null][] = data.map((item) => [new Date(item.timestamp).getTime(), item.negative ?? null])
    const neutralValues: [number, number | null][] = data.map((item) => [new Date(item.timestamp).getTime(), item.neutral ?? null])

    const legendData = []
    if (showTotal) legendData.push(totalLabel)
    if (showSentiment) {
      legendData.push(positiveLabel, negativeLabel, neutralLabel)
    }

    const chartSeries = []
    if (showTotal) {
      chartSeries.push({
        name: totalLabel,
        type: 'line',
        data: values,
        smooth: true,
        connectNulls: false,
        lineStyle: {
          color: '#3b82f6',
          width: 3,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
        emphasis: {
          focus: 'series',
        },
      })
    }

    if (showSentiment) {
      chartSeries.push(
        {
          name: positiveLabel,
          type: 'line',
          data: positiveValues,
          smooth: true,
          connectNulls: false,
          lineStyle: {
            color: '#10b981',
            width: 2,
          },
          emphasis: {
            focus: 'series',
          },
        },
        {
          name: negativeLabel,
          type: 'line',
          data: negativeValues,
          smooth: true,
          connectNulls: false,
          lineStyle: {
            color: '#ef4444',
            width: 2,
          },
          emphasis: {
            focus: 'series',
          },
        },
        {
          name: neutralLabel,
          type: 'line',
          data: neutralValues,
          smooth: true,
          connectNulls: false,
          lineStyle: {
            color: '#6b7280',
            width: 2,
          },
          emphasis: {
            focus: 'series',
          },
        },
      )
    }

    const xAxisConfig = {
      type: 'time' as const,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: colors.border,
        },
      },
      axisLabel: {
        color: colors.text,
        formatter: (value: any) => {
          const numValue = typeof value === 'number' ? value : new Date(value).getTime();
          const date = new Date(numValue)
          const month = date.getMonth() + 1
          const day = date.getDate()
          const hours = date.getHours()
          const minutes = date.getMinutes().toString().padStart(2, '0')
          return `${month}/${day} ${hours}:${minutes}`
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: colors.splitLine,
          type: 'dashed',
        },
      },
    }

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          color: colors.text,
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: {
          color: colors.text,
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return ''

          // 格式化时间戳
          const timestamp = params[0].axisValue
          const date = new Date(typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime())
          const month = date.getMonth() + 1
          const day = date.getDate()
          const hours = date.getHours()
          const minutes = date.getMinutes().toString().padStart(2, '0')
          const timeLabel = `${month}/${day} ${hours}:${minutes}`

          let result = `<div style="margin-bottom: 8px; font-weight: bold;">${timeLabel}</div>`
          params.forEach((param: any) => {
            const { color, value, seriesName } = param
            // value 是 [timestamp, value] 数组，取第二个元素
            const displayValue = Array.isArray(value) ? value[1] : value
            result += `
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-right: 8px;"></span>
                <span style="margin-right: 8px;">${seriesName}:</span>
                <span style="font-weight: bold;">${displayValue}</span>
              </div>
            `
          })
          return result
        },
      },
      legend: showLegend
        ? {
            data: legendData,
            top: 30,
            textStyle: {
              color: colors.text,
            },
          }
        : undefined,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: showLegend ? '15%' : '10%',
        containLabel: true,
      },
      toolbox: showToolbox
        ? {
            feature: {
              saveAsImage: {
                backgroundColor: colors.chartBg,
              },
              dataZoom: {
                yAxisIndex: 'none',
              },
              restore: {},
              magicType: {
                type: ['line', 'bar'],
              },
            },
            iconStyle: {
              borderColor: colors.toolbox,
            },
            emphasis: {
              iconStyle: {
                borderColor: colors.emphasis,
              },
            },
          }
        : undefined,
      xAxis: xAxisConfig,
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: colors.border,
          },
        },
        axisLabel: {
          color: colors.text,
        },
        splitLine: {
          lineStyle: {
            color: colors.splitLine,
            type: 'dashed',
          },
        },
      },
      series: chartSeries,
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    }
  }, [
    data,
    title,
    showLegend,
    showToolbox,
    timeFormatter,
    colors,
    totalLabel,
    positiveLabel,
    negativeLabel,
    neutralLabel,
    showTotal,
    showSentiment,
  ])

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
