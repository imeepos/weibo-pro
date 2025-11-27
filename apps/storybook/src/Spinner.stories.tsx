import type { Meta, StoryObj } from '@storybook/react'
import { Spinner } from '@sker/ui/components/ui/spinner'

const meta = {
  title: '@sker/ui/ui/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Spinner />,
}

export const Small: Story = {
  render: () => <Spinner className="size-3" />,
}

export const Large: Story = {
  render: () => <Spinner className="size-8" />,
}

export const CustomColor: Story = {
  render: () => <Spinner className="text-primary" />,
}
