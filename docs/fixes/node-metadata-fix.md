# 节点 metadata 缺失问题修复总结

## 问题描述

选中节点时报错：`Error: node must be compiled with metadata field`

## 根本原因

节点在创建或复制时**没有经过 Compiler 编译**，导致缺少 `metadata` 字段。

### 代码中的问题点

1. **NodePalette 创建节点**
   ```typescript
   const ast = new NodeClass()  // ❌ 直接 new，缺少 metadata
   ```

2. **useClipboard 粘贴节点**
   ```typescript
   const clonedData = structuredClone(node.data)  // ❌ 深拷贝丢失 metadata
   ```

## 解决方案

### 1. 创建统一的工具函数

**文件**: `packages/workflow-ui/src/utils/createCompiledNode.ts`

```typescript
import { Compiler, generateId, type INode } from '@sker/workflow'
import { root } from '@sker/core'
import type { Type } from '@sker/core'

/**
 * 创建并编译节点
 *
 * 统一节点创建流程，确保所有节点都包含 metadata
 */
export function createCompiledNode<T extends INode>(
  NodeClass: Type<T>,
  options?: {
    id?: string
    position?: { x: number; y: number }
    [key: string]: any
  }
): T {
  const compiler = root.get(Compiler)
  const ast = new NodeClass()

  ast.id = options?.id || generateId()
  if (options?.position) {
    ast.position = options.position
  }

  // 编译节点以生成 metadata
  return compiler.compile(ast) as T
}
```

### 2. 修复 NodePalette

**文件**: `packages/workflow-ui/src/components/NodePalette/index.tsx`

```typescript
// 使用工具函数创建并编译节点
const compiledAst = createCompiledNode(NodeClass, { position })
```

### 3. 修复 useClipboard

**文件**: `packages/workflow-ui/src/hooks/useClipboard.ts`

```typescript
// 深拷贝后重新编译
const clonedData = structuredClone(node.data)
clonedData.id = newId
clonedData.position = newPosition

// 重新编译以恢复 metadata 字段
const compiledData = compiler.compile(clonedData)
```

## 为什么需要 metadata

`metadata` 字段包含节点的完整元信息：

```typescript
metadata: {
  class: INodeMetadata      // 节点类元数据（title, type）
  inputs: INodeInputMetadata[]   // 输入端口元数据
  outputs: INodeOutputMetadata[] // 输出端口元数据
  states: INodeStateMetadata[]   // 状态元数据
}
```

UI 层需要这些元数据来：
- 渲染端口
- 显示属性面板
- 验证连接
- 显示节点标题和类型

## 设计原则

**存在即合理**：
- 每个 AST 节点必须经过编译才能使用
- 编译器负责注入 metadata，确保节点自包含

**优雅即简约**：
- 统一节点创建入口，避免遗漏编译步骤
- 工具函数封装细节，使用者无需关心编译过程

## 测试验证

```bash
# 重新构建
pnpm build --filter=@sker/workflow-ast
pnpm build --filter=@sker/workflow-ui

# 启动开发服务器
pnpm dev:robust
```

测试场景：
- ✅ 从节点面板拖入新节点
- ✅ 复制粘贴节点
- ✅ 选中节点查看属性
- ✅ 剪切粘贴节点

## 总结

问题的核心是**节点生命周期管理**：

1. **创建** → 必须通过 `createCompiledNode` 或 `compiler.compile()`
2. **复制** → 深拷贝后必须重新编译
3. **反序列化** → 从 JSON 恢复时必须编译

**金科玉律**：任何创建或克隆节点的地方，都必须确保节点经过 Compiler 编译！
