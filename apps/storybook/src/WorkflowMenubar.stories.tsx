import type { Meta, StoryObj } from '@storybook/react'
import { WorkflowMenubar } from '@sker/ui/components/workflow/workflow-menubar'

const meta = {
  title: 'Workflow/WorkflowMenubar',
  component: WorkflowMenubar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkflowMenubar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onRun: () => console.log('Run workflow'),
    onCancel: () => console.log('Cancel workflow'),
    onSave: () => console.log('Save workflow'),
    onExport: () => console.log('Export workflow'),
    onImport: () => console.log('Import workflow'),
    onSettings: () => console.log('Open settings'),
    onSchedule: () => console.log('Create schedule'),
    onScheduleList: () => console.log('Open schedule list'),
    onRunHistory: () => console.log('Open run history'),
    onZoomIn: () => console.log('Zoom in'),
    onZoomOut: () => console.log('Zoom out'),
    onFitView: () => console.log('Fit view'),
    onCollapseNodes: () => console.log('Collapse nodes'),
    onExpandNodes: () => console.log('Expand nodes'),
    onAutoLayout: () => console.log('Auto layout'),
    onUndo: () => console.log('Undo'),
    onRedo: () => console.log('Redo'),
    canUndo: true,
    canRedo: true,
    isRunning: false,
    isSaving: false,
  },
}

export const Running: Story = {
  args: {
    ...Default.args,
    isRunning: true,
  },
}

export const Saving: Story = {
  args: {
    ...Default.args,
    isSaving: true,
  },
}

export const NoUndoRedo: Story = {
  args: {
    ...Default.args,
    canUndo: false,
    canRedo: false,
  },
}

export const MinimalActions: Story = {
  args: {
    onRun: () => console.log('Run workflow'),
    onCancel: () => console.log('Cancel workflow'),
    onSave: () => console.log('Save workflow'),
  },
}
