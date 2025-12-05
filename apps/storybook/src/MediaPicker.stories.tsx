import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { MediaPicker, type MediaItem } from '@sker/ui/components/ui/media-picker'
import { useState } from 'react'

const meta = {
  title: 'UI/MediaPicker',
  component: MediaPicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MediaPicker>

export default meta
type Story = StoryObj<ReactRenderer>

const mockItems: MediaItem[] = [
  { id: '1', type: 'image', name: '产品封面.jpg', url: '/img/1.jpg', tags: ['封面', '产品'] },
  { id: '2', type: 'image', name: '活动海报.png', url: '/img/2.png', tags: ['海报', '活动'] },
  { id: '3', type: 'image', name: '品牌Logo.svg', url: '/img/3.svg', tags: ['品牌'] },
  { id: '4', type: 'video', name: '宣传片.mp4', url: '/video/1.mp4', tags: ['宣传', '品牌'] },
  { id: '5', type: 'video', name: '教程视频.mp4', url: '/video/2.mp4', tags: ['教程'] },
  { id: '6', type: 'audio', name: '背景音乐.mp3', url: '/audio/1.mp3', tags: ['音乐', '背景'] },
  { id: '7', type: 'audio', name: '提示音效.wav', url: '/audio/2.wav', tags: ['音效'] },
  { id: '8', type: 'text', name: '营销文案模板', url: '/text/1', tags: ['营销', '模板'] },
  { id: '9', type: 'text', name: '产品介绍文档', url: '/text/2', tags: ['产品', '文档'] },
  { id: '10', type: 'image', name: '用户头像.jpg', url: '/img/4.jpg', tags: ['用户'] },
]

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string>('')
    return (
      <div className="w-[480px]">
        <MediaPicker items={mockItems} value={value} onValueChange={(v) => setValue(v as string)} />
      </div>
    )
  },
}

export const Multiple: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([])
    return (
      <div className="w-[480px]">
        <MediaPicker
          items={mockItems}
          value={value}
          onValueChange={(v) => setValue(v as string[])}
          multiple
        />
      </div>
    )
  },
}

export const FilteredTypes: Story = {
  render: () => {
    const [value, setValue] = useState<string>('')
    return (
      <div className="w-[480px]">
        <MediaPicker
          items={mockItems}
          value={value}
          onValueChange={(v) => setValue(v as string)}
          types={['image', 'video']}
        />
      </div>
    )
  },
}

export const WithThumbnails: Story = {
  render: () => {
    const [value, setValue] = useState<string>('')
    const itemsWithThumbnails: MediaItem[] = [
      { id: '1', type: 'image', name: '风景图.jpg', url: '/1.jpg', thumbnail: 'https://picsum.photos/200/200?random=1' },
      { id: '2', type: 'image', name: '人物照.jpg', url: '/2.jpg', thumbnail: 'https://picsum.photos/200/200?random=2' },
      { id: '3', type: 'image', name: '建筑图.jpg', url: '/3.jpg', thumbnail: 'https://picsum.photos/200/200?random=3' },
      { id: '4', type: 'image', name: '美食图.jpg', url: '/4.jpg', thumbnail: 'https://picsum.photos/200/200?random=4' },
      { id: '5', type: 'video', name: '短视频.mp4', url: '/5.mp4', thumbnail: 'https://picsum.photos/200/200?random=5' },
      { id: '6', type: 'video', name: 'Vlog.mp4', url: '/6.mp4', thumbnail: 'https://picsum.photos/200/200?random=6' },
    ]
    return (
      <div className="w-[480px]">
        <MediaPicker
          items={itemsWithThumbnails}
          value={value}
          onValueChange={(v) => setValue(v as string)}
        />
      </div>
    )
  },
}

export const Empty: Story = {
  render: () => {
    const [value, setValue] = useState<string>('')
    return (
      <div className="w-[480px]">
        <MediaPicker
          items={[]}
          value={value}
          onValueChange={(v) => setValue(v as string)}
          emptyText="暂无可用素材"
        />
      </div>
    )
  },
}
