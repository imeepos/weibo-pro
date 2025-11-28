import type { Meta, StoryObj } from '@storybook/react'
import { WorkflowCanvas } from '@sker/ui/components/workflow'
import { WorkflowNode } from '@sker/ui/components/workflow'
import { WorkflowEdge } from '@sker/ui/components/workflow'

const meta = {
  title: 'Workflow/WorkflowCanvas',
  component: WorkflowCanvas,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkflowCanvas>

export default meta
type Story = StoryObj<typeof meta>

// 自定义节点类型
const nodeTypes = {
  custom: WorkflowNode,
}

// 自定义边类型
const edgeTypes = {
  custom: WorkflowEdge,
}

// 基础示例节点数据
const basicNodes = [
  {
    id: '1',
    type: 'custom',
    position: { x: 100, y: 100 },
    data: {
      label: '开始节点',
      type: 'start',
      status: 'idle'
    },
  },
  {
    id: '2',
    type: 'custom',
    position: { x: 300, y: 100 },
    data: {
      label: '处理节点',
      type: 'process',
      status: 'running',
      progress: 50
    },
  },
  {
    id: '3',
    type: 'custom',
    position: { x: 500, y: 100 },
    data: {
      label: '结束节点',
      type: 'end',
      status: 'success'
    },
  },
]

// 基础示例边数据
const basicEdges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'custom',
    data: { label: '连接' },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    type: 'custom',
    data: { label: '连接' },
  },
]

// 复杂示例节点数据
const complexNodes = [
  {
    id: 'start',
    type: 'custom',
    position: { x: 100, y: 200 },
    data: {
      label: '开始',
      type: 'start',
      status: 'idle'
    },
  },
  {
    id: 'process1',
    type: 'custom',
    position: { x: 300, y: 100 },
    data: {
      label: '数据处理',
      type: 'process',
      status: 'running',
      progress: 75
    },
  },
  {
    id: 'process2',
    type: 'custom',
    position: { x: 300, y: 300 },
    data: {
      label: '数据分析',
      type: 'process',
      status: 'success'
    },
  },
  {
    id: 'end',
    type: 'custom',
    position: { x: 500, y: 200 },
    data: {
      label: '结束',
      type: 'end',
      status: 'idle'
    },
  },
]

// 复杂示例边数据
const complexEdges = [
  {
    id: 'e1',
    source: 'start',
    target: 'process1',
    type: 'custom',
    data: { label: '分支1' },
  },
  {
    id: 'e2',
    source: 'start',
    target: 'process2',
    type: 'custom',
    data: { label: '分支2' },
  },
  {
    id: 'e3',
    source: 'process1',
    target: 'end',
    type: 'custom',
    data: { label: '结果1' },
  },
  {
    id: 'e4',
    source: 'process2',
    target: 'end',
    type: 'custom',
    data: { label: '结果2' },
  },
]

export const Basic: Story = {
  render: () => (
    <div className="h-[500px] border border-border rounded-lg">
      <WorkflowCanvas
        nodes={basicNodes}
        edges={basicEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        showControls={true}
        showMiniMap={true}
        showBackground={true}
      />
    </div>
  ),
}

export const Complex: Story = {
  render: () => (
    <div className="h-[600px] border border-border rounded-lg">
      <WorkflowCanvas
        nodes={complexNodes}
        edges={complexEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        showControls={true}
        showMiniMap={true}
        showBackground={true}
      />
    </div>
  ),
}

export const Empty: Story = {
  render: () => (
    <div className="h-[400px] border border-border rounded-lg">
      <WorkflowCanvas
        nodes={[]}
        edges={[]}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        showControls={true}
        showMiniMap={true}
        showBackground={true}
      />
    </div>
  ),
}

export const Minimal: Story = {
  render: () => (
    <div className="h-[400px] border border-border rounded-lg">
      <WorkflowCanvas
        nodes={basicNodes}
        edges={basicEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        showControls={false}
        showMiniMap={false}
        showBackground={false}
      />
    </div>
  ),
}

export const WithCallbacks: Story = {
  render: () => (
    <div className="h-[500px] border border-border rounded-lg">
      <WorkflowCanvas
        nodes={basicNodes}
        edges={basicEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        showControls={true}
        showMiniMap={true}
        showBackground={true}
        onRun={() => console.log('运行工作流')}
        onSave={() => console.log('保存工作流')}
        onExport={(format) => console.log(`导出为 ${format}`)}
        onImport={(data) => console.log('导入数据:', data)}
      />
    </div>
  ),
}