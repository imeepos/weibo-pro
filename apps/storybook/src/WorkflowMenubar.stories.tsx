import type { Meta, StoryObj } from '@storybook/react'
import { WorkflowMenubar } from '@sker/ui/components/workflow/workflow-menubar'

const meta: Meta<typeof WorkflowMenubar> = {
  title: 'Workflow/WorkflowMenubar',
  component: WorkflowMenubar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-8">
        <Story />
      </div>
    ),
  ],
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

/**
 * Dark 模式预览
 *
 * 展示 Menubar 在深色主题下的表现：
 * - 背景自动变为深色
 * - 文字自动变为浅色
 * - 悬停效果自适应
 * - 阴影加深以提升层次感
 */
export const DarkMode: Story = {
  args: {
    ...Default.args,
  },
  decorators: [
    (Story) => (
      <div className="dark min-h-[400px] bg-gray-950 p-8">
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

/**
 * 主题对比（并排展示）
 *
 * 同时展示 Light 和 Dark 模式，方便对比
 */
export const ThemeComparison: Story = {
  args: {
    ...Default.args,
  },
  decorators: [
    (Story) => (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Light 模式 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Light Mode</h3>
          <div className="rounded-lg border bg-white p-8">
            <Story />
          </div>
        </div>

        {/* Dark 模式 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-100">Dark Mode</h3>
          <div className="dark rounded-lg border border-gray-800 bg-gray-950 p-8">
            <Story />
          </div>
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'padded',
  },
}
