import { GeoHeatMap, type GeoDataPoint } from '@sker/ui/components/ui/geo-heat-map'
import { useState } from 'react'
import { majorCities, sentimentData } from './data'

export const LoadingStateRender = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<GeoDataPoint[]>([])

  useState(() => {
    const timer = setTimeout(() => {
      setLoading(false)
      setData(majorCities)
    }, 3000)
    return () => clearTimeout(timer)
  })

  return (
    <div style={{ height: '100%' }}>
      {loading ? (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>正在加载地图数据...</div>
        </div>
      ) : (
        <GeoHeatMap data={data} title="加载完成" />
      )}
    </div>
  )
}

export const InteractiveDemoRender = () => {
  const [zoom, setZoom] = useState(1.5)
  const [isDark, setIsDark] = useState(false)
  const [showVisualMap, setShowVisualMap] = useState(true)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '12px',
        background: '#f3f4f6',
        borderRadius: '8px',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          缩放:
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ width: '150px' }}
          />
          <span>{zoom.toFixed(1)}</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={isDark}
            onChange={(e) => setIsDark(e.target.checked)}
          />
          暗色模式
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={showVisualMap}
            onChange={(e) => setShowVisualMap(e.target.checked)}
          />
          显示 VisualMap
        </label>
      </div>

      <div style={{ flex: 1 }}>
        <GeoHeatMap
          data={sentimentData}
          title="交互式演示"
          zoom={zoom}
          isDark={isDark}
          showVisualMap={showVisualMap}
        />
      </div>
    </div>
  )
}

export const RealTimeUpdateRender = () => {
  const [data, setData] = useState(majorCities)

  useState(() => {
    const interval = setInterval(() => {
      setData(prev => prev.map(city => ({
        ...city,
        value: Math.floor(Math.random() * 2000),
        sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as any,
      })))
    }, 2000)

    return () => clearInterval(interval)
  })

  return (
    <GeoHeatMap
      data={data}
      title="实时数据更新（每2秒）"
    />
  )
}
