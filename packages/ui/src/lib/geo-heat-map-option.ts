import type { EChartsOption } from 'echarts'
import type { EChartThemeColors } from '@sker/ui/hooks/use-echart-theme'

export interface GeoDataPoint {
  /** 地点名称 */
  name: string
  /** 坐标 [经度, 纬度] */
  coordinates: [number, number]
  /** 数值 */
  value: number
  /** 情感倾向(可选) */
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export interface GeoHeatMapOptionConfig {
  /** 数据点数组 */
  data: GeoDataPoint[]
  /** 图表标题 */
  title: string
  /** 主题颜色 */
  colors: EChartThemeColors
  /** 是否为暗色模式 */
  isDark: boolean
  /** 颜色渐变范围 */
  colorRange: string[]
  /** 散点大小范围 [最小值, 最大值] */
  sizeRange: [number, number]
  /** 地图缩放级别 */
  zoom: number
  /** 地图中心坐标 [经度, 纬度] */
  center: [number, number]
  /** 是否显示 visualMap */
  showVisualMap: boolean
  /** 值格式化函数 */
  formatValue: (value: number) => string
  /** 自定义 tooltip 格式化函数 */
  formatTooltip?: (dataPoint: GeoDataPoint) => string
}

export const DEFAULT_COLOR_RANGE = [
  '#bbf7d0',
  '#86efac',
  '#4ade80',
  '#22c55e',
  '#16a34a',
  '#15803d',
  '#166534',
  '#1e40af',
  '#1d4ed8',
  '#1e3a8a',
]

export const SENTIMENT_COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6b7280',
} as const

export function buildGeoHeatMapOption({
  data,
  title,
  colors,
  isDark,
  colorRange,
  sizeRange,
  zoom,
  center,
  showVisualMap,
  formatValue,
  formatTooltip,
}: GeoHeatMapOptionConfig): EChartsOption {
  const processedData = data.map((item) => ({
    name: item.name,
    value: [...item.coordinates, item.value],
    sentiment: item.sentiment,
  }))

  const values = data.map((item) => item.value).filter((v) => !isNaN(v))
  const maxValue = values.length > 0 ? Math.max(...values, 1) : 1

  return {
    title: title
      ? {
        text: title,
        left: 'center',
        top: 20,
        textStyle: {
          color: colors.text,
          fontSize: 16,
          fontWeight: 'bold',
        },
      }
      : undefined,
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      borderWidth: 1,
      borderRadius: 8,
      textStyle: {
        color: colors.text,
      },
      formatter: (params: any) => {
        const item = data.find((d) => d.name === params.name)
        if (!item) return ''

        if (formatTooltip) {
          return formatTooltip(item)
        }

        const sentimentText =
          item.sentiment === 'positive'
            ? '正面'
            : item.sentiment === 'negative'
              ? '负面'
              : '中性'
        const sentimentColor = item.sentiment
          ? SENTIMENT_COLORS[item.sentiment]
          : SENTIMENT_COLORS.neutral

        return `
          <div style="font-weight: bold; margin-bottom: 8px;">${params.name}</div>
          <div style="margin-bottom: 4px;">
            数量: <span style="font-weight: bold;">${formatValue(params.value[2])}</span>
          </div>
          <div style="margin-bottom: 4px;">
            坐标: <span style="font-family: monospace;">${params.value[0].toFixed(2)}, ${params.value[1].toFixed(2)}</span>
          </div>
          ${item.sentiment
            ? `<div>
              情感倾向: <span style="color: ${sentimentColor}; font-weight: bold;">${sentimentText}</span>
            </div>`
            : ''
          }
        `
      },
    },
    geo: {
      map: 'china',
      roam: true,
      zoom,
      center,
      itemStyle: {
        areaColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      emphasis: {
        itemStyle: {
          areaColor: isDark ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.4)',
          borderColor: 'transparent',
          borderWidth: 0,
        },
      },
      label: {
        show: false,
        color: colors.text,
      },
    },
    ...(showVisualMap && data.length > 0
      ? {
        visualMap: {
          min: 0,
          max: maxValue,
          left: 'left',
          top: 'bottom',
          text: ['高', '低'],
          textStyle: {
            color: colors.text,
          },
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 6,
          padding: [8, 12],
          inRange: {
            color: colorRange,
          },
          calculable: true,
        },
      }
      : {}),
    series: [
      {
        name: '散点分布',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: processedData.map((item) => ({
          name: item.name,
          value: item.value,
          symbolSize: (() => {
            const value = typeof item.value[2] === 'number' ? item.value[2] : 0
            const ratio = maxValue > 0 ? value / maxValue : 0
            const size = Math.max(
              sizeRange[0],
              Math.min(sizeRange[1], ratio * sizeRange[1]),
            )
            return isNaN(size) ? sizeRange[0] : size
          })(),
          itemStyle: {
            color: item.sentiment
              ? SENTIMENT_COLORS[item.sentiment]
              : SENTIMENT_COLORS.neutral,
            opacity: 0.8,
          },
        })),
        symbol: 'circle',
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
  }
}
