import React, { useMemo } from 'react'
import { cn } from '@/utils'
import { ChartState } from '@sker/ui/components/ui/chart-state'
import * as echarts from 'echarts'
import type { KOLAnalysisResult, KOLData } from '@sker/sdk'

interface KOLBubbleChartProps {
  title?: string
  height?: number
  className?: string
  data?: KOLAnalysisResult | null
}

const KOLBubbleChart: React.FC<KOLBubbleChartProps> = ({
  title = 'KOL 影响力分布',
  height = 500,
  className,
  data
}) => {
  const chartRef = React.useRef<HTMLDivElement>(null)
  const chartInstance = React.useRef<echarts.ECharts | null>(null)

  // 转换数据为 ECharts 气泡图格式
  const chartData = useMemo(() => {
    if (!data || data.topKOLs.length === 0) return []
    return data.topKOLs.map((kol: KOLData) => ({
      value: [kol.followers, kol.engagementRate * 100, kol.influenceScore],
      name: kol.screenName,
      userId: kol.userId,
      influenceScore: kol.influenceScore,
      followers: kol.followers,
      engagementRate: kol.engagementRate,
      sentimentImpact: kol.sentimentImpact
    }))
  }, [data])

  const option = useMemo(() => {
    if (chartData.length === 0) return {}

    return {
      grid: {
        left: '12%',
        right: '8%',
        bottom: '15%',
        top: '15%'
      },
      title: {
        text: title,
        left: 'center',
        top: 10,
        textStyle: {
          color: '#e5e7eb',
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const kol = params.data as any
          return `
            <div style="padding: 12px; min-width: 200px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #e5e7eb;">
                ${kol.name}
              </div>
              <div style="margin-bottom: 4px; color: #9ca3af;">
                影响力得分: <span style="color: #fbbf24; font-weight: bold;">${kol.influenceScore.toFixed(2)}</span>
              </div>
              <div style="margin-bottom: 4px; color: #9ca3af;">
                粉丝数: <span style="color: #60a5fa; font-weight: bold;">${(kol.followers / 10000).toFixed(2)}万</span>
              </div>
              <div style="margin-bottom: 4px; color: #9ca3af;">
                互动率: <span style="color: #34d399; font-weight: bold;">${(kol.engagementRate * 100).toFixed(3)}%</span>
              </div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 8px;">
                气泡大小表示影响力
              </div>
            </div>
          `
        }
      },
      xAxis: {
        type: 'log',
        name: '粉丝数',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: '#9ca3af',
          fontSize: 12
        },
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: {
          color: '#9ca3af',
          formatter: (value: number) => {
            if (value >= 10000) return `${(value / 10000).toFixed(0)}w`
            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
            return value.toString()
          }
        },
        splitLine: { lineStyle: { color: '#374151', type: 'dashed' } }
      },
      yAxis: {
        type: 'value',
        name: '互动率 (%)',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: '#9ca3af',
          fontSize: 12
        },
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: {
          color: '#9ca3af',
          formatter: '{value}%'
        },
        splitLine: { lineStyle: { color: '#374151', type: 'dashed' } }
      },
      series: [{
        type: 'scatter',
        symbolSize: (data: number[]) => {
          // 气泡大小基于影响力得分 (0-10)，映射到 10-60px
          const influenceScore = data[2]
          return Math.max(10, Math.min(60, influenceScore * 6))
        },
        itemStyle: {
          color: (params: any) => {
            const influenceScore = params.data.value[2]
            if (influenceScore >= 7) return 'rgba(251, 191, 36, 0.7)' // 高影响力：金色
            if (influenceScore >= 4) return 'rgba(96, 165, 250, 0.7)' // 中影响力：蓝色
            return 'rgba(156, 163, 175, 0.7)' // 低影响力：灰色
          },
          borderColor: (params: any) => {
            const influenceScore = params.data.value[2]
            if (influenceScore >= 7) return '#fbbf24'
            if (influenceScore >= 4) return '#60a5fa'
            return '#9ca3af'
          },
          borderWidth: 2
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 3,
            opacity: 1
          }
        },
        data: chartData
      }],
      visualMap: {
        show: false,
        min: 0,
        max: 10,
        inRange: {
          symbolSize: [10, 60]
        }
      },
      legend: {
        data: [
          { name: '高影响力 (≥7)', icon: 'circle', itemStyle: { color: '#fbbf24' } },
          { name: '中影响力 (4-7)', icon: 'circle', itemStyle: { color: '#60a5fa' } },
          { name: '低影响力 (<4)', icon: 'circle', itemStyle: { color: '#9ca3af' } }
        ],
        top: 40,
        right: 20,
        textStyle: {
          color: '#9ca3af',
          fontSize: 11
        }
      }
    }
  }, [chartData, title])

  // 统计信息
  const statistics = useMemo(() => {
    if (!data || data.topKOLs.length === 0) return null

    const highInfluence = data.topKOLs.filter(kol => kol.influenceScore >= 7).length
    const mediumInfluence = data.topKOLs.filter(kol => kol.influenceScore >= 4 && kol.influenceScore < 7).length
    const lowInfluence = data.topKOLs.filter(kol => kol.influenceScore < 4).length

    return {
      total: data.topKOLs.length,
      highInfluence,
      mediumInfluence,
      lowInfluence,
      paretoIndex: data.paretoIndex,
      kolContributionRatio: data.kolContributionRatio
    }
  }, [data])

  // 初始化图表
  React.useEffect(() => {
    if (!chartRef.current) return

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    chartInstance.current.setOption(option)

    const handleResize = () => {
      chartInstance.current?.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [option])

  // 清理
  React.useEffect(() => {
    return () => {
      chartInstance.current?.dispose()
    }
  }, [])

  if (!data || data.topKOLs.length === 0) {
    return (
      <div className={cn('w-full bg-gray-900/50 rounded-lg', className)} style={{ height }}>
        <ChartState empty emptyText="暂无 KOL 数据" />
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      {/* 统计信息面板 */}
      {statistics && (
        <div className="absolute top-16 left-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-2">统计信息</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span className="text-gray-400">高影响力:</span>
              <span className="text-yellow-400 font-bold">{statistics.highInfluence}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <span className="text-gray-400">中影响力:</span>
              <span className="text-blue-400 font-bold">{statistics.mediumInfluence}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-400">低影响力:</span>
              <span className="text-gray-400 font-bold">{statistics.lowInfluence}</span>
            </div>
            <div className="border-t border-gray-700 pt-1 mt-1">
              <div className="text-gray-400">帕累托指数: <span className="text-green-400 font-bold">{(statistics.paretoIndex * 100).toFixed(1)}%</span></div>
              <div className="text-gray-400">KOL 贡献: <span className="text-purple-400 font-bold">{(statistics.kolContributionRatio * 100).toFixed(1)}%</span></div>
            </div>
          </div>
        </div>
      )}

      {/* 图表容器 */}
      <div ref={chartRef} className="w-full h-full" />
    </div>
  )
}

export default KOLBubbleChart
