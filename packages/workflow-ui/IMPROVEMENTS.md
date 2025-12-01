# WorkflowCanvas 改进说明

## 概览

本次改进借鉴了 Loomart FlowCanvas 的优雅设计，为 Weibo-Pro WorkflowCanvas 添加了三个核心功能模块：

1. **边验证器** (`edgeValidator.ts`) - 可配置的边验证规则系统
2. **工作流工厂** (`workflowFactory.ts`) - 工作流创建和操作的纯函数集合
3. **命令式 API** (`useImperativeHandle`) - 通过 ref 暴露的命令式接口

---

## 1. 边验证器 (edgeValidator.ts)

### 设计理念

- ✅ **纯函数设计** - 无副作用，易于测试
- ✅ **规则可配置** - 可以为不同场景启用不同的验证规则
- ✅ **详细错误信息** - 帮助用户快速定位问题

### 内置验证规则

```typescript
const EDGE_VALIDATION_RULES = [
  { name: 'nodes-exist', errorMessage: '源节点或目标节点不存在' },
  { name: 'no-self-connection', errorMessage: '不允许节点连接到自己' },
  { name: 'no-duplicate', errorMessage: '不允许重复连接' },
  { name: 'input-single-connection', errorMessage: '此输入端口不支持多条连接' },
  { name: 'no-cycle', errorMessage: '不允许创建环路' },
]
```

### 使用示例

```typescript
import { validateEdge, validateEdges, validateEdgesDetailed } from '@sker/workflow-ui/utils/edgeValidator'

// 验证单条边
const { valid, errors } = validateEdge(edge, nodes, edges)
if (!valid) {
  console.error('边验证失败:', errors.join('; '))
}

// 批量验证并过滤
const validEdges = validateEdges(edges, nodes)

// 批量验证并获取详细信息
const { validEdges, invalidEdges } = validateEdgesDetailed(edges, nodes)
invalidEdges.forEach(({ edge, errors }) => {
  console.log(`边 ${edge.source} → ${edge.target} 验证失败:`, errors)
})

// 自定义验证规则
const customRules = [
  ...EDGE_VALIDATION_RULES,
  {
    name: 'max-connections',
    validate: (edge, nodes, edges) => {
      const sourceConnections = edges.filter(e => e.source === edge.source)
      return sourceConnections.length < 10
    },
    errorMessage: '每个节点最多只能有10个输出连接'
  }
]

const result = validateEdge(edge, nodes, edges, customRules)
```

### 集成位置

1. **连接时验证** - `WorkflowCanvas.handleConnectInternal()`
2. **导入时清理** - `useFileOperations.processImportFile()`

---

## 2. 工作流工厂 (workflowFactory.ts)

### 设计理念

- ✅ **纯函数** - 所有函数都是纯函数，便于测试和组合
- ✅ **职责单一** - 每个函数只做一件事
- ✅ **错误处理** - 返回 `{ workflow, errors }` 结构，便于批量展示错误

### 核心函数

#### 1. 创建空白工作流

```typescript
import { createEmptyWorkflow } from '@sker/workflow-ui/utils/workflowFactory'

const workflow = createEmptyWorkflow('我的工作流')
```

#### 2. 从 JSON 创建工作流（带验证）

```typescript
import { createWorkflowFromJson } from '@sker/workflow-ui/utils/workflowFactory'

const { workflow, errors } = createWorkflowFromJson(jsonString, {
  validateEdges: true,      // 验证并清理非法边
  initializeStates: true,   // 初始化节点状态
  fallbackName: 'Untitled'  // 默认名称
})

if (errors.length > 0) {
  console.warn('导入警告:', errors)
}
```

#### 3. 克隆工作流

```typescript
import { cloneWorkflow } from '@sker/workflow-ui/utils/workflowFactory'

// 基础克隆
const cloned = cloneWorkflow(originalWorkflow, {
  newName: '副本',
  regenerateIds: true,  // 重新生成所有 ID
  offset: { x: 50, y: 50 }  // 位置偏移
})
```

#### 4. 合并工作流

```typescript
import { mergeWorkflows } from '@sker/workflow-ui/utils/workflowFactory'

const merged = mergeWorkflows(mainWorkflow, templateWorkflow, {
  position: { x: 100, y: 100 },  // 模板插入位置
  validateEdges: true             // 验证合并后的边
})
```

#### 5. 提取子工作流

```typescript
import { extractSubWorkflow } from '@sker/workflow-ui/utils/workflowFactory'

const selectedNodeIds = ['node1', 'node2', 'node3']
const subWorkflow = extractSubWorkflow(currentWorkflow, selectedNodeIds, '子流程1')
```

#### 6. 工作流统计

```typescript
import { getWorkflowStats } from '@sker/workflow-ui/utils/workflowFactory'

const stats = getWorkflowStats(workflow)
// {
//   nodeCount: 10,
//   edgeCount: 15,
//   nodeTypeDistribution: { 'WeiboKeywordSearchAst': 2, 'PostNLPAnalyzerAst': 3 },
//   maxDepth: 5,
//   hasCircularDependency: false
// }
```

#### 7. 查找特殊节点

```typescript
import {
  findIsolatedNodes,
  findEntryNodes,
  findExitNodes
} from '@sker/workflow-ui/utils/workflowFactory'

// 孤立节点（没有任何连接）
const isolated = findIsolatedNodes(workflow)

// 入口节点（没有输入连接）
const entries = findEntryNodes(workflow)

// 出口节点（没有输出连接）
const exits = findExitNodes(workflow)
```

---

## 3. 命令式 API (useImperativeHandle)

### 设计理念

- ✅ **外部控制** - 允许父组件通过 ref 主动调用画布功能
- ✅ **清晰的接口** - 类型安全的 API 定义
- ✅ **完整覆盖** - 涵盖文件、执行、视图、节点操作

### 接口定义

```typescript
export interface WorkflowCanvasRef {
  // 文件操作
  importWorkflow: (json: string) => Promise<void>
  exportWorkflow: () => string

  // 执行控制
  runWorkflow: () => Promise<void>
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

### 使用示例

```typescript
import { useRef } from 'react'
import { WorkflowCanvas, WorkflowCanvasRef } from '@sker/workflow-ui'

function MyApp() {
  const canvasRef = useRef<WorkflowCanvasRef>(null)

  const handleExport = () => {
    const json = canvasRef.current?.exportWorkflow()
    console.log('导出的工作流:', json)
  }

  const handleImport = async () => {
    const json = '...' // 从某处获取 JSON
    await canvasRef.current?.importWorkflow(json)
  }

  const handleRun = async () => {
    await canvasRef.current?.runWorkflow()
  }

  const handleAutoLayout = () => {
    canvasRef.current?.autoLayout('TB')
  }

  return (
    <div>
      <button onClick={handleExport}>导出</button>
      <button onClick={handleImport}>导入</button>
      <button onClick={handleRun}>运行</button>
      <button onClick={handleAutoLayout}>自动布局</button>

      <WorkflowCanvas ref={canvasRef} />
    </div>
  )
}
```

### 命令面板集成

```typescript
const commands = [
  {
    name: '自动布局',
    shortcut: 'Ctrl+Shift+L',
    action: () => canvasRef.current?.autoLayout()
  },
  {
    name: '全选',
    shortcut: 'Ctrl+A',
    action: () => canvasRef.current?.selectAll()
  },
  {
    name: '运行工作流',
    shortcut: 'Ctrl+Enter',
    action: () => canvasRef.current?.runWorkflow()
  },
  {
    name: '适应画布',
    shortcut: 'Ctrl+0',
    action: () => canvasRef.current?.fitView()
  }
]
```

---

## 改进效果

### 代码质量

- ✅ 边验证逻辑从 0 行 → 140 行独立模块
- ✅ 工作流工具函数从 0 行 → 330 行纯函数库
- ✅ 命令式 API 从无 → 80 行完整接口

### 可维护性

- ✅ **纯函数设计** - 易于测试、组合、复用
- ✅ **类型安全** - 完整的 TypeScript 类型定义
- ✅ **关注点分离** - 验证、工厂、API 各司其职

### 可扩展性

- ✅ **验证规则可配置** - 添加新规则无需修改组件
- ✅ **工厂函数可组合** - 复杂操作可通过组合实现
- ✅ **命令式 API** - 外部可完全控制画布

### 用户体验

- ✅ **实时边验证** - 连接时立即提示错误
- ✅ **导入时自动清理** - 自动移除非法边并提示
- ✅ **详细错误信息** - 帮助用户快速定位问题

---

## 测试验证

所有修改的文件已通过 TypeScript 类型检查：

```bash
cd packages/workflow-ui
npx tsc --noEmit
# ✅ 无类型错误
```

---

## 后续优化建议

### P0 (已完成)
- ✅ 边验证器独立化
- ✅ 工作流工厂函数
- ✅ 命令式 API 封装

### P1 (建议实施)
- 为边验证器添加单元测试
- 为工作流工厂函数添加单元测试
- 编写集成测试验证命令式 API

### P2 (长期规划)
- 添加自定义面板插槽支持
- 添加节点类型过滤器
- 添加功能开关配置
- 添加国际化支持

---

## 总结

本次改进成功借鉴了 Loomart FlowCanvas 的优雅设计，在保持 Weibo-Pro 深度业务集成的同时，提供了更多的扩展点和控制权。这正是代码艺术的平衡：**既要强大，也要优雅**。

核心改进：
1. **边验证器** - 从分散验证 → 统一规则系统
2. **工作流工厂** - 从零散操作 → 纯函数工具库
3. **命令式 API** - 从被动回调 → 主动控制

代码艺术：
- **纯函数优于副作用** - 所有工具函数都是纯函数
- **组合优于继承** - 通过函数组合实现复杂功能
- **接口优于实现** - 通过 ref API 暴露清晰接口

哲学启示：
- Loomart 的"少即是多" + Weibo-Pro 的"深度集成" = 完美平衡
