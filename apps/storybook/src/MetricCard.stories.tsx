import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { TrendingUp, Users, MessageSquare, Heart } from 'lucide-react'
import { MetricCard } from '@sker/ui/components/ui/metric-card'
const meta = {
  title: 'Bigscreen/MetricCard',
  component: MetricCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MetricCard>

export default meta
type Story = StoryObj<ReactRenderer>

export const Default: Story = {
  args: {
    title: '总帖子数',
    value: 12543,
    color: 'blue',
  },
}

export const WithChange: Story = {
  args: {
    title: '活跃用户',
    value: 8456,
    change: 12.5,
    icon: Users,
    color: 'green',
  },
}

export const NegativeChange: Story = {
  args: {
    title: '评论数',
    value: 3421,
    change: -5.2,
    icon: MessageSquare,
    color: 'purple',
  },
}

export const WithSentiment: Story = {
  args: {
    title: '舆情热度',
    value: 9876,
    change: 23.8,
    icon: TrendingUp,
    color: 'red',
    sentiment: {
      type: 'positive',
      level: 8,
    },
  },
}

export const Loading: Story = {
  args: {
    title: '加载中',
    value: 0,
    loading: true,
  },
}

export const AllColors: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard title="蓝色" value={1234} color="blue" icon={TrendingUp} animated={false} />
      <MetricCard title="绿色" value={5678} color="green" icon={Users} animated={false} />
      <MetricCard title="红色" value={9012} color="red" icon={Heart} animated={false} />
      <MetricCard title="灰色" value={3456} color="gray" icon={MessageSquare} animated={false} />
      <MetricCard title="紫色" value={7890} color="purple" icon={TrendingUp} animated={false} />
      <MetricCard title="黄色" value={2345} color="yellow" icon={Users} animated={false} />
    </div>
  ),
}
