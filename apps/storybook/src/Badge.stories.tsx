import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from '@sker/ui'

const meta = {
  title: 'Components/Badge',
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
