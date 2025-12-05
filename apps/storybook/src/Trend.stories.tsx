import type { Meta, StoryObj } from '@storybook/react'
import { Trend } from '@sker/ui/components/ui/trend'
import { Card } from '@sker/ui/components/ui/card'
import {
  Statistic,
  StatisticLabel,
  StatisticValue,
} from '@sker/ui/components/ui/statistic'

const meta: Meta<typeof Trend> = {
  title: 'UI/Trend',
  component: Trend,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'number', min: -100, max: 100, step: 0.1 },
      description: '趋势变化百分比',
    },
    label: {
      control: 'text',
      description: '趋势标签',
    },
    showIcon: {
      control: 'boolean',
      description: '是否显示图标',
    },
  },
} satisfies Meta<typeof Trend>

export default meta
type Story = StoryObj<typeof meta>

export const Positive: Story = {
  args: {
    value: 12.5,
  },
}

export const Negative: Story = {
  args: {
    value: -8.3,
  },
}

export const WithLabel: Story = {
  args: {
    value: 23.7,
    label: 'vs 上周',
  },
}

export const WithoutIcon: Story = {
  args: {
    value: 15.2,
    label: 'vs 上期',
    showIcon: false,
  },
}

export const Zero: Story = {
  args: {
    value: 0,
    label: '无变化',
  },
}

export const LargeIncrease: Story = {
  args: {
    value: 156.8,
    label: 'vs 去年同期',
  },
}

export const LargeDecrease: Story = {
  args: {
    value: -42.3,
    label: 'vs 去年同期',
  },
}

export const WithStatistic: Story = {
  args: {
    value: 18.5,
  },
  render: () => (
    <Card className="w-[280px] p-6">
      <Statistic>
        <StatisticLabel>活跃用户</StatisticLabel>
        <StatisticValue className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
          8,456
        </StatisticValue>
        <Trend value={18.5} label="vs 上期" />
      </Statistic>
    </Card>
  ),
}

export const MultipleComparison: Story = {
  args: {
    value: 0,
  },
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>日活跃</StatisticLabel>
          <StatisticValue>12,345</StatisticValue>
          <Trend value={12.5} label="vs 昨日" />
        </Statistic>
      </Card>
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>月活跃</StatisticLabel>
          <StatisticValue>456,789</StatisticValue>
          <Trend value={-3.2} label="vs 上月" />
        </Statistic>
      </Card>
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>新增用户</StatisticLabel>
          <StatisticValue>1,234</StatisticValue>
          <Trend value={45.8} label="vs 上周" />
        </Statistic>
      </Card>
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>流失率</StatisticLabel>
          <StatisticValue>2.3%</StatisticValue>
          <Trend value={-12.1} label="优化中" />
        </Statistic>
      </Card>
    </div>
  ),
}

export const CustomStyling: Story = {
  args: {
    value: 28.6,
  },
  render: () => (
    <Trend
      value={28.6}
      label="vs 上期"
      className="text-lg font-bold"
    />
  ),
}
