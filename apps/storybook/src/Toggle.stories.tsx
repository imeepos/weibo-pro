import type { Meta, StoryObj } from '@storybook/react'
import { Toggle } from '@sker/ui/components/ui/toggle'
import { Bold, Italic, Underline } from 'lucide-react'

const meta = {
  title: 'UI/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Toggle>
      <Bold />
    </Toggle>
  ),
}

export const Outline: Story = {
  render: () => (
    <Toggle variant="outline">
      <Italic />
    </Toggle>
  ),
}

export const Small: Story = {
  render: () => (
    <Toggle size="sm">
      <Bold />
    </Toggle>
  ),
}

export const Large: Story = {
  render: () => (
    <Toggle size="lg">
      <Bold />
    </Toggle>
  ),
}

export const WithText: Story = {
  render: () => (
    <Toggle>
      <Bold />
      加粗
    </Toggle>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Toggle disabled>
      <Underline />
    </Toggle>
  ),
}

export const Group: Story = {
  render: () => (
    <div className="flex gap-1">
      <Toggle>
        <Bold />
      </Toggle>
      <Toggle>
        <Italic />
      </Toggle>
      <Toggle>
        <Underline />
      </Toggle>
    </div>
  ),
}
