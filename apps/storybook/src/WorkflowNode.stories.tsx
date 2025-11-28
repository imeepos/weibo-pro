import type { Meta, StoryObj } from '@storybook/react'
import { WorkflowNode } from '@sker/ui/components/workflow'

const meta = {
  title: 'Workflow/WorkflowNode',
  component: WorkflowNode,
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
    data: {
      label: '默认节点',
      type: 'process',
      status: 'idle'
    },
    selected: false,
  },
}

export const Selected: Story = {
  args: {
    id: '2',
    type: 'custom',
    data: {
      label: '选中节点',
      type: 'process',
      status: 'idle'
    },
    selected: true,
  },
}

export const Running: Story = {
  args: {
    id: '3',
    type: 'custom',
    data: {
      label: '运行中节点',
      type: 'process',
      status: 'running',
      progress: 60
    },
    selected: false,
  },
}

export const Success: Story = {
  args: {
    id: '4',
    type: 'custom',
    data: {
      label: '成功节点',
      type: 'process',
      status: 'success'
    },
    selected: false,
  },
}

export const Error: Story = {
  args: {
    id: '5',
    type: 'custom',
    data: {
      label: '错误节点',
      type: 'process',
      status: 'error'
    },
    selected: false,
  },
}

export const StartNode: Story = {
  args: {
    id: '6',
    type: 'custom',
    data: {
      label: '开始节点',
      type: 'start',
      status: 'idle'
    },
    selected: false,
  },
}

export const EndNode: Story = {
  args: {
    id: '7',
    type: 'custom',
    data: {
      label: '结束节点',
      type: 'end',
      status: 'idle'
    },
    selected: false,
  },
}

export const WithLongLabel: Story = {
  args: {
    id: '8',
    type: 'custom',
    data: {
      label: '这是一个非常长的节点标签名称，用于测试文本截断效果',
      type: 'process',
      status: 'idle'
    },
    selected: false,
  },
}