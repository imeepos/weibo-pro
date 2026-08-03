import type { Meta, StoryObj } from '@storybook/react'
import { AlertDialog } from '@sker/ui/components/ui/alert-dialog'
import {
  DefaultRender,
  DeleteConfirmationRender,
  DeleteWorkflowRender,
  ClearDataRender,
  StopWorkflowRunRender,
  DeleteEventRender,
} from './AlertDialog.stories/components'
import {
  LongContentRender,
  CustomFooterRender,
  NoDescriptionRender,
  MultipleButtonsRender,
} from './AlertDialog.stories/components-more'

const meta = {
  title: 'UI/AlertDialog',
  component: AlertDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AlertDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  render: () => <DefaultRender />,
}

export const DeleteConfirmation: Story = {
  args: {},
  render: () => <DeleteConfirmationRender />,
}

export const DeleteWorkflow: Story = {
  args: {},
  render: () => <DeleteWorkflowRender />,
}

export const ClearData: Story = {
  args: {},
  render: () => <ClearDataRender />,
}

export const StopWorkflowRun: Story = {
  args: {},
  render: () => <StopWorkflowRunRender />,
}

export const DeleteEvent: Story = {
  args: {},
  render: () => <DeleteEventRender />,
}

export const LongContent: Story = {
  args: {},
  render: () => <LongContentRender />,
}

export const CustomFooter: Story = {
  args: {},
  render: () => <CustomFooterRender />,
}

export const NoDescription: Story = {
  args: {},
  render: () => <NoDescriptionRender />,
}

export const MultipleButtons: Story = {
  args: {},
  render: () => <MultipleButtonsRender />,
}
