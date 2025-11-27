import { useEffect, useState } from 'react'
import * as echarts from 'echarts'

export interface UseChinaMapReturn {
  /** 地图是否已加载完成 */
  mapReady: boolean
  /** 加载错误信息 */
  error: string | null
}

export interface UseChinaMapOptions {
  /** 本地地图文件路径（优先级最高） */
  localPath?: string
  /** 在线地图 API URL */
  onlineUrl?: string
  /** 备用简化地图路径 */
  fallbackPath?: string
  /** 是否启用内置备用方案 */
  enableBuiltinFallback?: boolean
}

/**
 * 中国地图加载 Hook
 *
 * 提供多层级 fallback 策略加载中国地图 GeoJSON 数据：
 * 1. 本地详细地图 (localPath)
 * 2. 在线 DataV API (onlineUrl)
 * 3. 本地简化地图 (fallbackPath)
 * 4. 内置基础地图数据 (enableBuiltinFallback)
 *
 * @example
 * const { mapReady, error } = useChinaMap()
 *
 * @example
 * const { mapReady } = useChinaMap({
 *   localPath: '/maps/china-detailed.json',
 *   onlineUrl: 'https://custom-api.com/china.json'
 * })
 */
export function useChinaMap(options?: UseChinaMapOptions): UseChinaMapReturn {
  const {
    localPath = '/maps/china.json',
    onlineUrl = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
    fallbackPath = '/maps/china-simple.json',
    enableBuiltinFallback = true,
  } = options || {}

  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadMap = async () => {
      try {
        await loadFromLocal()
      } catch (localError) {
        if (cancelled) return
        try {
          await loadFromOnline()
        } catch (onlineError) {
          if (cancelled) return
          try {
            await loadFallback()
          } catch (fallbackError) {
            if (cancelled) return
            if (enableBuiltinFallback) {
              loadBuiltinFallback()
            } else {
              setError('地图加载失败')
            }
          }
        }
      }
    }

    async function loadFromLocal() {
      const response = await fetch(localPath)
      if (!response.ok) throw new Error('本地文件不存在')
      if (cancelled) return

      const geoJson = await response.json()
      if (cancelled) return

      echarts.registerMap('china', geoJson)
      setMapReady(true)
    }

    async function loadFromOnline() {
      const response = await fetch(onlineUrl)
      if (!response.ok) throw new Error(`网络请求失败: ${response.status}`)
      if (cancelled) return

      const geoJson = await response.json()
      if (cancelled) return

      echarts.registerMap('china', geoJson)
      setMapReady(true)
    }

    async function loadFallback() {
      const response = await fetch(fallbackPath)
      if (!response.ok) throw new Error('备用地图不存在')
      if (cancelled) return

      const geoJson = await response.json()
      if (cancelled) return

      echarts.registerMap('china', geoJson)
      setMapReady(true)
    }

    function loadBuiltinFallback() {
      if (cancelled) return

      const fallbackGeoJson = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: { name: '中国' },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [
                [
                  [73.66, 53.56],
                  [134.77, 53.56],
                  [134.77, 18.16],
                  [73.66, 18.16],
                  [73.66, 53.56],
                ],
              ],
            },
          },
        ],
      }

      echarts.registerMap('china', fallbackGeoJson)
      setMapReady(true)
    }

    loadMap()

    return () => {
      cancelled = true
    }
  }, [localPath, onlineUrl, fallbackPath, enableBuiltinFallback])

  return { mapReady, error }
}
