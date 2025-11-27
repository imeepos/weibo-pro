import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@sker/ui'
import { Mail, Trash2 } from 'lucide-react'

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: '默认按钮',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: '删除',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: '取消',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: '次要',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: '幽灵',
  },
}

export const Link: Story = {
  args: {
    variant: 'link',
    children: '链接',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    children: '小按钮',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: '大按钮',
  },
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail />
        发送邮件
      </>
    ),
  },
}

export const IconOnly: Story = {
  args: {
    size: 'icon',
    children: <Trash2 />,
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: '禁用按钮',
  },
}
