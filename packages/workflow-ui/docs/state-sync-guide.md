# React Flow ↔ AST 状态同步指南

## 概述

本文档介绍 Weibo-Pro 工作流系统中 React Flow 与 AST 节点系统之间的状态同步机制，包括如何使用增强的同步工具实现无缝的数据流。

## 架构概览

### 三层架构设计

```
UI 层 (React Flow)
  ↑↓ (双向同步)
适配器层 (Adaptation Layer)
  ↑↓ (直接引用)
AST 层 (WorkflowGraphAst)
```

**核心原则**:
- **单数据源**：AST 是唯一真理源
- **直接引用**：React Flow 节点的 `data` 直接引用 AST 实例
- **变更拦截**：所有修改通过代理层自动同步
- **批量优化**：合并高频变更，减少重渲染

## 基础用法

### 1. 使用 useWorkflow Hook

```typescript
import { useWorkflow } from '@sker/workflow-ui'

function WorkflowEditor() {
  const {
    workflowAst,  // AST 实例（唯一真理源）
    nodes,        // React Flow 节点
    edges,        // React Flow 边
    setNodes,
    setEdges,
    addNode,      // 添加节点
    removeNode,   // 删除节点
    updateNode,   // 更新节点
    connectNodes, // 连接节点
    removeEdge,   // 删除边
    syncFromAst,  // 从 AST 同步到 UI
    changeProxy   // StateChangeProxy 实例
  } = useWorkflow()

  // 渲染 React Flow
  return <ReactFlow nodes={nodes} edges={edges} />
}
```

### 2. 自动同步的位置变更

```typescript
// 用户拖拽节点时，位置自动同步到 AST
// 由 useWorkflow 中的 useEffect 监听实现

useEffect(() => {
  nodes.forEach((node) => {
    const astNode = workflowAst.nodes.find((n) => n.id === node.id)
    if (astNode && astNode.position !== node.position) {
      astNode.position = node.position // 自动同步
    }
  })
}, [nodes, workflowAst])
```

**特性**:
- ✅ 无需手动调用，自动同步
- ✅ 仅当位置真正变化时更新（避免重复渲染）
- ✅ 引用透明，直接修改 AST 实例

## 高级用法

### 3. 使用 FlowAstConverter（类型安全转换）

**场景**: 需要在 AST 和 React Flow 之间手动转换时

```typescript
import { FlowAstConverter } from '@sker/workflow-ui'
import { WeiboLoginAst } from '@sker/workflow-ast'

// 转换单个节点
const astNode = new WeiboLoginAst()
astNode.id = 'node-1'
astNode.position = { x: 100, y: 200 }

const flowNode = FlowAstConverter.toFlowNode(astNode)
// 返回:
// {
//   id: 'node-1',
//   type: 'WeiboLoginAst',
//   position: { x: 100, y: 200 },
//   data: astNode // 直接引用，而非拷贝
// }

// 转换整个工作流
const workflow = {
  nodes: [astNode1, astNode2],
  edges: [edge1, edge2]
}

const { nodes, edges } = FlowAstConverter.convertWorkflow(workflow)
```

**优势**:
- ✅ 类型安全：使用泛型 `FlowAstConverter.toFlowNode<T extends INode>`
- ✅ 无需类型断言，编译期检查
- ✅ 直接引用，内存高效
- ✅ 优化过的稳定 ID 生成算法

### 4. 使用 StateChangeProxy（变更拦截和批处理）

**场景**: 需要优化性能、批量操作或节流高频变更

```typescript
const { changeProxy } = useWorkflow()

// 4.1 基本变更（自动同步）
const astNode = workflowAst.nodes.find(n => n.id === 'node-1')

changeProxy.mutateAst(astNode, (draft) => {
  draft.name = 'New Name'
  draft.config.value = 42
  draft.state = 'success'
})
// 自动同步到 React Flow，触发重渲染

// 4.2 节流变更（适合拖拽、实时输入）
const handleDrag = (nodeId: string, position: { x: number; y: number }) => {
  const astNode = workflowAst.nodes.find(n => n.id === nodeId)

  changeProxy.mutateAstThrottled(astNode, (draft) => {
    draft.position = position
  })
  // 50ms 内多次调用会合并为一次同步
}

// 4.3 批量更新（多次变更合并为一次渲染）
const selectAllNodes = () => {
  changeProxy.batch(
    workflowAst.nodes.map(node => () => {
      changeProxy.mutateAst(node, (draft) => {
        draft.selected = true
      })
    })
  )
  // 所有节点更新合并为一次 React 重渲染
}

// 4.4 拖拽模式（自动节流）
const handleDragStart = (nodeId: string) => {
  changeProxy.startDrag(nodeId)
}

const handleDragEnd = (nodeId: string) => {
  changeProxy.endDrag(nodeId)
  // 拖拽结束触发最终同步
}
```

**配置选项**:

```typescript
const changeProxy = new StateChangeProxy(setNodes, {
  debug: true,              // 启用调试日志
  throttleDelay: 50,        // 节流延迟（ms）
  enableHistory: true       // 启用历史记录（未来支持撤销/重做）
})
```

**性能优化**:
- ✅ 批量更新：多次变更合并为一次重渲染
- ✅ 节流拖拽：避免拖拽过程中的过度渲染
- ✅ requestAnimationFrame：在下一帧批量执行
- ✅ 最小重渲染：仅触发必要的节点更新

### 5. 监听深度变更（表单同步）

**场景**: 节点配置表单变更时同步到 UI

```typescript
import { useDeepSync } from '@sker/workflow-ui'

function NodeConfigPanel({ node }: { node: WorkflowNode }) {
  // 监听 node.config 和 node.state 的变更
  useDeepSync(node.data, ['config', 'state'], () => {
    // 当配置或状态变更时，触发 React Flow 重渲染
    // 自动同步到 UI
  })

  const handleConfigChange = (key: string, value: any) => {
    // 修改 AST（直接引用）
    node.data.config[key] = value

    // useDeepSync 检测到变更，自动触发重渲染
  }

  return (
    <div>
      <input
        value={node.data.config.name}
        onChange={(e) => handleConfigChange('name', e.target.value)}
      />
    </div>
  )
}
```

**注意事项**:
- 使用引用比较判断变更（`===`）
- 适合监听简单值（字符串、数字、布尔值）
- 复杂对象变更需要重新赋值引用

```typescript
// 正确：重新赋值触发变更检测
node.data.config = { ...node.data.config, name: 'New Name' }

// 错误：直接修改属性不会触发检测
node.data.config.name = 'New Name' // 不会触发 useDeepSync
```

## 实际应用场景

### 场景 1：节点配置编辑

```typescript
function WeiboLoginNode({ node }: { node: WorkflowNode<WeiboLoginAst> }) {
  const { changeProxy } = useWorkflow()

  const handleUsernameChange = (username: string) => {
    // 方式 1：使用 changeProxy（推荐）
    changeProxy.mutateAst(node.data, (draft) => {
      draft.username = username
    })

    // 方式 2：直接修改 + useDeepSync
    node.data.username = username // 需要 useDeepSync 监听
  }

  return (
    <div>
      <input
        value={node.data.username}
        onChange={(e) => handleUsernameChange(e.target.value)}
      />
    </div>
  )
}
```

### 场景 2：批量节点操作

```typescript
function BulkOperations() {
  const { workflowAst, changeProxy } = useWorkflow()

  const duplicateSelectedNodes = () => {
    const selectedNodes = workflowAst.nodes.filter(n => n.selected)

    changeProxy.batch(
      selectedNodes.map(node => () => {
        const copy = { ...node }
        copy.id = generateId()
        copy.position.x += 50
        copy.position.y += 50

        workflowAst.addNode(copy)

        changeProxy.mutateAst(copy, () => {
          // 空更新触发同步
        })
      })
    )
  }

  return <button onClick={duplicateSelectedNodes}>复制选中节点</button>
}
```

### 场景 3：执行状态同步

```typescript
async function executeWorkflow() {
  const { workflowAst, changeProxy } = useWorkflow()

  for (const node of workflowAst.nodes) {
    try {
      // 更新状态为执行中
      changeProxy.mutateAst(node, (draft) => {
        draft.state = 'running'
        draft.error = null
      })

      // 执行节点逻辑
      await executeNode(node)

      // 更新状态为成功
      changeProxy.mutateAst(node, (draft) => {
        draft.state = 'success'
      })
    } catch (error) {
      // 更新状态为错误
      changeProxy.mutateAst(node, (draft) => {
        draft.state = 'error'
        draft.error = error.message
      })
    }
  }
}
```

### 场景 4：节流搜索

```typescript
function SearchNodes() {
  const [query, setQuery] = useState('')
  const { workflowAst, changeProxy } = useWorkflow()

  useEffect(() => {
    // 节流版本：用户连续输入时不会频繁触发
    workflowAst.nodes.forEach(node => {
      changeProxy.mutateAstThrottled(node, (draft) => {
        draft.hidden = !draft.name.includes(query)
      })
    })
  }, [query])

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />
}
```

## 性能优化建议

### 1. 大规模工作流（>100 个节点）

```typescript
// 启用虚拟化，仅渲染可见节点
<ReactFlow
  onlyRenderVisibleElements={true}
  minZoom={0.1}
  maxZoom={2}
/>

// 批量操作使用 changeProxy.batch
const updateAllNodes = () => {
  changeProxy.batch(
    workflowAst.nodes.map(node => () => {
      changeProxy.mutateAst(node, draft => {
        draft.updatedAt = Date.now()
      })
    })
  )
}
```

### 2. 节流拖拽事件

```typescript
const onNodeDrag = (event: ReactMouseEvent, node: WorkflowNode) => {
  const astNode = workflowAst.nodes.find(n => n.id === node.id)
  if (!astNode) return

  // 使用节流版本，避免过度渲染
  changeProxy.mutateAstThrottled(astNode, (draft) => {
    draft.position = node.position
  })
}

const onNodeDragStop = (event: ReactMouseEvent, node: WorkflowNode) => {
  const astNode = workflowAst.nodes.find(n => n.id === node.id)
  if (!astNode) return

  // 拖拽结束使用立即同步
  changeProxy.mutateAst(astNode, (draft) => {
    draft.position = node.position
  })
}
```

### 3. 避免不必要的重渲染

```typescript
// ❌ 错误：更新未变化的节点
setNodes(prev => prev.map(node => ({ ...node })))

// ✅ 正确：仅更新变更的节点
setNodes(prev => {
  const index = prev.findIndex(n => n.id === changedId)
  if (index === -1) return prev

  const newNodes = [...prev]
  newNodes[index] = { ...prev[index], data: changedData }
  return newNodes
})
```

## 调试技巧

### 启用调试日志

```typescript
const changeProxy = new StateChangeProxy(setNodes, {
  debug: true,  // 启用详细日志
  throttleDelay: 50
})

// 日志输出示例：
// [StateChangeProxy] Sync scheduled: node-1 (source: mutation)
// [StateChangeProxy] Flushed 3 operations
// [StateChangeProxy] Drag started: node-2
// [StateChangeProxy] Drag ended: node-2
```

### 检查引用一致性

```typescript
// 验证 AST 和 React Flow 节点是否共享同一引用
const flowNode = nodes.find(n => n.id === 'node-1')
const astNode = workflowAst.nodes.find(n => n.id === 'node-1')

// 应该是同一个对象
console.log(flowNode.data === astNode) // true

// 修改 flowNode.data 应该立即反映在 astNode 上
flowNode.data.name = 'New Name'
console.log(astNode.name) // 'New Name'
```

## 最佳实践

✅ **推荐做法**:

1. **使用 changeProxy 进行所有 AST 变更**
   ```typescript
   changeProxy.mutateAst(node, draft => {
     draft.value = newValue
   })
   ```

2. **批量操作用 batch**
   ```typescript
   changeProxy.batch(operations)
   ```

3. **拖拽用节流版本**
   ```typescript
   changeProxy.mutateAstThrottled(node, draft => {
     draft.position = position
   })
   ```

4. **大规模工作流启用虚拟化**
   ```typescript
   <ReactFlow onlyRenderVisibleElements={true} />
   ```

❌ **避免做法**:

1. **直接 setNodes 而不更新 AST**（导致数据不一致）
   ```typescript
   // ❌ 错误
   setNodes(prev => prev.map(n => ({ ...n, position: newPos })))

   // ✅ 正确
   changeProxy.mutateAst(astNode, draft => {
     draft.position = newPos
   })
   ```

2. **频繁调用 mutateAst 不使用节流**（导致性能问题）
   ```typescript
   // ❌ 错误：拖拽中频繁调用
   onDrag={(e, node) => {
     astNode.position = node.position
     changeProxy.mutateAst(astNode, () => {})
   }}

   // ✅ 正确：使用节流版本
   onDrag={(e, node) => {
     changeProxy.mutateAstThrottled(astNode, draft => {
       draft.position = node.position
     })
   }}
   ```

3. **深拷贝 AST 数据**（浪费内存）
   ```typescript
   // ❌ 错误：不必要的深拷贝
   const node = { ...astNode }

   // ✅ 正确：直接引用
   const node = astNode
   ```

## 常见问题

### Q: 修改 AST 后 UI 没有更新？

**A**: 可能原因：
1. 没有通过 changeProxy 进行修改（直接修改不会触发同步）
2. 深拷贝了 AST 数据，失去了引用关系
3. React 状态没有正确更新（检查 setNodes 调用）

**解决方案**：
```typescript
// 使用 changeProxy
changeProxy.mutateAst(node, draft => {
  draft.value = newValue
})
// 或手动触发同步
setNodes(prev => [...prev])
```

### Q: 拖拽卡顿怎么办？

**A**: 启用节流和虚拟化：
```typescript
// 1. 使用节流版本
changeProxy.mutateAstThrottled(node, draft => {
  draft.position = position
})

// 2. 启用虚拟化
<ReactFlow onlyRenderVisibleElements={true} />

// 3. 减少节点复杂度（简化渲染逻辑）
```

### Q: 批量操作时如何减少重渲染？

**A**: 使用 batch：
```typescript
changeProxy.batch(
  nodes.map(node => () => {
    changeProxy.mutateAst(node, draft => {
      draft.selected = true
    })
  })
)
```

## 总结

Weibo-Pro 的状态同步架构通过以下设计实现了无缝、高性能的双向同步：

1. **直接引用**：React Flow 节点的 `data` 属性直接引用 AST 实例
2. **变更拦截**：StateChangeProxy 拦截所有变更，自动同步
3. **批量优化**：合并高频操作，减少重渲染
4. **节流机制**：拖拽等高频操作自动节流
5. **类型安全**：FlowAstConverter 提供编译期类型检查

这套架构既保证了数据一致性，又提供了优秀的性能表现，是代码艺术家设计哲学的体现：

> *存在即合理* - 每个设计元素都有其不可替代的价值
>
> *优雅即简约* - 通过直接引用而非深拷贝，实现了最小化的设计
>
> *性能即艺术* - 批量、节流、虚拟化，每个优化都经过精心雕琢
