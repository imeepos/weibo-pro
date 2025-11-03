# @sker/workflow-ui

工作流可视化 UI 组件库，基于 React Flow 构建，用于渲染和编辑 `@sker/workflow` 定义的工作流。

## 特性

- **元数据驱动**: 自动读取 `@Input`、`@Output` 装饰器元数据生成 UI
- **类型安全**: 完整的 TypeScript 类型支持
- **双向转换**: Ast ↔ React Flow 无缝转换
- **状态管理**: 基于 Zustand 的轻量级状态管理
- **可扩展**: 支持自定义节点和边渲染器

## 安装

```bash
pnpm add @sker/workflow-ui
```

## 快速开始

```tsx
import { ReactFlowProvider } from '@xyflow/react'
import { WorkflowCanvas, NodePalette, PropertyPanel } from '@sker/workflow-ui'
import '@xyflow/react/dist/style.css'

function App() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: '300px' }}>
        <NodePalette />
      </aside>
      <main style={{ flex: 1 }}>
        <ReactFlowProvider>
          <WorkflowCanvas />
        </ReactFlowProvider>
      </main>
      <aside style={{ width: '300px' }}>
        <PropertyPanel />
      </aside>
    </div>
  )
}
```

## 核心组件

### WorkflowCanvas

主画布组件，渲染工作流节点和边。

```tsx
<WorkflowCanvas
  showMiniMap={true}
  showControls={true}
  showBackground={true}
/>
```

### NodePalette

节点面板，展示所有可用节点并支持拖拽添加。

```tsx
<NodePalette />
```

### PropertyPanel

属性编辑面板，编辑选中节点的输入属性。

```tsx
<PropertyPanel />
```

## API

### Stores

```ts
import { useWorkflowStore, useSelectionStore, useExecutionStore } from '@sker/workflow-ui'

// 工作流状态
const { nodes, edges, addNode, removeNode, toAst } = useWorkflowStore()

// 选择状态
const { selectedNodeId, selectNode, clearSelection } = useSelectionStore()

// 执行状态
const { isExecuting, nodeStates, startExecution } = useExecutionStore()
```

### 适配器

```ts
import { astToFlow, flowToAst, getNodeMetadata, getAllNodeTypes } from '@sker/workflow-ui'

// Ast → React Flow
const { nodes, edges } = astToFlow(astNodes, astEdges)

// React Flow → Ast
const { nodes, edges } = flowToAst(flowNodes, flowEdges)

// 获取节点元数据
const metadata = getNodeMetadata(NodeClass)

// 获取所有已注册节点
const nodeTypes = getAllNodeTypes()
```

## 架构

详见 [TODO.md](./TODO.md) 查看完整的组件树结构和设计原则。

## License

MIT
