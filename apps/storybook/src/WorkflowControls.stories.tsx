import type { Meta, StoryObj } from '@storybook/react'
import { WorkflowCanvasControls } from '@sker/ui/components/workflow'

const meta = {
  title: 'Workflow/WorkflowControls',
  component: WorkflowCanvasControls,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkflowCanvasControls>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onRun: () => console.log('运行工作流'),
    onSave: () => console.log('保存工作流'),
    onExport: (format) => console.log(`导出为 ${format}`),
    onImport: (data) => console.log('导入数据:', data),
    onFitView: () => console.log('适应视图'),
    onZoomIn: () => console.log('放大'),
    onZoomOut: () => console.log('缩小'),
    onResetView: () => console.log('重置视图'),
  },
}

export const Minimal: Story = {
  args: {
    onRun: () => console.log('运行工作流'),
    onSave: () => console.log('保存工作流'),
  },
}

export const CustomPosition: Story = {
  render: () => (
    <div className="relative w-full h-[200px] border border-border rounded-lg">
      <WorkflowCanvasControls
        onRun={() => console.log('运行工作流')}
        onSave={() => console.log('保存工作流')}
        className="absolute bottom-4 right-4"
      />
    </div>
  ),
}