import type { Meta, StoryObj } from '@storybook/react'
import { ReactFlow, ReactFlowProvider, Background, Controls, useNodesState, useEdgesState } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { WorkflowNode } from '@sker/ui/components/workflow'
import type { INodeInputMetadata, INodeOutputMetadata, IAstStates } from '@sker/workflow'

const meta = {
  title: 'Workflow/NodeConnection',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// 定义节点 data 属性的类型
type TestNodeData = {
  label: string
  description?: string
  type: string
  status: IAstStates
  inputs?: INodeInputMetadata[]
  outputs?: INodeOutputMetadata[]
  collapsed?: boolean
}

// 定义完整的节点类型
type TestNode = Node<TestNodeData>

// 简化的测试节点组件
function TestNodeComponent({ id, data, selected }: NodeProps<TestNode>) {
  return (
    <WorkflowNode
      id={id}
      type={data.type}
      label={data.label}
      description={data.description}
      status={data.status}
      inputs={data.inputs || []}
      outputs={data.outputs || []}
      selected={selected}
    />
  )
}

// 自定义节点类型
const nodeTypes = {
  testNode: TestNodeComponent,
}

// 可拖动的交互式组件
function InteractiveFlow({ initialNodes, initialEdges }: any) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="w-full h-screen">
      <div className="absolute top-4 left-4 z-10 bg-background p-4 rounded-lg shadow-lg border border-border">
        <h3 className="font-semibold mb-2">拖动测试</h3>
        <p className="text-sm text-muted-foreground">
          🖱️ 拖动节点测试连线是否正确跟随
        </p>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        minZoom={0.5}
        maxZoom={2}
        nodesDraggable={true}
        elementsSelectable={true}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}

// 最简化测试 - 两个节点带连线（可拖动）
export const MinimalConnection: Story = {
  render: () => {
    const initialNodes = [
      {
        id: '1',
        type: 'testNode',
        position: { x: 100, y: 150 },
        data: {
          label: '节点 A',
          description: '源节点',
          type: 'text',
          status: 'pending',
          inputs: [{ property: '输入', title: '输入' }] as INodeInputMetadata[],
          outputs: [{ property: '输出', title: '输出' }] as INodeOutputMetadata[],
        },
      },
      {
        id: '2',
        type: 'testNode',
        position: { x: 500, y: 150 },
        data: {
          label: '节点 B',
          description: '目标节点',
          type: 'text',
          status: 'pending',
          inputs: [{ property: '输入', title: '输入' }] as INodeInputMetadata[],
          outputs: [{ property: '输出', title: '输出' }] as INodeOutputMetadata[],
        },
      },
    ]

    const initialEdges = [
      {
        id: 'e1-2',
        source: '1',
        target: '2',
        sourceHandle: '输出',
        targetHandle: '输入',
      },
    ]

    return (
      <ReactFlowProvider>
        <InteractiveFlow initialNodes={initialNodes} initialEdges={initialEdges} />
      </ReactFlowProvider>
    )
  },
}

// 测试折叠节点的连线
export const CollapsedNodesConnection: Story = {
  render: () => {
    const initialNodes = [
      {
        id: '1',
        type: 'testNode',
        position: { x: 100, y: 150 },
        data: {
          label: '折叠节点 A',
          description: '默认折叠',
          type: 'text',
          status: 'pending',
          inputs: [{ property: '输入', title: '输入' }] as INodeInputMetadata[],
          outputs: [{ property: '输出', title: '输出' }] as INodeOutputMetadata[],
          collapsed: true,  // 默认折叠
        },
      },
      {
        id: '2',
        type: 'testNode',
        position: { x: 500, y: 150 },
        data: {
          label: '折叠节点 B',
          description: '默认折叠',
          type: 'text',
          status: 'pending',
          inputs: [{ property: '输入', title: '输入' }] as INodeInputMetadata[],
          outputs: [{ property: '输出', title: '输出' }] as INodeOutputMetadata[],
          collapsed: true,  // 默认折叠
        },
      },
    ]

    const initialEdges = [
      {
        id: 'e1-2',
        source: '1',
        target: '2',
        sourceHandle: '输出',
        targetHandle: '输入',
        style: { stroke: '#ff0000', strokeWidth: 2 },
      },
    ]

    return (
      <ReactFlowProvider>
        <InteractiveFlow initialNodes={initialNodes} initialEdges={initialEdges} />
      </ReactFlowProvider>
    )
  },
}

// 测试多端口节点连线
export const MultiPortConnection: Story = {
  render: () => {
    const initialNodes = [
      {
        id: 'node1',
        type: 'testNode',
        position: { x: 100, y: 100 },
        data: {
          label: '多端口 A',
          type: 'custom',
          status: 'pending',
          inputs: [
            { property: 'input1', title: '输入1' },
            { property: 'input2', title: '输入2' },
          ] as INodeInputMetadata[],
          outputs: [
            { property: 'output1', title: '输出1' },
            { property: 'output2', title: '输出2' },
          ] as INodeOutputMetadata[],
        },
      },
      {
        id: 'node2',
        type: 'testNode',
        position: { x: 500, y: 100 },
        data: {
          label: '多端口 B',
          type: 'custom',
          status: 'pending',
          inputs: [
            { property: 'input1', title: '输入1' },
            { property: 'input2', title: '输入2' },
          ] as INodeInputMetadata[],
          outputs: [
            { property: 'output1', title: '输出1' },
            { property: 'output2', title: '输出2' },
          ] as INodeOutputMetadata[],
        },
      },
    ]

    const initialEdges = [
      {
        id: 'e1',
        source: 'node1',
        target: 'node2',
        sourceHandle: 'output1',
        targetHandle: 'input1',
      },
      {
        id: 'e2',
        source: 'node1',
        target: 'node2',
        sourceHandle: 'output2',
        targetHandle: 'input2',
      },
    ]

    return (
      <ReactFlowProvider>
        <InteractiveFlow initialNodes={initialNodes} initialEdges={initialEdges} />
      </ReactFlowProvider>
    )
  },
}
