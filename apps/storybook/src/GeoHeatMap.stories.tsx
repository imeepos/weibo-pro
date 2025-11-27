import type { Meta, StoryObj } from '@storybook/react'
import { GeoHeatMap, type GeoDataPoint } from '@sker/ui/components/ui/geo-heat-map'
import { useState } from 'react'

const meta = {
  title: 'Charts/GeoHeatMap',
  component: GeoHeatMap,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: {
      control: 'text',
      description: '图表标题',
    },
    isDark: {
      control: 'boolean',
      description: '是否为暗色模式',
    },
    zoom: {
      control: { type: 'range', min: 0.5, max: 3, step: 0.1 },
      description: '地图缩放级别',
    },
    showVisualMap: {
      control: 'boolean',
      description: '是否显示 visualMap',
    },
  },
} satisfies Meta<typeof GeoHeatMap>

export default meta
type Story = StoryObj<typeof meta>

// 中国主要城市地理坐标
const majorCities: GeoDataPoint[] = [
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

const allCities: GeoDataPoint[] = [
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

const sentimentData: GeoDataPoint[] = [
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

export const Default: Story = {
  args: {
    data: majorCities,
    title: '全国舆情热度分布',
  },
}

export const WithSentiment: Story = {
  args: {
    data: sentimentData,
    title: '舆情情感分析地图',
  },
}

export const AllCities: Story = {
  args: {
    data: allCities,
    title: '全国主要城市覆盖',
    zoom: 1.3,
  },
}

export const DarkMode: Story = {
  args: {
    data: majorCities,
    title: '暗色主题地图',
    isDark: true,
  },
}

export const CustomZoom: Story = {
  args: {
    data: majorCities,
    title: '放大视图',
    zoom: 2.5,
    center: [116.4074, 39.9042], // 聚焦北京
  },
}

export const CustomColors: Story = {
  args: {
    data: majorCities,
    title: '自定义渐变色',
    colorRange: [
      '#fef3c7',
      '#fde68a',
      '#fcd34d',
      '#fbbf24',
      '#f59e0b',
      '#d97706',
      '#b45309',
      '#92400e',
      '#78350f',
    ],
  },
}

export const LargeSizeRange: Story = {
  args: {
    data: majorCities,
    title: '大尺寸散点',
    sizeRange: [15, 50],
  },
}

export const SmallSizeRange: Story = {
  args: {
    data: majorCities,
    title: '小尺寸散点',
    sizeRange: [5, 15],
  },
}

export const WithoutVisualMap: Story = {
  args: {
    data: majorCities,
    title: '隐藏 VisualMap',
    showVisualMap: false,
  },
}

export const CustomTooltip: Story = {
  args: {
    data: majorCities,
    title: '自定义 Tooltip',
    formatTooltip: (point) => {
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
    },
  },
}

export const CustomValueFormat: Story = {
  args: {
    data: majorCities,
    title: '自定义数值格式',
    formatValue: (value) => `${(value / 1000).toFixed(1)}K`,
  },
}

export const EmptyState: Story = {
  args: {
    data: [],
    title: '空数据状态',
  },
}

export const LoadingState: Story = {
  render: () => {
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
  },
}

export const InteractiveDemo: Story = {
  render: () => {
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
  },
}

export const PositiveSentimentOnly: Story = {
  args: {
    data: sentimentData.filter(d => d.sentiment === 'positive'),
    title: '正面情感分布',
  },
}

export const NegativeSentimentOnly: Story = {
  args: {
    data: sentimentData.filter(d => d.sentiment === 'negative'),
    title: '负面情感分布',
  },
}

export const RegionalFocus: Story = {
  args: {
    data: [
      { name: '北京', coordinates: [116.4074, 39.9042], value: 1580 },
      { name: '天津', coordinates: [117.2010, 39.0842], value: 680 },
      { name: '石家庄', coordinates: [114.5149, 38.0428], value: 420 },
      { name: '唐山', coordinates: [118.1752, 39.6304], value: 350 },
      { name: '保定', coordinates: [115.4648, 38.8738], value: 280 },
    ],
    title: '京津冀地区热度',
    zoom: 3,
    center: [116.4, 39.0],
  },
}

export const WithMapOptions: Story = {
  args: {
    data: majorCities,
    title: '自定义地图加载',
    mapOptions: {
      localPath: '/maps/china.json',
      enableBuiltinFallback: true,
    },
  },
}

export const RealTimeUpdate: Story = {
  render: () => {
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
  },
}

export const MinimalStyle: Story = {
  args: {
    data: majorCities,
    title: '',
    showVisualMap: false,
    zoom: 1.2,
  },
}

export const MaximumDataPoints: Story = {
  args: {
    data: [
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
    ],
    title: '最大数据点展示',
    sizeRange: [6, 25],
  },
}
