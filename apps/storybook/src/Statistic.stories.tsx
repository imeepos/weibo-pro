import type { Meta, StoryObj } from '@storybook/react'
import {
  Statistic,
  StatisticLabel,
  StatisticValue,
  StatisticDescription,
} from '@sker/ui/components/ui/statistic'
import { Card } from '@sker/ui/components/ui/card'

const meta = {
  title: 'UI/Statistic',
  component: Statistic,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Statistic>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Statistic>
      <StatisticLabel>总用户数</StatisticLabel>
      <StatisticValue>1,234</StatisticValue>
    </Statistic>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <Statistic>
      <StatisticLabel>活跃用户</StatisticLabel>
      <StatisticValue>8,456</StatisticValue>
      <StatisticDescription>过去 24 小时</StatisticDescription>
    </Statistic>
  ),
}

export const LargeNumber: Story = {
  render: () => (
    <Statistic>
      <StatisticLabel>总浏览量</StatisticLabel>
      <StatisticValue className="text-5xl">9,876,543</StatisticValue>
      <StatisticDescription>本月累计</StatisticDescription>
    </Statistic>
  ),
}

export const WithGradient: Story = {
  render: () => (
    <Statistic>
      <StatisticLabel>营收</StatisticLabel>
      <StatisticValue className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
        ¥128,900
      </StatisticValue>
      <StatisticDescription>今日实时</StatisticDescription>
    </Statistic>
  ),
}

export const InCard: Story = {
  render: () => (
    <Card className="w-[280px] p-6">
      <Statistic>
        <StatisticLabel>微博帖子</StatisticLabel>
        <StatisticValue className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
          45,678
        </StatisticValue>
        <StatisticDescription>已采集分析</StatisticDescription>
      </Statistic>
    </Card>
  ),
}

export const MultipleInGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>总帖子</StatisticLabel>
          <StatisticValue className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            12,543
          </StatisticValue>
        </Statistic>
      </Card>
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>总用户</StatisticLabel>
          <StatisticValue className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
            3,456
          </StatisticValue>
        </Statistic>
      </Card>
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>舆情事件</StatisticLabel>
          <StatisticValue className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            89
          </StatisticValue>
        </Statistic>
      </Card>
    </div>
  ),
}

export const CustomStyling: Story = {
  render: () => (
    <Statistic className="gap-4">
      <StatisticLabel className="text-base font-semibold">
        重要指标
      </StatisticLabel>
      <StatisticValue className="text-6xl font-extrabold text-red-500">
        999+
      </StatisticValue>
      <StatisticDescription className="text-base">
        需要立即关注
      </StatisticDescription>
    </Statistic>
  ),
}
