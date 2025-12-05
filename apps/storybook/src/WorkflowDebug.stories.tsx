import type { Meta, StoryObj } from '@storybook/react'
import { ReactFlow, ReactFlowProvider, Background, Controls, useNodesState, useEdgesState, Panel } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { WorkflowNode } from '@sker/ui/components/workflow'
import type { INodeInputMetadata, INodeOutputMetadata, IAstStates } from '@sker/workflow'

const meta = {
  title: 'Workflow/DebugConnection',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// 定义节点 data 属性的类型
type DebugNodeData = {
  label: string
  description?: string
  type: string
  status: IAstStates
  inputs?: INodeInputMetadata[]
  outputs?: INodeOutputMetadata[]
}

// 定义完整的节点类型
type DebugNode = Node<DebugNodeData>

// 调试用节点组件
function DebugNodeComponent({ id, data, selected }: NodeProps<DebugNode>) {
  return (
    <div style={{ border: '2px solid red', padding: '10px' }}>
      <div>Node ID: {id}</div>
      <div>Inputs: {data.inputs?.length || 0}</div>
      <div>Outputs: {data.outputs?.length || 0}</div>
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
    </div>
  )
}

// 自定义节点类型
const nodeTypes = {
  debugNode: DebugNodeComponent,
}

// 调试案例
export const DebugConnection: Story = {
  render: () => {
    const initialNodes = [
      {
        id: '1',
        type: 'debugNode',
        position: { x: 100, y: 150 },
        data: {
          label: '源节点',
          description: '测试源',
          type: 'text',
          status: 'pending',
          inputs: [{ property: 'input', title: '输入' }] as INodeInputMetadata[],
          outputs: [{ property: 'output', title: '输出' }] as INodeOutputMetadata[],
        },
      },
      {
        id: '2',
        type: 'debugNode',
        position: { x: 500, y: 150 },
        data: {
          label: '目标节点',
          description: '测试目标',
          type: 'text',
          status: 'pending',
          inputs: [{ property: 'input', title: '输入' }] as INodeInputMetadata[],
          outputs: [{ property: 'output', title: '输出' }] as INodeOutputMetadata[],
        },
      },
    ]

    const initialEdges = [
      {
        id: 'e1-2',
        source: '1',
        target: '2',
        sourceHandle: 'output',
        targetHandle: 'input',
        animated: true,
        style: { stroke: '#ff0000', strokeWidth: 3 },
      },
    ]

    return (
      <div className="w-full h-screen">
        <ReactFlowProvider>
          <InteractiveDebugFlow initialNodes={initialNodes} initialEdges={initialEdges} />
        </ReactFlowProvider>
      </div>
    )
  },
}

// 可拖动的调试组件
function InteractiveDebugFlow({ initialNodes, initialEdges }: any) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="w-full h-screen">
      <Panel position="top-left" className="bg-background p-4 rounded-lg shadow-lg border">
        <h3 className="font-semibold mb-2">调试信息</h3>
        <div className="text-xs space-y-1">
          <div>节点数: {nodes.length}</div>
          <div>连线数: {edges.length}</div>
          <div className="mt-2">
            <div className="font-semibold">边信息:</div>
            {edges.map(edge => (
              <div key={edge.id} className="ml-2">
                {edge.source}[{edge.sourceHandle}] → {edge.target}[{edge.targetHandle}]
              </div>
            ))}
          </div>
        </div>
      </Panel>
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
        defaultEdgeOptions={{
          style: { stroke: '#00ff00', strokeWidth: 4 },
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
