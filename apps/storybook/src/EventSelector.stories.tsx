import type { Meta, StoryObj } from '@storybook/react'
import { EventSelector, type EventItem } from '@sker/ui/components/ui/event-selector'
import { useState } from 'react'

const mockEvents: EventItem[] = [
  {
    id: '1',
    title: '某明星离婚事件',
    description: '知名演员宣布离婚，引发网友热议，相关话题迅速登上热搜榜首。',
    category: { name: '娱乐' },
    hotness: 98.5,
    occurred_at: '2024-12-01',
  },
  {
    id: '2',
    title: '新能源汽车降价潮',
    description: '多家新能源车企宣布降价，市场竞争加剧。',
    category: { name: '财经' },
    hotness: 85.2,
    occurred_at: '2024-11-28',
  },
  {
    id: '3',
    title: '高考改革方案公布',
    description: '教育部发布新高考改革方案，涉及多项重大调整。',
    category: { name: '教育' },
    hotness: 92.1,
    occurred_at: '2024-11-25',
  },
  {
    id: '4',
    title: '某地暴雨预警',
    description: '气象台发布暴雨红色预警，提醒市民注意防范。',
    category: { name: '社会' },
    hotness: 76.8,
    occurred_at: '2024-11-20',
  },
]

const meta = {
  title: 'UI/EventSelector',
  component: EventSelector,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof EventSelector>

export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = {
  render: () => {
    const Demo = () => {
      const [value, setValue] = useState<string>('')
      return (
        <div className="w-96 space-y-4">
          <EventSelector events={mockEvents} value={value} onChange={(v) => setValue(v as string)} />
          <p className="text-sm text-muted-foreground">已选: {value || '无'}</p>
        </div>
      )
    }
    return <Demo />
  },
}

export const Multiple: Story = {
  render: () => {
    const Demo = () => {
      const [value, setValue] = useState<string[]>([])
      return (
        <div className="w-96 space-y-4">
          <EventSelector events={mockEvents} value={value} onChange={(v) => setValue(v as string[])} multiple />
          <p className="text-sm text-muted-foreground">已选: {value.length ? value.join(', ') : '无'}</p>
        </div>
      )
    }
    return <Demo />
  },
}

export const WithSearch: Story = {
  render: () => (
    <div className="w-96">
      <EventSelector events={mockEvents} placeholder="输入关键词搜索..." />
    </div>
  ),
}

export const Empty: Story = {
  render: () => (
    <div className="w-96">
      <EventSelector events={[]} />
    </div>
  ),
}
