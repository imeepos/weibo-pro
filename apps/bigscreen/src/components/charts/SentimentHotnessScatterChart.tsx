import React, { useMemo } from 'react'
import { cn } from '@/utils'
import { ChartState } from '@sker/ui/components/ui/chart-state'
import * as echarts from 'echarts'
import { useChartTheme } from '@/hooks/useChartConfig'

interface SentimentHotnessData {
  postId: string
  sentimentScore: number
  hotness: number
  timestamp: string
}

interface SentimentHotnessScatterChartProps {
  title?: string
  height?: number
  className?: string
  data?: SentimentHotnessData[] | null
}

const SentimentHotnessScatterChart: React.FC<SentimentHotnessScatterChartProps> = ({
  title = '情感-热度关联分析',
  height = 300,
  className,
  data
}) => {
  const chartRef = React.useRef<HTMLDivElement>(null)
  const chartInstance = React.useRef<echarts.ECharts | null>(null)
  const chartTheme = useChartTheme()

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(d => ({
      value: [d.sentimentScore, d.hotness],
      timestamp: d.timestamp,
      postId: d.postId
    }))
  }, [data])

  const option = useMemo(() => {
    if (chartData.length === 0) return {}

    const { sentimentColors, axisStyle, tooltipStyle } = chartTheme

    return {
      grid: {
        left: '10%',
        right: '5%',
        bottom: '15%',
        top: '10%'
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: tooltipStyle.backgroundColor,
        borderColor: tooltipStyle.borderColor,
        textStyle: { color: tooltipStyle.textColor },
        formatter: (params: any) => {
          const data = params.data as { value: number[]; timestamp: string; postId: string }
          const sentimentColor = data.value[0] > 0 ? sentimentColors.positive : data.value[0] < 0 ? sentimentColors.negative : sentimentColors.neutral
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">帖子 ${data.postId.slice(-6)}</div>
              <div>情感值: <span style="color: ${sentimentColor}; font-weight: bold;">${data.value[0].toFixed(2)}</span></div>
              <div>热度: <span style="font-weight: bold;">${data.value[1].toFixed(2)}</span></div>
              <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">${new Date(data.timestamp).toLocaleString('zh-CN')}</div>
            </div>
          `
        }
      },
      xAxis: {
        type: 'value',
        name: '情感值',
        nameLocation: 'middle',
        nameGap: 25,
        min: -1,
        max: 1,
        axisLine: { lineStyle: { color: axisStyle.lineColor } },
        axisLabel: { color: axisStyle.labelColor },
        splitLine: { lineStyle: { color: axisStyle.splitLineColor, type: 'dashed' } }
      },
      yAxis: {
        type: 'value',
        name: '热度',
        nameLocation: 'middle',
        nameGap: 40,
        axisLine: { lineStyle: { color: axisStyle.lineColor } },
        axisLabel: { color: axisStyle.labelColor },
        splitLine: { lineStyle: { color: axisStyle.splitLineColor, type: 'dashed' } }
      },
      series: [{
        type: 'scatter',
        symbolSize: (val: number[]) => Math.max(6, Math.min(20, val[1] * 1.5)),
        itemStyle: {
          color: (params: any) => {
            const sentiment = params.data.value[0]
            if (sentiment > 0.2) return sentimentColors.positive
            if (sentiment < -0.2) return sentimentColors.negative
            return sentimentColors.neutral
          },
          opacity: 0.7
        },
        data: chartData
      }],
      visualMap: {
        show: false,
        min: -1,
        max: 1,
        inRange: {
          color: [sentimentColors.negative, sentimentColors.neutral, sentimentColors.positive]
        }
      }
    }
  }, [chartData, chartTheme])

  React.useEffect(() => {
    if (!chartRef.current) return

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    if (Object.keys(option).length > 0) {
      chartInstance.current.setOption(option)
    }

    const handleResize = () => {
      chartInstance.current?.resize()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [option])

  React.useEffect(() => {
    return () => {
      chartInstance.current?.dispose()
    }
  }, [])

  return (
    <div className={cn('w-full h-full', className)} style={{ minHeight: height }}>
      <ChartState
        loading={false}
        error={null}
        empty={!data || data.length === 0}
        loadingText="加载散点图数据..."
        emptyText="暂无散点图数据"
      >
        <div className="w-full h-full flex flex-col">
          {title && (
            <h3 className="text-foreground mb-4 font-semibold">{title}</h3>
          )}
          <div ref={chartRef} className="flex-1 min-h-0" />
        </div>
      </ChartState>
    </div>
  )
}

export default SentimentHotnessScatterChart
