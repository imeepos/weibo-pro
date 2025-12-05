import type { Meta, StoryObj } from '@storybook/react'
import { CountUp } from '@sker/ui/components/ui/count-up'
import { Card } from '@sker/ui/components/ui/card'
import {
  Statistic,
  StatisticLabel,
  StatisticValue,
} from '@sker/ui/components/ui/statistic'
import { useState } from 'react'
import { Button } from '@sker/ui/components/ui/button'

const meta: Meta<typeof CountUp> = {
  title: 'UI/CountUp',
  component: CountUp,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    end: {
      control: { type: 'number', min: 0, max: 1000000 },
      description: '结束数值',
    },
    start: {
      control: { type: 'number', min: 0, max: 1000 },
      description: '起始数值',
    },
    duration: {
      control: { type: 'number', min: 100, max: 5000, step: 100 },
      description: '动画时长（毫秒）',
    },
    animated: {
      control: 'boolean',
      description: '是否启用动画',
    },
    prefix: {
      control: 'text',
      description: '前缀',
    },
    suffix: {
      control: 'text',
      description: '后缀',
    },
    decimals: {
      control: { type: 'number', min: 0, max: 4 },
      description: '小数位数',
    },
  },
} satisfies Meta<typeof CountUp>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    end: 1234,
  },
}

export const WithAnimation: Story = {
  args: {
    end: 8456,
    duration: 2000,
    animated: true,
  },
}

export const WithoutAnimation: Story = {
  args: {
    end: 8456,
    animated: false,
  },
}

export const WithPrefix: Story = {
  args: {
    end: 128900,
    prefix: '¥',
    animated: true,
  },
}

export const WithSuffix: Story = {
  args: {
    end: 98,
    suffix: '%',
    animated: true,
  },
}

export const WithDecimals: Story = {
  args: {
    end: 3.14159,
    decimals: 2,
    animated: true,
  },
}

export const LargeNumber: Story = {
  args: {
    end: 9876543,
    animated: true,
    duration: 3000,
  },
}

export const Currency: Story = {
  args: {
    end: 12580.5,
    prefix: '¥',
    decimals: 2,
    animated: true,
  },
}

export const Percentage: Story = {
  args: {
    end: 67.8,
    suffix: '%',
    decimals: 1,
    animated: true,
  },
}

export const FastAnimation: Story = {
  args: {
    end: 5678,
    duration: 500,
    animated: true,
  },
}

export const SlowAnimation: Story = {
  args: {
    end: 5678,
    duration: 5000,
    animated: true,
  },
}

export const WithStatistic: Story = {
  args: {
    end: 456789,
    prefix: '¥',
    animated: true,
  },
  render: () => (
    <Card className="w-[280px] p-6">
      <Statistic>
        <StatisticLabel>总营收</StatisticLabel>
        <StatisticValue className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
          <CountUp end={456789} prefix="¥" animated />
        </StatisticValue>
      </Statistic>
    </Card>
  ),
}

export const Interactive: Story = {
  args: {
    end: 1000,
    animated: true,
  },
  render: (args) => {
    const [value, setValue] = useState(args.end)

    return (
      <div className="flex flex-col items-center gap-4">
        <Card className="w-[280px] p-6">
          <Statistic>
            <StatisticLabel>动态数值</StatisticLabel>
            <StatisticValue className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              <CountUp {...args} end={value} />
            </StatisticValue>
          </Statistic>
        </Card>
        <div className="flex gap-2">
          <Button onClick={() => setValue(Math.floor(Math.random() * 10000))}>
            随机值
          </Button>
          <Button onClick={() => setValue(value + 500)}>
            +500
          </Button>
          <Button onClick={() => setValue(Math.max(0, value - 500))}>
            -500
          </Button>
        </div>
      </div>
    )
  },
}

export const MultipleCounters: Story = {
  args: {
    end: 123456,
    animated: true,
  },
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>浏览量</StatisticLabel>
          <StatisticValue className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            <CountUp end={123456} animated />
          </StatisticValue>
        </Statistic>
      </Card>
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>转化率</StatisticLabel>
          <StatisticValue className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
            <CountUp end={12.5} suffix="%" decimals={1} animated />
          </StatisticValue>
        </Statistic>
      </Card>
      <Card className="p-6">
        <Statistic>
          <StatisticLabel>收入</StatisticLabel>
          <StatisticValue className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            <CountUp end={89765.5} prefix="¥" decimals={2} animated />
          </StatisticValue>
        </Statistic>
      </Card>
    </div>
  ),
}

export const CustomStyling: Story = {
  args: {
    end: 999999,
    animated: true,
  },
  render: () => (
    <CountUp
      end={999999}
      animated
      className="text-6xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent"
    />
  ),
}
