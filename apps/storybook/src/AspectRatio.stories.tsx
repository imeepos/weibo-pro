import type { Meta, StoryObj } from '@storybook/react'
import { AspectRatio } from '@sker/ui/components/ui/aspect-ratio'

const meta = {
  title: 'UI/AspectRatio',
  component: AspectRatio,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AspectRatio>

export default meta
type Story = StoryObj<typeof meta>

export const Video16x9: Story = {
  args: {},
  render: () => (
    <div className="w-96">
      <AspectRatio ratio={16 / 9}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="风景照片"
          className="size-full rounded-md object-cover"
        />
      </AspectRatio>
    </div>
  ),
}

export const Square1x1: Story = {
  args: {},
  render: () => (
    <div className="w-96">
      <AspectRatio ratio={1}>
        <img
          src="https://images.unsplash.com/photo-1535025183041-0991a977e25b?w=800&dpr=2&q=80"
          alt="正方形照片"
          className="size-full rounded-md object-cover"
        />
      </AspectRatio>
    </div>
  ),
}

export const Classic4x3: Story = {
  args: {},
  render: () => (
    <div className="w-96">
      <AspectRatio ratio={4 / 3}>
        <img
          src="https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&dpr=2&q=80"
          alt="4:3 照片"
          className="size-full rounded-md object-cover"
        />
      </AspectRatio>
    </div>
  ),
}

export const UltraWide21x9: Story = {
  args: {},
  render: () => (
    <div className="w-96">
      <AspectRatio ratio={21 / 9}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="超宽屏照片"
          className="size-full rounded-md object-cover"
        />
      </AspectRatio>
    </div>
  ),
}

export const Portrait9x16: Story = {
  args: {},
  render: () => (
    <div className="w-64">
      <AspectRatio ratio={9 / 16}>
        <img
          src="https://images.unsplash.com/photo-1535025183041-0991a977e25b?w=800&dpr=2&q=80"
          alt="竖屏照片"
          className="size-full rounded-md object-cover"
        />
      </AspectRatio>
    </div>
  ),
}

export const WithContent: Story = {
  args: {},
  render: () => (
    <div className="w-96">
      <AspectRatio ratio={16 / 9}>
        <div className="flex size-full items-center justify-center rounded-md bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold">16:9 容器</h2>
            <p className="mt-2">自动保持宽高比</p>
          </div>
        </div>
      </AspectRatio>
    </div>
  ),
}

export const VideoEmbed: Story = {
  args: {},
  render: () => (
    <div className="w-full max-w-2xl">
      <AspectRatio ratio={16 / 9}>
        <iframe
          src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          title="YouTube 视频"
          className="size-full rounded-md"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </AspectRatio>
    </div>
  ),
}

export const MultipleRatios: Story = {
  args: {},
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
      <div>
        <p className="mb-2 text-sm font-medium">16:9 视频</p>
        <AspectRatio ratio={16 / 9}>
          <div className="size-full rounded-md bg-blue-500 flex items-center justify-center text-white">
            16:9
          </div>
        </AspectRatio>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">1:1 正方形</p>
        <AspectRatio ratio={1}>
          <div className="size-full rounded-md bg-green-500 flex items-center justify-center text-white">
            1:1
          </div>
        </AspectRatio>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">4:3 经典</p>
        <AspectRatio ratio={4 / 3}>
          <div className="size-full rounded-md bg-yellow-500 flex items-center justify-center text-white">
            4:3
          </div>
        </AspectRatio>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">21:9 超宽</p>
        <AspectRatio ratio={21 / 9}>
          <div className="size-full rounded-md bg-purple-500 flex items-center justify-center text-white">
            21:9
          </div>
        </AspectRatio>
      </div>
    </div>
  ),
}

export const Responsive: Story = {
  args: {},
  render: () => (
    <div className="w-full px-4">
      <AspectRatio ratio={16 / 9}>
        <img
          src="https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&dpr=2&q=80"
          alt="响应式图片"
          className="size-full rounded-md object-cover"
        />
      </AspectRatio>
      <p className="mt-2 text-sm text-gray-600">调整浏览器窗口查看响应式效果</p>
    </div>
  ),
}
