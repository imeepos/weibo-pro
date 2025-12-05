import type { Meta, StoryObj } from '@storybook/react'
import { WordCloud } from '@sker/ui/components/ui/word-cloud'
import { useState } from 'react'

const meta = {
  title: 'BIGSCREEN/WordCloud',
  component: WordCloud,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '800px', height: '600px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WordCloud>

export default meta
type Story = StoryObj<typeof meta>

const baseData = [
  { name: '微博', value: 1500 },
  { name: '舆情', value: 1200 },
  { name: '分析', value: 1000 },
  { name: '数据', value: 900 },
  { name: '热点', value: 800 },
  { name: '事件', value: 750 },
  { name: '监控', value: 700 },
  { name: '趋势', value: 650 },
  { name: '话题', value: 600 },
  { name: '关键词', value: 550 },
  { name: '热搜', value: 500 },
  { name: '评论', value: 450 },
  { name: '转发', value: 400 },
  { name: '点赞', value: 350 },
  { name: '用户', value: 300 },
]

export const Default: Story = {
  args: {
    data: baseData,
    height: 600,
  },
}

export const Circle: Story = {
  args: {
    data: baseData,
    height: 600,
    shape: 'circle',
  },
}

export const Diamond: Story = {
  args: {
    data: baseData,
    height: 600,
    shape: 'diamond',
  },
}

export const Square: Story = {
  args: {
    data: baseData,
    height: 600,
    shape: 'square',
  },
}

export const Star: Story = {
  args: {
    data: baseData,
    height: 600,
    shape: 'star',
  },
}

export const CustomColors: Story = {
  args: {
    data: [
      { name: '正面情感', value: 1500, color: '#10b981' },
      { name: '中性情感', value: 1200, color: '#6b7280' },
      { name: '负面情感', value: 1000, color: '#ef4444' },
      { name: '高热度', value: 900, color: '#f59e0b' },
      { name: '中热度', value: 800, color: '#3b82f6' },
      { name: '低热度', value: 700, color: '#8b5cf6' },
      { name: '病毒传播', value: 650, color: '#ec4899' },
      { name: '稳定增长', value: 600, color: '#14b8a6' },
      { name: '波动', value: 550, color: '#f97316' },
      { name: '衰减', value: 500, color: '#64748b' },
    ],
    height: 600,
    shape: 'circle',
  },
}

export const LargeDataset: Story = {
  args: {
    data: [
      { name: '人工智能', value: 2000 },
      { name: '机器学习', value: 1800 },
      { name: '深度学习', value: 1600 },
      { name: '神经网络', value: 1400 },
      { name: '自然语言', value: 1200 },
      { name: '计算机视觉', value: 1100 },
      { name: '数据挖掘', value: 1000 },
      { name: '大数据', value: 950 },
      { name: '云计算', value: 900 },
      { name: '物联网', value: 850 },
      { name: '区块链', value: 800 },
      { name: '边缘计算', value: 750 },
      { name: '量子计算', value: 700 },
      { name: '算法', value: 650 },
      { name: '模型训练', value: 600 },
      { name: '特征工程', value: 550 },
      { name: '数据清洗', value: 500 },
      { name: '可视化', value: 450 },
      { name: '预测分析', value: 400 },
      { name: '聚类分析', value: 350 },
      { name: '分类算法', value: 300 },
      { name: '回归分析', value: 280 },
      { name: '降维', value: 260 },
      { name: '异常检测', value: 240 },
      { name: '时序分析', value: 220 },
    ],
    height: 600,
  },
}

export const CustomSizeRange: Story = {
  args: {
    data: baseData,
    height: 600,
    sizeRange: [20, 100],
  },
}

export const NoRotation: Story = {
  args: {
    data: baseData,
    height: 600,
    rotationRange: [0, 0],
  },
}

export const NoAnimation: Story = {
  args: {
    data: baseData,
    height: 600,
    animated: false,
  },
}

export const CustomTooltip: Story = {
  args: {
    data: baseData,
    height: 600,
    tooltipFormatter: (item) => `
      <div style="padding: 8px;">
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${item.name}</div>
        <div style="color: #10b981;">热度值: ${item.value}</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">点击查看详情</div>
      </div>
    `,
  },
}

export const WithClick: Story = {
  args: {
    data: [],
  },
  render: () => {
    const [selected, setSelected] = useState<string | null>(null)

    return (
      <div>
        <WordCloud
          data={baseData}
          height={550}
          onWordClick={(item) => setSelected(item.name)}
        />
        {selected && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#f3f4f6',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            已选中: <strong>{selected}</strong>
          </div>
        )}
      </div>
    )
  },
}

export const SentimentAnalysis: Story = {
  args: {
    data: [
      { name: '积极', value: 1800, color: '#10b981' },
      { name: '正向', value: 1600, color: '#34d399' },
      { name: '喜悦', value: 1400, color: '#6ee7b7' },
      { name: '希望', value: 1200, color: '#14b8a6' },
      { name: '中立', value: 1000, color: '#6b7280' },
      { name: '平静', value: 900, color: '#9ca3af' },
      { name: '疑问', value: 800, color: '#d1d5db' },
      { name: '担忧', value: 700, color: '#fbbf24' },
      { name: '失望', value: 650, color: '#f59e0b' },
      { name: '愤怒', value: 600, color: '#f97316' },
      { name: '悲伤', value: 550, color: '#ef4444' },
      { name: '消极', value: 500, color: '#dc2626' },
    ],
    height: 600,
    shape: 'circle',
    tooltipFormatter: (item) => {
      const sentiment = item.color === '#10b981' || item.color?.startsWith('#3') || item.color?.startsWith('#6e') || item.color?.startsWith('#14')
        ? '正面'
        : item.color?.startsWith('#6b') || item.color?.startsWith('#9c') || item.color?.startsWith('#d1')
        ? '中性'
        : '负面'

      return `
        <div style="padding: 8px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${item.name}</div>
          <div>情感倾向: <span style="color: ${item.color}">${sentiment}</span></div>
          <div>提及次数: ${item.value}</div>
        </div>
      `
    },
  },
}
