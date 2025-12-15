# @sker/workflow-ui

工作流可视化编辑器 - 基于 React Flow 的节点渲染包

## 包概览

`@sker/workflow-ui` 是工作流系统的前端渲染层，负责将 AST 节点转换为可交互的 React 组件。它是 `@sker/workflow` 和 `@sker/workflow-ast` 的视觉化呈现，使用 `@Render` 装饰器将每个 AST 节点映射到对应的 React 渲染器。

**核心职责**：
- 节点渲染：通过 `@Render` 装饰器为每个 AST 类型提供 React 组件
- 可视化编辑：基于 React Flow 的画布编辑器（WorkflowCanvas）
- 状态同步：AST ↔ React Flow 双向转换
- 交互控制：节点操作、连线验证、键盘快捷键

## 技术栈

- **React 19** - UI 框架
- **@xyflow/react** - 可视化流程图库
- **Zustand** - 状态管理
- **Framer Motion** - 动画
- **Radix UI** - 无障碍组件
- **TailwindCSS** - 样式系统

## 目录结构

```
packages/workflow-ui/
├── src/
│   ├── renderers/              # 节点渲染器（核心）
│   │   ├── WeiboKeywordSearchAstRender.tsx
│   │   ├── PostNLPAnalyzerAstRender.tsx
│   │   ├── EventAutoCreatorAstRender.tsx
│   │   ├── LlmTextAgentAstRender.tsx
│   │   ├── WorkflowGraphAstRender.tsx
│   │   └── ... （46 个渲染器）
│   │
│   ├── components/             # React 组件
│   │   ├── nodes/             # 节点组件（BaseNode, GroupNode）
│   │   ├── edges/             # 边组件
│   │   ├── WorkflowCanvas/    # 主画布组件
│   │   ├── NodePalette/       # 节点面板
│   │   ├── PropertyPanel/     # 属性面板
│   │   ├── LeftDrawer/        # 左侧抽屉
│   │   └── execution/         # 执行器组件
│   │
│   ├── adapters/              # 适配器层
│   │   ├── metadata.ts        # 元数据提取（getNodeMetadata）
│   │   ├── flow-to-ast.ts     # React Flow → AST
│   │   ├── flow-ast-converter.ts  # AST → React Flow
│   │   └── index.ts
│   │
│   ├── store/                 # 状态管理
│   │   ├── workflow.store.ts  # 工作流状态
│   │   ├── selection.store.ts # 选择状态
│   │   ├── execution.store.ts # 执行状态
│   │   └── history.store.ts   # 历史记录
│   │
│   ├── hooks/                 # React Hooks
│   │   ├── useWorkflow.ts     # 工作流核心逻辑
│   │   ├── useAutoSave.ts     # 自动保存
│   │   ├── useWorkflowHistory.ts  # 撤销/重做
│   │   ├── useKeyboardShortcuts.ts  # 快捷键
│   │   └── useWorkflowExecution.ts  # 执行状态
│   │
│   ├── types/                 # TypeScript 类型定义
│   │   ├── node.types.ts      # 节点类型
│   │   ├── edge.types.ts      # 边类型
│   │   └── index.ts
│   │
│   ├── utils/                 # 工具函数
│   │   ├── cn.ts              # 类名合并
│   │   ├── validation.ts      # 验证逻辑
│   │   ├── layout.ts          # 自动布局（dagre）
│   │   ├── edgeValidator.ts   # 边验证
│   │   └── workflowFactory.ts # 工作流工厂
│   │
│   ├── context/               # React Context
│   │   └── workflow-operations.tsx
│   │
│   ├── core/                  # 核心逻辑
│   │   └── state-change-proxy.ts
│   │
│   ├── styles/                # 全局样式
│   │   └── globals.css
│   │
│   └── index.ts               # 公共 API 入口
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## 核心架构

### 1. 装饰器驱动渲染系统

#### `@Render` 装饰器

每个 AST 节点类型通过 `@Render(AstClass)` 装饰器注册对应的渲染器：

```typescript
import { Injectable } from "@sker/core"
import { Render } from "@sker/workflow"
import { WeiboKeywordSearchAst } from "@sker/workflow-ast"
import React from "react"

@Injectable()
export class WeiboKeywordSearchAstRender {
  @Render(WeiboKeywordSearchAst)
  render(ast: WeiboKeywordSearchAst) {
    return <WeiboKeywordSearchComponent ast={ast} />
  }
}

const WeiboKeywordSearchComponent: React.FC<{ ast: WeiboKeywordSearchAst }> = ({ ast }) => (
  <div className="node-content">
    {/* 自定义渲染逻辑 */}
  </div>
)
```

**工作原理**：
1. `@Injectable()` 将渲染器类注册到 DI 容器（`@sker/core`）
2. `@Render(AstClass)` 将渲染方法与 AST 类型绑定，存储到 `RENDER_METHOD` 元数据
3. `useRender` Hook 通过反射查找并调用对应渲染器

#### 渲染器调用流程

```
BaseNode（节点组件）
  ↓
useRender(ast) Hook
  ↓
从 DI 容器查询 RENDER_METHOD 元数据
  ↓
找到匹配 ast.type 的渲染器
  ↓
调用 render(ast) 方法
  ↓
返回 React 元素插入节点内容区
```

**核心代码**（`src/components/nodes/hook.tsx`）：
```typescript
export function useRender(ast: Ast) {
  return useMemo(() => {
    const methods = root.get(RENDER_METHOD, [])
    const method = methods.find(it => it.ast.name === ast.type)
    if (method) {
      const instance = root.get(method.target)
      const render = Reflect.get(instance, method.property)
      return render(ast)
    }
    return null
  }, [ast])
}
```

### 2. BaseNode - 节点数据适配器

`BaseNode` 是所有节点的统一容器，负责：
- 提取 AST 元数据（`metadata` 字段）
- 调用自定义渲染器（通过 `useRender`）
- 处理节点交互（折叠、右键菜单、双击）
- 传递数据给 `@sker/ui/WorkflowNode`（纯展示组件）

**关键代码**（`src/components/nodes/BaseNode.tsx`）：
```typescript
export const BaseNode = memo(({ id, data, selected }: NodeProps<WorkflowNodeType>) => {
  // 确保节点已编译（包含 metadata）
  let nodeToUse: INode
  if (!('metadata' in data && data.metadata)) {
    const compiler = root.get(Compiler)
    nodeToUse = compiler.compile(data as any)
  }

  const metadata = nodeToUse.metadata!
  const CustomRender = useRender(fromJson(data))  // 获取自定义渲染器

  return (
    <WorkflowNode
      id={id}
      type={data.type}
      label={data.name || metadata.class.title || data.type}
      inputs={metadata.inputs}
      outputs={metadata.outputs}
      status={data.state}
      {...otherProps}
    >
      {CustomRender}  {/* 自定义渲染器内容 */}
    </WorkflowNode>
  )
})
```

### 3. 元数据提取（Metadata Extraction）

**核心函数**：`getNodeMetadata(node: INode): NodeMetadata`

**职责**：
- 从编译后的节点提取 `inputs`/`outputs` 端口信息
- 自动编译未编译节点（防御性编程）
- 特殊处理 `WorkflowGraphAst`（动态计算端口）

**代码位置**：`src/adapters/metadata.ts`

```typescript
export function getNodeMetadata(node: INode): NodeMetadata {
  // 如果节点未编译，自动编译
  if (!isNode(node)) {
    const compiler = root.get(Compiler)
    node = compiler.compile(node)
  }

  let inputs: PortMetadata[] = node.metadata!.inputs.map(toPortMetadata)
  let outputs: PortMetadata[] = node.metadata!.outputs.map(toPortMetadata)

  // WorkflowGraphAst 特殊处理：动态计算暴露端口
  if (node.type === 'WorkflowGraphAst') {
    const exposedInputs = getExposedInputs(node)
    inputs = exposedInputs.map(input => ({
      property: `${input.nodeId}.${input.property}`,
      type: input.type || 'any',
      label: input.title || formatPortLabel(input.property),
      isMulti: false
    }))
    // 同样处理 outputs...
  }

  return {
    type: node.type,
    label: node.metadata!.class.title,
    inputs,
    outputs,
  }
}
```

### 4. AST ↔ React Flow 双向转换

#### AST → React Flow（`astToFlow`）

```typescript
export function astToFlow(workflowAst: WorkflowGraphAst): { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
```

**转换逻辑**：
- 节点：`INode` → `WorkflowNode`（添加 `position`, `selected`, `data.ast` 等 React Flow 字段）
- 边：`IEdge` → `WorkflowEdge`（映射 `source/target`, `sourceHandle/targetHandle`）

#### React Flow → AST（`flowToAst`）

```typescript
export function flowToAst(nodes: WorkflowNode[], edges: WorkflowEdge[]): { nodes: INode[]; edges: IEdge[] }
```

**转换逻辑**：
- 从 `node.data.ast` 提取原始 AST 实例
- 从 `edge.data` 构建 AST 边对象

**关键设计**：
- React Flow 节点的 `data` 字段直接包含完整的 AST 实例
- 所有 AST 修改通过 Immer 不可变更新，确保状态一致性

### 5. WorkflowCanvas - 主画布组件

**核心文件**：`src/components/WorkflowCanvas/index.tsx`

**职责**：
- 管理画布状态（节点、边、选择、执行）
- 处理用户交互（拖拽、连线、快捷键）
- 协调各子组件（NodePalette、PropertyPanel、LeftDrawer 等）
- 提供命令式 API（通过 `ref` 暴露）

**命令式 API**（`WorkflowCanvasRef`）：

```typescript
export interface WorkflowCanvasRef {
  // 文件操作
  importWorkflow: (json: string) => Promise<void>
  exportWorkflow: () => string

  // 执行控制
  runWorkflow: () => Promise<void>
  cancelWorkflow: () => void
  runNode: (nodeId: string) => Promise<void>
  runNodeIsolated: (nodeId: string) => Promise<void>

  // 视图操作
  autoLayout: (direction?: 'TB' | 'LR') => void
  fitView: () => void
  zoomIn: () => void
  zoomOut: () => void
  centerView: () => void
  locateNode: (nodeId: string) => void

  // 节点操作
  selectAll: () => void
  deleteSelection: () => void
  copyNodes: () => void
  pasteNodes: () => void

  // 数据访问
  getWorkflowAst: () => WorkflowGraphAst
  getSelectedNodes: () => INode[]
}
```

**使用示例**：

```tsx
import { WorkflowCanvas, WorkflowCanvasRef } from '@sker/workflow-ui'

const App = () => {
  const canvasRef = useRef<WorkflowCanvasRef>(null)

  const handleRun = () => {
    canvasRef.current?.runWorkflow()
  }

  const handleExport = () => {
    const json = canvasRef.current?.exportWorkflow()
    console.log(json)
  }

  return (
    <WorkflowCanvas
      ref={canvasRef}
      workflowAst={myWorkflowAst}
      showMiniMap={true}
      showControls={true}
      onSave={handleSave}
    />
  )
}
```

## 所有渲染器列表

### 微博 API 节点（9 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `WeiboKeywordSearchAstRender` | `WeiboKeywordSearchAst` | 微博关键词搜索 |
| `WeiboAjaxStatusesShowAstRender` | `WeiboAjaxStatusesShowAst` | 获取微博详情 |
| `WeiboAjaxStatusesCommentAstRender` | `WeiboAjaxStatusesCommentAst` | 获取微博评论 |
| `WeiboAjaxStatusesLikeShowAstRender` | `WeiboAjaxStatusesLikeShowAst` | 获取点赞列表 |
| `WeiboAjaxStatusesRepostTimelineAstRender` | `WeiboAjaxStatusesRepostTimelineAst` | 获取转发列表 |
| `WeiboAjaxFeedHotTimelineAstRender` | `WeiboAjaxFeedHotTimelineAst` | 获取热门微博流 |
| `WeiboAjaxFriendshipsAstRender` | `WeiboAjaxFriendshipsAst` | 获取关注/粉丝列表 |
| `WeiboAjaxProfileInfoAstRender` | `WeiboAjaxProfileInfoAst` | 获取用户资料 |
| `WeiboAjaxStatusesMymblogAstRender` | `WeiboAjaxStatusesMymblogAst` | 获取用户微博列表 |

### 微博业务节点（4 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `PostContextCollectorAstRender` | `PostContextCollectorAst` | 收集微博上下文（评论+转发） |
| `PostNLPAnalyzerAstRender` | `PostNLPAnalyzerAst` | NLP 情感分析 |
| `EventAutoCreatorAstRender` | `EventAutoCreatorAst` | 自动创建舆情事件 |
| `WeiboUserDetectionAstRender` | `WeiboUserDetectionAst` | 用户检测 |

### 微博账号管理（2 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `WeiboAccountPickAstRender` | `WeiboAccountPickAst` | 选择微博账号 |
| `WeiboLoginAstRender` | `WeiboLoginAst` | 微博登录 |

### LLM Agent 节点（3 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `LlmTextAgentAstRender` | `LlmTextAgentAst` | 文本 Agent |
| `LlmStructuredOutputAstRender` | `LlmStructuredOutputAst` | 结构化输出 |
| `LlmCategoryAstRender` | `LlmCategoryAst` | 分类 Agent |

### 控制流节点（2 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `SwitchAstRender` | `SwitchAst` | 条件分支 |
| `LoopAstRender` | `LoopAst` | 循环 |

### 数据处理节点（3 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `FilterAstRender` | `FilterAst` | 数据过滤 |
| `MergeAstRender` | `MergeAst` | 数据合并 |
| `CollectorAstRender` | `CollectorAst` | 数据收集器 |

### 消息队列节点（2 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `MqPushAstRender` | `MqPushAst` | 推送消息到队列 |
| `MqPullAstRender` | `MqPullAst` | 从队列拉取消息 |

### 存储节点（2 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `StoreGetAstRender` | `StoreGetAst` | 从存储读取 |
| `StoreSetAstRender` | `StoreSetAst` | 写入存储 |

### 媒体节点（3 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `ImageAstRender` | `ImageAst` | 图片节点 |
| `VideoAstRender` | `VideoAst` | 视频节点 |
| `AudioAstRender` | `AudioAst` | 音频节点 |

### 基础输入节点（2 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `TextAreaAstRender` | `TextAreaAst` | 文本输入 |
| `DateAstRender` | `DateAst` | 日期选择 |

### 研究 Agent 节点（6 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `QueryRewriterAstRender` | `QueryRewriterAst` | 查询重写 |
| `ResearchPlannerAstRender` | `ResearchPlannerAst` | 研究规划 |
| `AnswerFinalizerAstRender` | `AnswerFinalizerAst` | 答案终稿器 |
| `AnswerEvaluatorAstRender` | `AnswerEvaluatorAst` | 答案评估器 |
| `ErrorAnalyzerAstRender` | `ErrorAnalyzerAst` | 错误分析器 |
| `SerpClusterAstRender` | `SerpClusterAst` | 搜索结果聚类 |

### 角色系统节点（3 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `PersonaAstRender` | `PersonaAst` | 角色记忆 |
| `PersonaCreatorAstRender` | `PersonaCreatorAst` | 创建人物角色 |
| `PromptRoleSkillAstRender` | `PromptRoleSkillAst` | 角色技能提示词 |

### 工作流系统节点（3 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `WorkflowGraphAstRender` | `WorkflowGraphAst` | 子工作流节点 |
| `GroupChatLoopAstRender` | `GroupChatLoopAst` | 群聊循环 |
| `ScheduledWorkflowAstRender` | `ScheduledWorkflowAst` | 定时工作流 |

### 其他（1 个）

| 渲染器类 | 对应 AST | 功能 |
|---------|----------|------|
| `ShareAstVisitor` | - | 分享访问器 |

**总计**：46 个渲染器

## 添加新渲染器的步骤

### 1. 创建渲染器文件

在 `packages/workflow-ui/src/renderers/` 创建新文件：

```typescript
// MyCustomAstRender.tsx
import { Injectable } from "@sker/core"
import { Render } from "@sker/workflow"
import { MyCustomAst } from "@sker/workflow-ast"
import React from "react"

// 自定义 React 组件（可选）
const MyCustomComponent: React.FC<{ ast: MyCustomAst }> = ({ ast }) => (
  <div className="custom-node-content">
    <p>自定义内容：{ast.someProperty}</p>
  </div>
)

// 渲染器类
@Injectable()
export class MyCustomAstRender {
  @Render(MyCustomAst)
  render(ast: MyCustomAst) {
    return <MyCustomComponent ast={ast} />
  }
}
```

### 2. 导出渲染器

在 `packages/workflow-ui/src/renderers/index.ts` 添加导出：

```typescript
export * from './MyCustomAstRender'
```

### 3. 确保自动注册

渲染器会在 `src/index.ts` 中自动导入：

```typescript
// 导入渲染器（确保装饰器注册）
import './renderers'
```

这会触发所有 `@Render` 装饰器执行，将渲染器注册到 DI 容器。

### 4. 验证渲染器

在 WorkflowCanvas 中拖拽添加对应节点，应自动调用你的渲染器。

## 核心 Hooks

### `useWorkflow` - 工作流核心逻辑

**功能**：
- 管理节点和边的状态
- 提供节点/边的增删改查操作
- 同步 AST 与 React Flow 状态
- 支持撤销/重做（内置历史记录）

**使用**：

```typescript
const workflow = useWorkflow(initialWorkflowAst, {
  onWorkflowChange: () => {
    console.log('工作流已变化')
  }
})

// 访问状态
const nodes = workflow.nodes
const edges = workflow.edges

// 操作节点
workflow.addNode(NodeClass, position, label)
workflow.removeNode(nodeId)
workflow.updateNode(nodeId, updates)

// 操作边
workflow.connectNodes(connection)
workflow.removeEdge(edge)

// 撤销/重做
workflow.undo()
workflow.redo()
```

### `useAutoSave` - 自动保存

**功能**：
- 防抖保存（默认 1 秒）
- 保存视图窗口状态（viewport）
- 可手动触发保存

**使用**：

```typescript
const { triggerSave, saveNow } = useAutoSave(workflowAst, {
  debounce: 1000,
  enabled: true,
  onSaveSuccess: () => console.log('保存成功'),
  onSaveError: (error) => console.error('保存失败', error),
  getViewport
})

// 触发防抖保存
triggerSave()

// 立即保存
saveNow()
```

### `useKeyboardShortcuts` - 快捷键

**支持的快捷键**：

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+C` | 复制节点 |
| `Ctrl+X` | 剪切节点 |
| `Ctrl+V` | 粘贴节点 |
| `Delete` | 删除选中 |
| `Ctrl+A` | 全选 |
| `Ctrl+S` | 保存工作流 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Shift+Z` | 重做 |
| `Ctrl+G` | 创建分组 |
| `Ctrl+Shift+G` | 取消分组 |
| `Ctrl+L` | 自动布局 |

## 状态管理（Zustand）

### `useWorkflowStore` - 工作流状态

```typescript
const { nodes, edges, setNodes, setEdges } = useWorkflowStore()
```

### `useSelectionStore` - 选择状态

```typescript
const { selectedNodes, selectNode, clearSelection } = useSelectionStore()
```

### `useExecutionStore` - 执行状态

```typescript
const { isRunning, currentNode, setRunning } = useExecutionStore()
```

## 边验证（Edge Validation）

**核心函数**：`validateEdge(edge, nodes, edges): { valid: boolean; errors: string[] }`

**验证规则**：
1. **类型匹配**：输出端口类型必须兼容输入端口类型
2. **防止循环**：检测边是否导致有向无环图（DAG）变成循环图
3. **重复连接**：防止同一对端口多次连接
4. **多值输入**：非 `isMulti` 输入端口只能接受一条边

**代码位置**：`src/utils/edgeValidator.ts`

## 自动布局

**算法**：Dagre（分层布局）

**使用**：

```typescript
import { autoLayout } from '@sker/workflow-ui'

// 自动布局节点（从左到右）
const layoutedNodes = autoLayout(nodes, edges, 'LR')

// 自动布局节点（从上到下）
const layoutedNodes = autoLayout(nodes, edges, 'TB')
```

**代码位置**：`src/utils/layout.ts`

## 公共 API

### 导出的组件

```typescript
export { WorkflowCanvas } from './components/WorkflowCanvas'
export { NodePalette } from './components/NodePalette'
export { PropertyPanel } from './components/PropertyPanel'
export { createNodeTypes } from './components/nodes'
export { edgeTypes } from './components/edges'
```

### 导出的 Hooks

```typescript
export { useWorkflow } from './hooks'
export { useAutoSave } from './hooks'
export { useWorkflowHistory } from './hooks'
```

### 导出的适配器

```typescript
export { getNodeMetadata, getAllNodeTypes, astToFlow, flowToAst } from './adapters'
```

### 导出的类型

```typescript
export type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowCanvasState,
  NodeMetadata,
  PortMetadata,
  NodeHandleConfig,
  EdgeValidation,
}
```

## 使用示例

### 基础用法

```tsx
import { WorkflowCanvas, ReactFlowProvider } from '@sker/workflow-ui'
import { createWorkflowGraphAst } from '@sker/workflow'

const App = () => {
  const workflowAst = createWorkflowGraphAst({ name: 'My Workflow' })

  return (
    <ReactFlowProvider>
      <WorkflowCanvas
        workflowAst={workflowAst}
        showMiniMap={true}
        showControls={true}
        onSave={() => console.log('保存工作流')}
      />
    </ReactFlowProvider>
  )
}
```

### 命令式 API

```tsx
import { WorkflowCanvas, WorkflowCanvasRef } from '@sker/workflow-ui'

const App = () => {
  const canvasRef = useRef<WorkflowCanvasRef>(null)

  return (
    <div>
      <button onClick={() => canvasRef.current?.runWorkflow()}>
        运行工作流
      </button>
      <button onClick={() => {
        const json = canvasRef.current?.exportWorkflow()
        console.log(json)
      }}>
        导出 JSON
      </button>

      <WorkflowCanvas ref={canvasRef} />
    </div>
  )
}
```

### 自定义节点渲染器

```tsx
// 1. 定义 AST 类型
import { Node, Input, Output } from '@sker/workflow'

@Node({ title: '自定义节点' })
class CustomAst {
  @Input() inputText: string = ''
  @Output() outputResult: string = ''
}

// 2. 创建渲染器
import { Render } from '@sker/workflow'
import { Injectable } from '@sker/core'

@Injectable()
export class CustomAstRender {
  @Render(CustomAst)
  render(ast: CustomAst) {
    return (
      <div className="custom-node">
        <p>输入：{ast.inputText}</p>
        <p>输出：{ast.outputResult}</p>
      </div>
    )
  }
}

// 3. 导出渲染器
export * from './CustomAstRender'
```

## 测试

```bash
# 运行测试
pnpm test

# 测试 UI
pnpm test:ui

# 测试覆盖率
pnpm test:coverage
```

**测试文件位置**：
- `src/utils/cn.test.ts` - 类名合并工具测试
- `src/utils/validation.test.ts` - 验证逻辑测试
- `src/utils/layout.test.ts` - 自动布局测试
- `src/store/selection.store.test.ts` - 选择状态测试

## 构建

```bash
# 类型检查
pnpm check-types

# 代码检查
pnpm lint

# 构建（仅类型检查）
pnpm build
```

## 关键设计原则

### 1. 存在即合理（Existence Implies Necessity）

- **BaseNode 统一适配**：所有节点类型共享同一个 BaseNode 组件，通过 `useRender` 动态加载渲染器，避免为每个节点类型创建独立组件
- **元数据自包含**：编译后的节点包含完整 `metadata` 字段，无需依赖装饰器反射
- **最小化渲染器**：大多数渲染器返回空内容（`<></>`），因为节点的核心信息（输入/输出端口）已由 BaseNode + metadata 自动处理

### 2. 优雅即简约（Elegance is Simplicity）

- **装饰器驱动**：`@Render(AstClass)` 自动注册渲染器，无需手动维护映射表
- **双向绑定**：AST ↔ React Flow 自动同步，开发者只需关注 AST 数据
- **命令式 API**：通过 `ref` 暴露简洁的工作流操作接口

### 3. 性能即艺术（Performance is Art）

- **缓存 nodeTypes**：避免每次渲染重新创建导致 React Flow 重置
- **Immer 不可变更新**：确保状态变化可追踪，支持撤销/重做
- **防抖自动保存**：减少不必要的网络请求

## 与其他包的关系

```
@sker/workflow-ui（视觉层）
  ↓ 依赖
@sker/workflow（引擎核心）
  ↓ 依赖
@sker/workflow-ast（节点定义）
  ↓ 依赖
@sker/core（DI 容器）
```

**职责边界**：
- `@sker/workflow-ast`：定义节点类型（AST）
- `@sker/workflow`：执行引擎（Scheduler、Visitor）
- `@sker/workflow-ui`：可视化编辑器（React 组件）

## 常见问题

### Q: 为什么大多数渲染器返回空内容？

A: 节点的输入/输出端口信息已由 `metadata` 自动提供，BaseNode 会自动渲染端口。渲染器仅用于展示节点特定的自定义内容（如配置表单、预览）。

### Q: 如何自定义节点的输入/输出标签？

A: 在 AST 类中使用 `@Input({ title: '自定义标签' })` 或 `@Output({ title: '自定义标签' })`。

### Q: 如何实现条件分支？

A: 使用 `SwitchAst` 节点 + `IControlEdge`（带 `condition` 字段的边）。

### Q: 如何调试渲染器？

A: 在渲染器的 `render` 方法中添加 `console.log(ast)`，检查传入的 AST 数据。

## 参考资料

- [React Flow 文档](https://reactflow.dev/)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [Dagre 布局算法](https://github.com/dagrejs/dagre)
- [Radix UI 组件库](https://www.radix-ui.com/)
