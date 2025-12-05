import type { Meta, StoryObj } from '@storybook/react'
import { ReactFlowProvider } from '@xyflow/react'
import { WorkflowNode } from '@sker/ui/components/workflow'
import type { IAstStates } from '@sker/workflow'

const meta: Meta<typeof WorkflowNode> = {
  title: 'Workflow/WorkflowNode',
  component: WorkflowNode,
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <div className="w-[300px] h-[200px]">
          <Story />
        </div>
      </ReactFlowProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkflowNode>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    id: '1',
    type: 'custom',
    label: '默认节点',
    status: 'pending' as IAstStates,
    selected: false,
  },
}

export const Selected: Story = {
  args: {
    id: '2',
    type: 'custom',
    label: '选中节点',
    status: 'pending' as IAstStates,
    selected: true,
  },
}

export const Running: Story = {
  args: {
    id: '3',
    type: 'custom',
    label: '运行中节点',
    status: 'running' as IAstStates,
    selected: false,
  },
}

export const Success: Story = {
  args: {
    id: '4',
    type: 'custom',
    label: '成功节点',
    status: 'success' as IAstStates,
    selected: false,
  },
}

export const Error: Story = {
  args: {
    id: '5',
    type: 'custom',
    label: '错误节点',
    status: 'fail' as IAstStates,
    selected: false,
  },
}

export const StartNode: Story = {
  args: {
    id: '6',
    type: 'custom',
    label: '开始节点',
    status: 'pending' as IAstStates,
    selected: false,
  },
}

export const EndNode: Story = {
  args: {
    id: '7',
    type: 'custom',
    label: '结束节点',
    status: 'pending' as IAstStates,
    selected: false,
  },
}

export const WithLongLabel: Story = {
  args: {
    id: '8',
    type: 'custom',
    label: '这是一个非常长的节点标签名称，用于测试文本截断效果',
    status: 'pending' as IAstStates,
    selected: false,
  },
}