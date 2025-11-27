'use client'

import React, { useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@sker/ui/lib/utils'
import { EChartNative } from './echart-native'
import { ChartState } from './chart-state'
import { useChinaMap, type UseChinaMapOptions } from '../../hooks/use-china-map'
import { useEChartTheme } from '../../hooks/use-echart-theme'
import type { EChartsOption } from 'echarts'

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

export interface GeoHeatMapProps {
  /** 数据点数组 */
  data: GeoDataPoint[]
  /** 图表标题 */
  title?: string
  /** 自定义类名 */
  className?: string
  /** 地图加载配置 */
  mapOptions?: UseChinaMapOptions
  /** 是否为暗色模式 */
  isDark?: boolean
  /** 颜色渐变范围 */
  colorRange?: string[]
  /** 散点大小范围 [最小值, 最大值] */
  sizeRange?: [number, number]
  /** 地图缩放级别 */
  zoom?: number
  /** 地图中心坐标 [经度, 纬度] */
  center?: [number, number]
  /** 是否显示 visualMap */
  showVisualMap?: boolean
  /** 值格式化函数 */
  formatValue?: (value: number) => string
  /** 自定义 tooltip 格式化函数 */
  formatTooltip?: (dataPoint: GeoDataPoint) => string
}

const DEFAULT_COLOR_RANGE = [
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

const SENTIMENT_COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6b7280',
} as const

/**
 * 地理热力图组件
 *
 * 在中国地图上展示地理位置数据分布，支持散点大小映射和情感色彩
 *
 * @example
 * <GeoHeatMap
 *   data={[
 *     { name: '北京', coordinates: [116.4, 39.9], value: 100, sentiment: 'positive' },
 *     { name: '上海', coordinates: [121.5, 31.2], value: 80, sentiment: 'neutral' }
 *   ]}
 *   title="用户分布"
 * />
 */
export const GeoHeatMap = React.forwardRef<HTMLDivElement, GeoHeatMapProps>(
  (
    {
      data,
      title = '地理位置分布',
      className,
      mapOptions,
      isDark: isDarkProp,
      colorRange = DEFAULT_COLOR_RANGE,
      sizeRange = [8, 30],
      zoom = 1.5,
      center = [104.114129, 37.550339],
      showVisualMap = true,
      formatValue = (v) => v.toLocaleString(),
      formatTooltip,
    },
    ref,
  ) => {
    const { mapReady, error } = useChinaMap(mapOptions)
    const { isDark, colors } = useEChartTheme({ isDark: isDarkProp })
    const internalRef = useRef<HTMLDivElement>(null)

    const option = useMemo<EChartsOption>(() => {
      if (!mapReady) return {}

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
    }, [
      data,
      title,
      mapReady,
      colors,
      isDark,
      colorRange,
      sizeRange,
      zoom,
      center,
      showVisualMap,
      formatValue,
      formatTooltip,
    ])

    return (
      <ChartState
        loading={!mapReady && !error}
        error={error || undefined}
        empty={mapReady && data.length === 0}
        loadingText="正在加载地图数据"
        emptyText="暂无地理位置数据"
        className={cn('h-full w-full', className)}
      >
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative h-full w-full overflow-hidden rounded-lg bg-card/30"
        >
          <EChartNative
            option={option}
            className="h-full w-full"
            renderer="canvas"
            animated={false}
            ref={internalRef}
          />

          {/* 装饰性渐变覆盖层 */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className={cn(
                'absolute inset-0 opacity-10',
                isDark
                  ? 'bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20'
                  : 'bg-gradient-to-br from-blue-100/30 via-transparent to-purple-100/30',
              )}
            />
          </div>
        </motion.div>
      </ChartState>
    )
  },
)

GeoHeatMap.displayName = 'GeoHeatMap'

export default GeoHeatMap
