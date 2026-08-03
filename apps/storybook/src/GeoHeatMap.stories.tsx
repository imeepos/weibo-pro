import type { Meta, StoryObj } from '@storybook/react'
import { GeoHeatMap } from '@sker/ui/components/ui/geo-heat-map'
import {
  majorCities,
  allCities,
  sentimentData,
  regionalCities,
  maximumCities,
  formatTooltip,
  formatValue,
} from './GeoHeatMap.stories/data'
import {
  LoadingStateRender,
  InteractiveDemoRender,
  RealTimeUpdateRender,
} from './GeoHeatMap.stories/components'

const meta: Meta<typeof GeoHeatMap> = {
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
    formatTooltip,
  },
}

export const CustomValueFormat: Story = {
  args: {
    data: majorCities,
    title: '自定义数值格式',
    formatValue,
  },
}

export const EmptyState: Story = {
  args: {
    data: [],
    title: '空数据状态',
  },
}

export const LoadingState: Story = {
  args: {
    data: [],
  },
  render: () => <LoadingStateRender />,
}

export const InteractiveDemo: Story = {
  args: {
    data: [],
  },
  render: () => <InteractiveDemoRender />,
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
    data: regionalCities,
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
  args: {
    data: [],
  },
  render: () => <RealTimeUpdateRender />,
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
    data: maximumCities,
    title: '最大数据点展示',
    sizeRange: [6, 25],
  },
}
