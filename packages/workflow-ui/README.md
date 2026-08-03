# @sker/workflow-ui

工作流可视化编辑器：基于 React Flow + Zustand 的节点渲染与编辑包，将 `@sker/workflow-ast` 的节点转换为可交互的 React 组件。

## 核心职责

- **节点渲染**：`renderers/`（87 个）通过 `@Render` 装饰器将每个 AST 节点映射到对应的 React 渲染器，元数据驱动自动生成 UI
- **可视化编辑**：`WorkflowCanvas` 主画布（拖拽、连线、缩放、多选）、`NodePalette` 节点面板、`PropertyPanel` 属性面板
- **双向转换**：`adapters/` 实现 Ast ↔ React Flow 互转（`astToFlow` / `flowToAst` / `getNodeMetadata`）
- **状态管理**：基于 Zustand 的 stores（工作流、选择、执行、历史、派生节点工作台）
- **交互控制**：节点操作、连线验证、键盘快捷键、自动保存、撤销/重做、AI 导出
- **执行监控**：`InlineExecutor` / `WeiboLoginExecutor` 内联执行器与 `useStreamingExecution` 实时执行状态

## 目录结构

```
packages/workflow-ui/src/
├── index.ts                  # 公共 API 入口（导入渲染器并导出组件/hooks/stores/适配器）
├── renderers/                # 节点渲染器（87 个 .tsx）：WorkflowGraphAstRender、LlmTextAgentAstRender、
│                             #   WeiboLoginAstPreview、ScheduledWorkflowAstRender 等（含 index.ts 批量注册）
├── components/               # React 组件
│   ├── WorkflowCanvas/       # 主画布：CanvasRenderer、EdgeConfigDialog、RunHistoryPanel、ScheduleDialog、
│   │                         #   AiExportDialog、TimeTravelDebugger、hooks/（useEventHandlers 等）
│   ├── NodePalette/          # 节点面板：NodeCard、useNodeRegistry
│   ├── PropertyPanel/        # 属性面板：PropertyField、SmartFormField、PortDialog
│   ├── DerivedNodeWorkbench/ # 派生节点工作台：MetaNodePicker、NodePreview、steps/（BasicInfoStep 等）
│   ├── LeftDrawer/           # 左侧抽屉：NodeRunHistory
│   ├── ErrorDetail/          # 错误详情组件
│   ├── nodes/                # 节点组件：BaseNode、GroupNode、NodeInfoDialog
│   ├── edges/                # 边组件（index.ts）
│   └── execution/            # 执行器：InlineExecutor（含 WeiboLoginExecutor）
├── adapters/                 # 适配层：ast-to-flow.ts、flow-to-ast.ts、metadata.ts、index.ts
├── store/                    # Zustand stores：workflow.store、selection.store、execution.store、
│                             #   history.store、derived-node-workbench.store
├── hooks/                    # React hooks：useWorkflow、useWorkflowExecution、useKeyboardShortcuts、
│                             #   useTimeTravel、useAutoSave、useClipboard 等
├── services/                 # derived-node.api.ts（派生节点 API）、node-execution-manager.ts
├── context/                  # workflow-operations.tsx（React Context）
├── core/                     # state-change-proxy.ts（状态变更代理）
├── types/                    # 节点/边类型定义：node.types、edge.types、index.ts
├── utils/                    # cn、layout（dagre 自动布局）、validation、edgeValidator、ai-export、ai-fill
└── styles/                   # globals.css（Tailwind 样式）
```

## 边界

- **✅ 负责**：工作流的可视化呈现与交互编辑（画布、节点/边渲染、属性面板、执行监控、撤销/重做、AI 导出）、Ast ↔ React Flow 转换、元数据驱动的 UI 生成
- **❌ 不负责**：节点定义（属于 `@sker/workflow-ast`）、引擎核心与执行调度（属于 `@sker/workflow`）、后端真实执行（属于 `@sker/workflow-run`）、前端运行时执行器（属于 `@sker/workflow-browser`，本包通过它执行远程/本地逻辑）
- **对外依赖**：`@sker/workflow`、`@sker/workflow-ast`、`@sker/workflow-browser`、`@sker/ui`、`@sker/core`、`@sker/json-harmony`、`@sker/sdk`；外部：react、@xyflow/react、zustand、immer、dagre、framer-motion、clsx、sonner、react-markdown、cron-parser、radix-ui
- **被谁依赖**：apps：`bigscreen`、`storybook`

---

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
主画布组件，渲染工作流节点和边：

```tsx
<WorkflowCanvas
  showMiniMap={true}
  showControls={true}
  showBackground={true}
/>
```

### NodePalette
节点面板，展示所有可用节点并支持拖拽添加。

### PropertyPanel
属性编辑面板，编辑选中节点的输入属性。

## Stores

```ts
import { useWorkflowStore, useSelectionStore, useExecutionStore } from '@sker/workflow-ui'

// 工作流状态
const { nodes, edges, addNode, removeNode, toAst } = useWorkflowStore()
// 选择状态
const { selectedNodeId, selectNode, clearSelection } = useSelectionStore()
// 执行状态
const { isExecuting, nodeStates, startExecution } = useExecutionStore()
```

## 适配器

```ts
import { astToFlow, flowToAst, getAllNodeTypes } from '@sker/workflow-ui'

// Ast → React Flow
const { nodes, edges } = astToFlow(astNodes, astEdges)
// React Flow → Ast
const { nodes, edges } = flowToAst(flowNodes, flowEdges)
// 获取所有已注册节点
const nodeTypes = getAllNodeTypes()
```

## License

MIT
