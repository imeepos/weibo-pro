import type { EventItem } from './event-selector'

export const mockEvents: EventItem[] = [
  {
    id: '1',
    title: '某品牌产品发布会',
    description: '新品发布会引发热议',
    category: { name: '商业' },
    hotness: 1000,
    occurred_at: '2025-01-15',
    created_at: '2025-01-15',
  },
  {
    id: '2',
    title: '娱乐圈热门事件',
    description: '明星动态引发关注',
    category: { name: '娱乐' },
    hotness: 800,
    occurred_at: '2025-01-14',
    created_at: '2025-01-14',
  },
]

export const generateEvents = (count: number): EventItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `event-${i + 1}`,
    title: `事件 ${i + 1}`,
    description: `事件 ${i + 1} 的描述`,
    category: { name: '测试' },
    hotness: 100 + i,
  }))
