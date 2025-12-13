# Bug 修复：工作流入口节点自动识别

## 问题描述

用户报告了一个翻译工作流的问题，该工作流包含以下节点结构：

```
[节点1: TextAreaAst "翻译成中文"] ───> [LlmTextAgentAst] ───> [节点4: TextAreaAst 输出]
                                         ↑
[节点3: TextAreaAst "You are..."] ──────┘
```

**问题1**：系统提示词丢失
- LlmTextAgentAst 的 `system` 属性是空数组 `[]`
- 应该接收来自节点1的值 "翻译成中文"

**问题2**：LlmTextAgentAst 节点未执行
- LlmTextAgentAst 的状态保持为 `pending`
- 工作流无法完成

## 根本原因

工作流 JSON 中 `entryNodeIds` 只包含了节点3 (`efa98adc-...`)，但实际上有两个没有入边的节点：
- 节点1 (`9fae09fa-...`): "翻译成中文"
- 节点3 (`efa98adc-...`): "You are Claude Code..."

`ReactiveScheduler` 的入口节点识别逻辑（`buildStreamNetwork` 和 `buildIncrementalNetwork`）：
```typescript
const isEntryNode = ast.entryNodeIds && ast.entryNodeIds.length > 0
    ? ast.entryNodeIds.includes(nodeId)
    : incomingEdges.length === 0;
```

这个逻辑的问题：
- 如果 `entryNodeIds` 已指定，就只使用 `entryNodeIds` 中的节点
- 节点1 虽然没有入边，但不在 `entryNodeIds` 中，所以不会被执行
- 导致 LlmTextAgentAst 的 `system` 输入永远等不到值
- LlmTextAgentAst 也因此无法执行

## 解决方案

添加了一个 `getEffectiveEntryNodes()` 辅助方法，实现智能入口节点识别：

1. **自动发现**：找出所有没有入边的节点（自然入口节点）
2. **智能补全**：如果 `entryNodeIds` 不完整（缺少某些自然入口节点），自动补全
3. **警告提示**：在控制台警告用户 `entryNodeIds` 不完整，并显示自动补全的节点

### 核心代码

```typescript
/**
 * 获取有效的入口节点集合
 *
 * 策略：
 * 1. 找出所有没有入边的节点（自然入口节点）
 * 2. 如果 entryNodeIds 为空或未定义，返回所有自然入口节点
 * 3. 如果 entryNodeIds 已指定但不完整，自动补全缺失的入口节点
 */
private getEffectiveEntryNodes(ast: WorkflowGraphAst): Set<string> {
    // 找出所有没有入边的节点
    const naturalEntryNodes = new Set<string>();
    for (const node of ast.nodes) {
        const hasIncomingEdges = ast.edges.some(edge => edge.to === node.id);
        if (!hasIncomingEdges) {
            naturalEntryNodes.add(node.id);
        }
    }

    // 如果 entryNodeIds 为空或未定义，返回所有自然入口节点
    if (!ast.entryNodeIds || ast.entryNodeIds.length === 0) {
        return naturalEntryNodes;
    }

    // 检查是否完整，如果不完整则自动补全
    const specifiedEntryNodes = new Set(ast.entryNodeIds);
    const missingEntryNodes: string[] = [];

    for (const naturalEntry of naturalEntryNodes) {
        if (!specifiedEntryNodes.has(naturalEntry)) {
            missingEntryNodes.push(naturalEntry);
        }
    }

    // 如果有缺失，自动补全并警告
    if (missingEntryNodes.length > 0) {
        console.warn(
            `[ReactiveScheduler] 检测到 entryNodeIds 不完整，自动补全缺失的入口节点:\n` +
            `  指定的入口节点: [${Array.from(specifiedEntryNodes).join(', ')}]\n` +
            `  自然入口节点: [${Array.from(naturalEntryNodes).join(', ')}]\n` +
            `  自动补全: [${missingEntryNodes.join(', ')}]`
        );

        return new Set([...specifiedEntryNodes, ...missingEntryNodes]);
    }

    return specifiedEntryNodes;
}
```

### 修改的方法

1. **`buildStreamNetwork`** (reactive-scheduler.ts:857-913)
   - 添加 `const effectiveEntryNodes = this.getEffectiveEntryNodes(ast);`
   - 修改入口节点判断：`const isEntryNode = effectiveEntryNodes.has(nodeId);`

2. **`buildIncrementalNetwork`** (reactive-scheduler.ts:263-316)
   - 添加 `const effectiveEntryNodes = this.getEffectiveEntryNodes(ctx);`
   - 修改入口节点判断：`const isEntryNode = effectiveEntryNodes.has(nodeId);`

## 测试验证

创建了 `reactive-scheduler.llm-entry-node.test.ts`，包含 5 个测试用例：

1. ✅ **应该识别所有入口节点，即使 entryNodeIds 不完整**
   - 验证即使 `entryNodeIds` 只包含部分入口节点，所有自然入口节点都会被执行

2. ✅ **应该处理空的 entryNodeIds**
   - 验证 `entryNodeIds = []` 时，自动识别所有没有入边的节点

3. ✅ **应该处理未定义的 entryNodeIds**
   - 验证 `entryNodeIds = undefined` 时，自动识别所有没有入边的节点

4. ✅ **应该处理 entryNodeIds 包含不存在的节点**
   - 验证 `entryNodeIds` 包含无效节点时，仍能正常工作

5. ✅ **【当前行为】entryNodeIds 不完整时，部分节点不会执行**
   - 记录和验证修复后的行为

### 测试结果

```bash
✓ src/execution/reactive-scheduler.llm-entry-node.test.ts (5 tests) 77ms
```

输出示例：
```
systemNode state: success
systemNode count: 1
llmNode state: success
llmNode input: [
  '翻译成中文',
  "You are Claude Code, Anthropic's official CLI for Claude."
]
```

**所有 17 个 execution 测试文件，共 238 个测试全部通过**，证明修复没有破坏现有功能。

## 影响范围

### 行为变更
- **之前**：如果 `entryNodeIds` 指定了部分入口节点，其他自然入口节点不会执行
- **之后**：自动补全所有自然入口节点，确保工作流正常执行

### 兼容性
- ✅ 完全向后兼容
- ✅ 不影响已有工作流（只要 `entryNodeIds` 完整或未指定）
- ✅ 自动修复不完整的 `entryNodeIds`

### 警告信息
当检测到 `entryNodeIds` 不完整时，会在控制台输出警告：
```
[ReactiveScheduler] 检测到 entryNodeIds 不完整，自动补全缺失的入口节点:
  指定的入口节点: [node-user]
  自然入口节点: [node-system, node-user]
  自动补全: [node-system]
```

## 建议

### 前端修复
建议前端在生成工作流 JSON 时，自动将所有没有入边的节点加入 `entryNodeIds`：

```typescript
// 自动识别入口节点
const entryNodeIds = nodes
  .filter(node => !edges.some(edge => edge.to === node.id))
  .map(node => node.id);

workflow.entryNodeIds = entryNodeIds;
```

### 用户手册
更新用户文档，说明：
- `entryNodeIds` 的作用和重要性
- 如果看到警告信息，说明前端生成的工作流定义不完整
- 后端会自动补全，不影响工作流执行

## 文件变更

- ✅ `packages/workflow/src/execution/reactive-scheduler.ts` - 添加 `getEffectiveEntryNodes()` 方法，修改入口节点判断逻辑
- ✅ `packages/workflow/src/execution/reactive-scheduler.llm-entry-node.test.ts` - 新增测试文件
- ✅ `packages/workflow/BUGFIX-ENTRY-NODES.md` - 本文档

## 总结

这个修复解决了工作流入口节点识别不完整的问题，通过智能补全机制确保所有自然入口节点都能被执行，同时保持完全的向后兼容性。
