import React, { useMemo } from 'react'
import { cn } from '@/utils'
import { ChartState } from '@sker/ui/components/ui/chart-state'

interface KeywordTimeSeries {
  keyword: string
  timeData: Array<{
    timestamp: string
    weight: number
  }>
}

interface KeywordHeatmapChartProps {
  title?: string
  height?: number
  className?: string
  data?: KeywordTimeSeries[] | null
}

const KeywordHeatmapChart: React.FC<KeywordHeatmapChartProps> = ({
  title = '关键词-时间演变热力图',
  height = 300,
  className,
  data
}) => {
  const heatmapData = useMemo(() => {
    if (!data || data.length === 0) return null

    // 获取所有时间点（去重并排序）
    const allTimestamps = new Set<string>()
    data.forEach(series => {
      series.timeData.forEach(point => {
        allTimestamps.add(point.timestamp)
      })
    })

    const sortedTimestamps = Array.from(allTimestamps).sort()
    const keywords = data.map(d => d.keyword)

    // 构建热力图矩阵
    const maxWeight = Math.max(
      ...data.flatMap(d => d.timeData.map(p => p.weight)),
      1
    )

    const matrix: Array<{ keyword: string; values: number[] }> = data.map(series => {
      const valueMap = new Map(series.timeData.map(p => [p.timestamp, p.weight]))
      const values = sortedTimestamps.map(ts => valueMap.get(ts) || 0)
      return { keyword: series.keyword, values }
    })

    return { keywords, timestamps: sortedTimestamps, matrix, maxWeight }
  }, [data])

  const getColor = (value: number, max: number) => {
    if (value === 0) return 'rgba(107, 114, 128, 0.1)'
    const intensity = value / max
    const hue = 210 - intensity * 210 // 从蓝(210)到红(0)
    return `hsla(${hue}, 70%, 50%, ${0.3 + intensity * 0.7})`
  }

  return (
    <div className={cn('w-full h-full', className)} style={{ minHeight: height }}>
      <ChartState
        loading={false}
        error={null}
        empty={!heatmapData}
        loadingText="加载热力图数据..."
        emptyText="暂无热力图数据"
      >
        {heatmapData && (
          <div className="w-full h-full flex flex-col">
            {title && (
              <h3 className="text-foreground mb-4 font-semibold">{title}</h3>
            )}
            <div className="flex-1 overflow-auto">
              <div className="min-w-fit">
                {/* 表头：时间轴 */}
                <div className="flex border-b border-border">
                  <div className="w-24 flex-shrink-0 p-2 text-xs text-muted-foreground font-medium" />
                  {heatmapData.timestamps.map((ts, i) => (
                    <div
                      key={i}
                      className="w-12 flex-shrink-0 p-2 text-xs text-muted-foreground text-center border-l border-border"
                      title={ts}
                    >
                      {new Date(ts).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                    </div>
                  ))}
                </div>
                {/* 数据行：关键词 */}
                {heatmapData.matrix.map((row, i) => (
                  <div key={i} className="flex border-b border-border">
                    <div
                      className="w-24 flex-shrink-0 p-2 text-xs text-foreground font-medium truncate"
                      title={row.keyword}
                    >
                      {row.keyword}
                    </div>
                    {row.values.map((value, j) => (
                      <div
                        key={j}
                        className="w-12 flex-shrink-0 aspect-square border-l border-border transition-all hover:scale-110"
                        style={{
                          backgroundColor: getColor(value, heatmapData.maxWeight)
                        }}
                        title={`${row.keyword}\n${heatmapData.timestamps[j]}\n权重: ${value.toFixed(2)}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {/* 图例 */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-xs text-muted-foreground">低</span>
              <div className="w-32 h-3 rounded" style={{
                background: `linear-gradient(to right,
                  ${getColor(0, heatmapData.maxWeight)},
                  ${getColor(heatmapData.maxWeight * 0.5, heatmapData.maxWeight)},
                  ${getColor(heatmapData.maxWeight, heatmapData.maxWeight)}
                )`
              }} />
              <span className="text-xs text-muted-foreground">高</span>
            </div>
          </div>
        )}
      </ChartState>
    </div>
  )
}

export default KeywordHeatmapChart
