import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { IconPicker } from '@sker/ui/components/ui/icon-picker'
import {
  DefaultRender,
  WithoutInitialValueRender,
  WithCustomTriggerRender,
  WithCustomPlaceholderRender,
  LimitedIconsRender,
  WithCustomTriggerStyleRender,
} from './IconPicker.stories/components'
import {
  InFormRender,
  MultipleInstancesRender,
  WorkflowNodeConfigRender,
  InteractiveDemoRender,
} from './IconPicker.stories/components-complex'

const meta = {
  title: 'UI/IconPicker',
  component: IconPicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof IconPicker>

export default meta
type Story = StoryObj<ReactRenderer>

export const Default: Story = {
  render: () => <DefaultRender />,
}

export const WithoutInitialValue: Story = {
  render: () => <WithoutInitialValueRender />,
}

export const WithCustomTrigger: Story = {
  render: () => <WithCustomTriggerRender />,
}

export const WithCustomPlaceholder: Story = {
  render: () => <WithCustomPlaceholderRender />,
}

export const LimitedIcons: Story = {
  render: () => <LimitedIconsRender />,
}

export const WithCustomTriggerStyle: Story = {
  render: () => <WithCustomTriggerStyleRender />,
}

export const InForm: Story = {
  render: () => <InFormRender />,
}

export const MultipleInstances: Story = {
  render: () => <MultipleInstancesRender />,
}

export const WorkflowNodeConfig: Story = {
  render: () => <WorkflowNodeConfigRender />,
}

export const InteractiveDemo: Story = {
  render: () => <InteractiveDemoRender />,
}
