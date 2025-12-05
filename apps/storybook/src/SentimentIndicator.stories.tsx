import type { Meta, StoryObj } from '@storybook/react'
import { SentimentIndicator } from '@sker/ui/components/ui/sentiment-indicator'
import { Card } from '@sker/ui/components/ui/card'
import {
  Statistic,
  StatisticLabel,
  StatisticValue,
} from '@sker/ui/components/ui/statistic'

const meta = {
  title: 'UI/SentimentIndicator',
  component: SentimentIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['positive', 'negative', 'neutral'],
      description: '情感类型',
    },
    level: {
      control: { type: 'number', min: 1, max: 10, step: 1 },
      description: '情感强度等级（1-10）',
    },
    showLabel: {
      control: 'boolean',
      description: '是否显示文字标签',
    },
  },
} satisfies Meta<typeof SentimentIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const PositiveLow: Story = {
  args: {
    type: 'positive',
    level: 3,
  },
}

export const PositiveMedium: Story = {
  args: {
    type: 'positive',
    level: 6,
  },
}

export const PositiveHigh: Story = {
  args: {
    type: 'positive',
    level: 9,
  },
}

export const NegativeLow: Story = {
  args: {
    type: 'negative',
    level: 3,
  },
}

export const NegativeMedium: Story = {
  args: {
    type: 'negative',
    level: 6,
  },
}

export const NegativeHigh: Story = {
  args: {
    type: 'negative',
    level: 9,
  },
}

export const Neutral: Story = {
  args: {
    type: 'neutral',
    level: 5,
  },
}

export const WithLabel: Story = {
  args: {
    type: 'positive',
    level: 7,
    showLabel: true,
  },
}

export const AllLevels: Story = {
  args: {
    type: 'positive',
    level: 5,
  },
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">正面情感（1-10）</h3>
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((level) => (
            <SentimentIndicator key={level} type="positive" level={level} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">负面情感（1-10）</h3>
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((level) => (
            <SentimentIndicator key={level} type="negative" level={level} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">中性情感（1-10）</h3>
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((level) => (
            <SentimentIndicator key={level} type="neutral" level={level} />
          ))}
        </div>
      </div>
    </div>
  ),
}

export const WithLabels: Story = {
  args: {
    type: 'positive',
    level: 8,
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <SentimentIndicator type="positive" level={8} showLabel />
      <SentimentIndicator type="negative" level={6} showLabel />
      <SentimentIndicator type="neutral" level={5} showLabel />
    </div>
  ),
}

export const InStatistic: Story = {
  args: {
    type: 'positive',
    level: 7,
  },
  render: () => (
    <Card className="w-[280px] p-6">
      <Statistic>
        <StatisticLabel>舆情分析</StatisticLabel>
        <StatisticValue>1,234</StatisticValue>
        <div className="mt-2">
          <SentimentIndicator type="positive" level={7} showLabel />
        </div>
      </Statistic>
    </Card>
  ),
}

export const MultipleInCards: Story = {
  args: {
    type: 'positive',
    level: 9,
  },
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>正面评论</StatisticLabel>
          <StatisticValue className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
            8,456
          </StatisticValue>
          <div className="mt-2">
            <SentimentIndicator type="positive" level={9} showLabel />
          </div>
        </Statistic>
      </Card>
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>负面评论</StatisticLabel>
          <StatisticValue className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
            1,234
          </StatisticValue>
          <div className="mt-2">
            <SentimentIndicator type="negative" level={6} showLabel />
          </div>
        </Statistic>
      </Card>
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>中性评论</StatisticLabel>
          <StatisticValue className="bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent">
            3,456
          </StatisticValue>
          <div className="mt-2">
            <SentimentIndicator type="neutral" level={5} showLabel />
          </div>
        </Statistic>
      </Card>
    </div>
  ),
}

export const HighIntensityGlow: Story = {
  args: {
    type: 'positive',
    level: 10,
  },
  render: () => (
    <div className="flex gap-8 rounded-lg bg-slate-900 p-8">
      <div className="flex flex-col items-center gap-2">
        <SentimentIndicator type="positive" level={10} />
        <span className="text-xs text-white">正面 10/10</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <SentimentIndicator type="negative" level={10} />
        <span className="text-xs text-white">负面 10/10</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <SentimentIndicator type="positive" level={8} />
        <span className="text-xs text-white">正面 8/10</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <SentimentIndicator type="negative" level={8} />
        <span className="text-xs text-white">负面 8/10</span>
      </div>
    </div>
  ),
}

export const ComparisonView: Story = {
  args: {
    type: 'positive',
    level: 8,
  },
  render: () => (
    <Card className="w-[400px] p-6">
      <h3 className="mb-4 text-lg font-semibold">情感分布对比</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">本周</span>
          <SentimentIndicator type="positive" level={8} showLabel />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">上周</span>
          <SentimentIndicator type="positive" level={6} showLabel />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">上月</span>
          <SentimentIndicator type="neutral" level={5} showLabel />
        </div>
      </div>
    </Card>
  ),
}

export const CustomStyling: Story = {
  args: {
    type: 'positive',
    level: 9,
  },
  render: () => (
    <SentimentIndicator
      type="positive"
      level={9}
      showLabel
      className="scale-150"
    />
  ),
}
