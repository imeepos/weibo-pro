import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from '@sker/ui'
import { CheckCircle2, AlertCircle, Info, ArrowRight } from 'lucide-react'

const meta = {
  title: '@sker/ui/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: '默认',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: '次要',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: '危险',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: '轮廓',
  },
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <CheckCircle2 />
        已完成
      </>
    ),
  },
}

export const WithIconVariants: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge>
        <CheckCircle2 />
        已完成
      </Badge>
      <Badge variant="secondary">
        <Info />
        信息
      </Badge>
      <Badge variant="destructive">
        <AlertCircle />
        错误
      </Badge>
      <Badge variant="outline">
        <ArrowRight />
        进行中
      </Badge>
    </div>
  ),
}

export const AsLink: Story = {
  args: {
    asChild: true,
    children: (
      <a href="#" className="cursor-pointer">
        可点击链接
      </a>
    ),
  },
}
