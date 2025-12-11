# 增量执行测试指南

## 概述

`reactive-scheduler.incremental-execution-bug.test.ts` 文件包含了针对工作流调度器 (ReactiveScheduler) 中增量执行功能的单元测试，特别是测试 `fineTuneNode()` 和 `executeNodeIsolated()` 方法的行为。

## 测试背景

### 原始错误消息

```
Uncaught (in promise) Error: 内部错误：节点 07731c31-75e8-4c32-9d9c-0510129b6076 状态为 pending，
但未被标记为受影响节点。这可能是调度器的 bug，请联系开发者。
at buildNode (reactive-scheduler.ts:271:27)
at ReactiveScheduler.buildIncrementalNetwork
```

### 问题根本原因

在增量执行场景中，`buildIncrementalNetwork()` 方法需要确保所有"未受影响"的节点都已经执行完成（状态为 `success` 或 `fail`）。如果某个节点的状态为 `pending` 但不在 `affectedNodes` 集合中，调度器会抛出错误，表示存在内部状态不一致的问题。

## 测试场景

### 1. 链式工作流 (A → B → C)

**场景**：
- 完整执行工作流：A → B → C（所有节点都成功）
- 修改 B 的参数
- 调用 `fineTuneNode(workflow, 'B')` 进行增量执行

**预期行为**：
- A 保持历史状态（已执行）
- B 重新执行
- C 作为下游节点也重新执行
- 调度器不应该抛出错误

**相关测试**：
- `应该能够增量执行链式工作流中的中间节点`
- `BUG 复现：修改链式结构中间节点时不应该抛出错误`

### 2. 扇出结构 (A 扇出到 B 和 C)

**场景**：
```
    A
   / \
  B   C
```
- 完整执行工作流
- 修改 B 的参数
- 调用 `fineTuneNode(workflow, 'B')`

**预期行为**：
- 只有 B 被标记为受影响节点
- C 保持历史状态
- A 用于数据传递但不重新执行

**相关测试**：
- `应该支持增量执行扇出结构中的节点`

### 3. 扇入结构 (B、C 扇入到 A)

**场景**：
```
  B
   \
    A
   /
  C
```
- 完整执行工作流
- 修改 A 的参数
- 调用 `fineTuneNode(workflow, 'A')`

**预期行为**：
- 只有 A 被标记为受影响节点
- B 和 C 保持历史状态
- 调度器正确处理多个上游节点

**相关测试**：
- `应该支持增量执行扇入结构中的节点`

### 4. 菱形依赖 (A → {B, C} → D)

**场景**：
```
      A
     / \
    B   C
     \ /
      D
```
- 完整执行工作流
- 修改 B 的参数
- 调用 `fineTuneNode(workflow, 'B')`

**预期行为**：
- B 和 D 被标记为受影响节点
- A 和 C 保持历史状态
- D 应该重新执行（下游节点）

**相关测试**：
- `应该支持增量执行菱形依赖结构`

### 5. 深度链式结构 (A → B → C → D → E)

**场景**：
- 完整执行深度链式工作流
- 修改 C 的参数（中间节点）
- 调用 `fineTuneNode(workflow, 'C')`

**预期行为**：
- A 和 B 保持历史状态
- C、D、E 重新执行
- 调度器正确处理递归的下游节点收集

**相关测试**：
- `BUG 复现：深度链式结构中的增量执行`

### 6. 单节点独立执行 (executeNodeIsolated)

**场景**：
- 完整执行工作流：A → B → C
- 调用 `executeNodeIsolated(workflow, 'B')` 独立执行 B

**预期行为**：
- 只有 B 被执行
- A 不执行（已完成）
- C 不受影响（下游不执行）
- 这与 `fineTuneNode` 的区别在于不重新执行下游节点

**相关测试**：
- `应该能够独立执行单个节点，下游不受影响`
- `单节点执行不应该抛出错误`

## 关键测试验证点

每个测试都验证以下方面：

1. **最终工作流状态**：确保工作流执行成功，状态为 `success`
2. **节点状态**：验证各节点的最终状态（success/fail/pending）
3. **执行隔离性**：确保只有受影响的节点被重新执行
4. **数据传递**：验证历史数据正确地从已执行节点传递到下游节点
5. **错误处理**：确保不会抛出内部一致性错误

## 运行测试

```bash
# 运行这个特定的测试文件
cd packages/workflow
pnpm test reactive-scheduler.incremental-execution-bug.test.ts

# 运行所有工作流测试
pnpm test

# 以 watch 模式运行
pnpm test:watch
```

## 技术细节

### 受影响节点集合 (affectedNodes)

当调用 `fineTuneNode(workflow, nodeId)` 时，调度器：
1. 标记目标节点为受影响
2. 递归收集所有下游节点（通过出边追踪）
3. 只为受影响节点构建新的执行流
4. 为未受影响节点创建透传流（返回历史数据）

### 验证不变量

调度器在 `buildIncrementalNetwork()` 方法中的第 269-274 行验证：
- 所有未受影响的节点必须状态为 `success` 或 `fail`
- 如果节点状态为 `pending` 但不在 `affectedNodes` 中，则抛出错误

这个验证确保了增量执行的正确性：没有"遗漏的"待处理节点。

## 故障排查

如果测试失败，检查以下几点：

1. **节点状态初始化**：在创建测试节点时，确保已完成的节点设置了正确的 `state` 和 `output`
2. **工作流完整性**：完整执行工作流后，所有节点必须处于 `success` 或 `fail` 状态
3. **受影响节点收集**：验证 `findAffectedNodes()` 的递归逻辑是否正确
4. **流构建过程**：检查 `buildIncrementalNetwork()` 中的条件分支是否正确

## 相关文件

- `reactive-scheduler.ts`：主要实现文件
- `reactive-scheduler.test.ts`：其他核心行为测试
- `reactive-scheduler.critical.test.ts`：关键路径测试
