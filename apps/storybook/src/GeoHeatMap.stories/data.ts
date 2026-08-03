import type { GeoDataPoint } from '@sker/ui/components/ui/geo-heat-map'

/**
 * GeoHeatMap stories 的 mock 地理数据
 * 与业务无关，仅用于展示地图热力图的渲染效果。
 */

// 中国主要城市地理坐标
export const majorCities: GeoDataPoint[] = [
  { name: '北京', coordinates: [116.4074, 39.9042], value: 1580, sentiment: 'neutral' },
  { name: '上海', coordinates: [121.4737, 31.2304], value: 1420, sentiment: 'positive' },
  { name: '广州', coordinates: [113.2644, 23.1291], value: 980, sentiment: 'positive' },
  { name: '深圳', coordinates: [114.0579, 22.5431], value: 1200, sentiment: 'positive' },
  { name: '成都', coordinates: [104.0668, 30.5728], value: 850, sentiment: 'neutral' },
  { name: '杭州', coordinates: [120.1551, 30.2741], value: 920, sentiment: 'positive' },
  { name: '重庆', coordinates: [106.5516, 29.5630], value: 760, sentiment: 'neutral' },
  { name: '西安', coordinates: [108.9398, 34.3416], value: 680, sentiment: 'neutral' },
  { name: '武汉', coordinates: [114.3055, 30.5931], value: 790, sentiment: 'negative' },
  { name: '南京', coordinates: [118.7969, 32.0603], value: 640, sentiment: 'positive' },
]

export const allCities: GeoDataPoint[] = [
  ...majorCities,
  { name: '天津', coordinates: [117.2010, 39.0842], value: 580, sentiment: 'neutral' },
  { name: '苏州', coordinates: [120.5954, 31.2989], value: 520, sentiment: 'positive' },
  { name: '郑州', coordinates: [113.6254, 34.7466], value: 480, sentiment: 'neutral' },
  { name: '长沙', coordinates: [112.9388, 28.2282], value: 450, sentiment: 'positive' },
  { name: '沈阳', coordinates: [123.4328, 41.8045], value: 420, sentiment: 'neutral' },
  { name: '青岛', coordinates: [120.3826, 36.0671], value: 490, sentiment: 'positive' },
  { name: '宁波', coordinates: [121.5440, 29.8683], value: 380, sentiment: 'positive' },
  { name: '昆明', coordinates: [102.8329, 24.8801], value: 360, sentiment: 'neutral' },
  { name: '厦门', coordinates: [118.0894, 24.4798], value: 340, sentiment: 'positive' },
  { name: '大连', coordinates: [121.6147, 38.9140], value: 320, sentiment: 'neutral' },
  { name: '合肥', coordinates: [117.2272, 31.8206], value: 310, sentiment: 'neutral' },
  { name: '济南', coordinates: [117.1205, 36.6519], value: 300, sentiment: 'neutral' },
  { name: '哈尔滨', coordinates: [126.6433, 45.7570], value: 280, sentiment: 'negative' },
  { name: '福州', coordinates: [119.2965, 26.0745], value: 270, sentiment: 'neutral' },
  { name: '长春', coordinates: [125.3245, 43.8171], value: 260, sentiment: 'neutral' },
]

export const sentimentData: GeoDataPoint[] = [
  { name: '深圳', coordinates: [114.0579, 22.5431], value: 1500, sentiment: 'positive' },
  { name: '上海', coordinates: [121.4737, 31.2304], value: 1400, sentiment: 'positive' },
  { name: '杭州', coordinates: [120.1551, 30.2741], value: 1200, sentiment: 'positive' },
  { name: '广州', coordinates: [113.2644, 23.1291], value: 1100, sentiment: 'positive' },
  { name: '成都', coordinates: [104.0668, 30.5728], value: 900, sentiment: 'neutral' },
  { name: '北京', coordinates: [116.4074, 39.9042], value: 850, sentiment: 'neutral' },
  { name: '西安', coordinates: [108.9398, 34.3416], value: 700, sentiment: 'neutral' },
  { name: '武汉', coordinates: [114.3055, 30.5931], value: 600, sentiment: 'negative' },
  { name: '郑州', coordinates: [113.6254, 34.7466], value: 500, sentiment: 'negative' },
  { name: '哈尔滨', coordinates: [126.6433, 45.7570], value: 400, sentiment: 'negative' },
]

/** 京津冀地区热度（RegionalFocus 示例） */
export const regionalCities: GeoDataPoint[] = [
  { name: '北京', coordinates: [116.4074, 39.9042], value: 1580 },
  { name: '天津', coordinates: [117.2010, 39.0842], value: 680 },
  { name: '石家庄', coordinates: [114.5149, 38.0428], value: 420 },
  { name: '唐山', coordinates: [118.1752, 39.6304], value: 350 },
  { name: '保定', coordinates: [115.4648, 38.8738], value: 280 },
]

/** 最大数据点展示（MaximumDataPoints 示例） */
export const maximumCities: GeoDataPoint[] = [
  ...allCities,
  { name: '太原', coordinates: [112.5489, 37.8706], value: 250 },
  { name: '石家庄', coordinates: [114.5149, 38.0428], value: 240 },
  { name: '南昌', coordinates: [115.8581, 28.6832], value: 230 },
  { name: '贵阳', coordinates: [106.7135, 26.5783], value: 220 },
  { name: '南宁', coordinates: [108.3661, 22.8172], value: 210 },
  { name: '兰州', coordinates: [103.8343, 36.0611], value: 200 },
  { name: '乌鲁木齐', coordinates: [87.6168, 43.8256], value: 190 },
  { name: '银川', coordinates: [106.2586, 38.4680], value: 180 },
  { name: '呼和浩特', coordinates: [111.7498, 40.8424], value: 170 },
  { name: '拉萨', coordinates: [91.1145, 29.6544], value: 160 },
]

/** 自定义 Tooltip（CustomTooltip 示例） */
export const formatTooltip = (point: GeoDataPoint): string => {
  const trend = point.value > 1000 ? '↑ 上升' : point.value > 500 ? '→ 平稳' : '↓ 下降'
  const level = point.value > 1000 ? '高' : point.value > 500 ? '中' : '低'

  return `
    <div style="padding: 12px;">
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #3b82f6;">
        ${point.name}
      </div>
      <div style="margin-bottom: 4px;">
        热度等级: <span style="font-weight: bold; color: ${
          level === '高' ? '#ef4444' : level === '中' ? '#f59e0b' : '#10b981'
        }">${level}</span>
      </div>
      <div style="margin-bottom: 4px;">
        讨论量: <span style="font-weight: bold;">${point.value.toLocaleString()}</span>
      </div>
      <div style="margin-bottom: 4px;">
        趋势: <span style="font-weight: bold;">${trend}</span>
      </div>
      <div style="color: #6b7280; font-size: 12px; margin-top: 8px;">
        经纬度: ${point.coordinates[0].toFixed(2)}°E, ${point.coordinates[1].toFixed(2)}°N
      </div>
    </div>
  `
}

/** 自定义数值格式（CustomValueFormat 示例） */
export const formatValue = (value: number): string => `${(value / 1000).toFixed(1)}K`
