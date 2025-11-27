import React from 'react'
import { GeoHeatMap, type GeoDataPoint } from '@sker/ui/components/ui/geo-heat-map'
import { LocationData } from '@/types'
import { formatNumber } from '@/utils'
import { useTheme } from '@/hooks/useTheme'

interface LocationHeatMapProps {
  data: LocationData[]
  title?: string
  className?: string
}

/**
 * 地理位置热力图
 *
 * 基于 @sker/ui/components/ui/geo-heat-map 的业务封装
 */
const LocationHeatMap: React.FC<LocationHeatMapProps> = ({
  data,
  title = '地理位置分布',
  className,
}) => {
  const { isDark } = useTheme()

  // 转换数据格式
  const geoData: GeoDataPoint[] = data.map((item) => ({
    name: item.name,
    coordinates: item.coordinates,
    value: typeof item.value === 'number' ? item.value : 0,
    sentiment: item.sentiment,
  }))

  return (
    <GeoHeatMap
      data={geoData}
      title={title}
      className={className}
      isDark={isDark}
      formatValue={formatNumber}
    />
  )
}

export default LocationHeatMap
