import React, { useMemo } from 'react'
import { cn } from '@/utils'
import { ChartState } from '@sker/ui/components/ui/chart-state'
import * as echarts from 'echarts'

interface SentimentIntensityData {
  confidence: number
  count: number
}

interface SentimentIntensityChartProps {
  title?: string
  height?: number
  className?: string
  data?: SentimentIntensityData[] | null
}

const SentimentIntensityChart: React.FC<SentimentIntensityChartProps> = ({
  title = '情感强度谱',
  height = 300,
  className,
  data
}) => {
  const chartRef = React.useRef<HTMLDivElement>(null)
  const chartInstance = React.useRef<echarts.ECharts | null>(null)

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(d => ({
      name: `${d.confidence.toFixed(1)}`,
      value: d.count
    }))
  }, [data])

  const option = useMemo(() => {
    if (chartData.length === 0) return {}

    const maxValue = Math.max(...chartData.map(d => d.value))

    return {
      grid: {
        left: '5%',
        right: '5%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const param = params[0]
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">置信度: ${param.name}</div>
              <div>数量: <span style="font-weight: bold;">${param.value}</span></div>
              <div>占比: <span style="font-weight: bold;">${((param.value / maxValue) * 100).toFixed(1)}%</span></div>
            </div>
          `
        }
      },
      xAxis: {
        type: 'category',
        name: '置信度',
        nameLocation: 'middle',
        nameGap: 25,
        data: chartData.map(d => d.name),
        axisLine: { lineStyle: { color: '#6b7280' } },
        axisLabel: { color: '#9ca3af', rotate: 0 }
      },
      yAxis: {
        type: 'value',
        name: '数量',
        nameLocation: 'middle',
        nameGap: 40,
        axisLine: { lineStyle: { color: '#6b7280' } },
        axisLabel: { color: '#9ca3af' },
        splitLine: { lineStyle: { color: '#374151', type: 'dashed' } }
      },
      series: [{
        type: 'bar',
        data: chartData.map(d => ({
          value: d.value,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#8b5cf6' },
              { offset: 1, color: '#6366f1' }
            ])
          }
        })),
        barWidth: '60%',
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#a78bfa' },
              { offset: 1, color: '#818cf8' }
            ])
          }
        }
      }]
    }
  }, [chartData])

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
        loadingText="加载情感强度数据..."
        emptyText="暂无情感强度数据"
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

export default SentimentIntensityChart
