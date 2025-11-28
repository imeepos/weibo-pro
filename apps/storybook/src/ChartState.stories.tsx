import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import * as React from 'react'
import { ChartState } from '@sker/ui/components/ui/chart-state'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'

const meta = {
  title: 'UI/ChartState',
  component: ChartState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ChartState>

export default meta
type Story = StoryObj<ReactRenderer>

const mockData = [
  { name: '周一', value: 120 },
  { name: '周二', value: 150 },
  { name: '周三', value: 180 },
  { name: '周四', value: 90 },
  { name: '周五', value: 200 },
]

const SampleChart = () => (
  <ResponsiveContainer width={400} height={300}>
    <BarChart data={mockData}>
      <XAxis dataKey="name" />
      <YAxis />
      <Bar dataKey="value" fill="#3b82f6" />
    </BarChart>
  </ResponsiveContainer>
)

export const Loading: Story = {
  render: () => (
    <div className="w-[400px] h-[300px]">
      <ChartState loading />
    </div>
  ),
}

export const LoadingCustomText: Story = {
  render: () => (
    <div className="w-[400px] h-[300px]">
      <ChartState loading loadingText="正在分析舆情数据..." />
    </div>
  ),
}

export const Error: Story = {
  render: () => (
    <div className="w-[400px] h-[300px]">
      <ChartState error="数据加载失败" />
    </div>
  ),
}

export const ErrorWithRetry: Story = {
  render: () => (
    <div className="w-[400px] h-[300px]">
      <ChartState
        error="网络连接失败，请重试"
        onRetry={() => alert('重新加载中...')}
      />
    </div>
  ),
}

export const Empty: Story = {
  render: () => (
    <div className="w-[400px] h-[300px]">
      <ChartState empty />
    </div>
  ),
}

export const EmptyWithDescription: Story = {
  render: () => (
    <div className="w-[400px] h-[300px]">
      <ChartState empty emptyText="暂无舆情事件" emptyDescription="当前时间段内没有相关数据" />
    </div>
  ),
}

export const WithChart: Story = {
  render: () => (
    <div className="w-[400px] h-[300px]">
      <ChartState>
        <SampleChart />
      </ChartState>
    </div>
  ),
}

export const LoadingToSuccess: Story = {
  render: () => {
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
      const timer = setTimeout(() => setLoading(false), 2000)
      return () => clearTimeout(timer)
    }, [])

    return (
      <div className="w-[400px] h-[300px]">
        <ChartState loading={loading}>
          <SampleChart />
        </ChartState>
      </div>
    )
  },
}

export const EmptyStateInDashboard: Story = {
  render: () => (
    <div className="w-full h-[400px] bg-card rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-4">微博热度趋势</h3>
      <ChartState
        empty
        emptyText="暂无热度数据"
        emptyDescription="请先配置关键词采集任务"
      />
    </div>
  ),
}

export const ErrorStateInDashboard: Story = {
  render: () => (
    <div className="w-full h-[400px] bg-card rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-4">情感分析分布</h3>
      <ChartState
        error="NLP 服务连接失败"
        onRetry={() => console.log('重试中...')}
      />
    </div>
  ),
}

export const LoadingStateInDashboard: Story = {
  render: () => (
    <div className="w-full h-[400px] bg-card rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-4">舆情事件统计</h3>
      <ChartState loading loadingText="正在加载统计数据..." />
    </div>
  ),
}
