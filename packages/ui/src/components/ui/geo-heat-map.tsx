'use client'

import React, { useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@sker/ui/lib/utils'
import { EChartNative } from './echart-native'
import { ChartState } from './chart-state'
import { useChinaMap, type UseChinaMapOptions } from '../../hooks/use-china-map'
import { useEChartTheme } from '../../hooks/use-echart-theme'
import {
  buildGeoHeatMapOption,
  DEFAULT_COLOR_RANGE,
  type GeoDataPoint,
} from '@sker/ui/lib/geo-heat-map-option'

export type { GeoDataPoint } from '@sker/ui/lib/geo-heat-map-option'

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

    const option = useMemo(() => {
      if (!mapReady) return {}
      return buildGeoHeatMapOption({
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
      })
    }, [
      mapReady,
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
