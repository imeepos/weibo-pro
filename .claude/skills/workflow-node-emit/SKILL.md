---
name: workflow-node-emit
description: 工作流节点数据发射核心原则。当实现工作流节点 Handler 或修改节点发射逻辑时使用。核心原则：每个 node_emit 事件都会独立触发下游节点执行，因此每次发射的数据必须精确、无冗余。
---

# 工作流节点数据发射原则

## 核心原则

**每个 `node_emit` 事件都会独立触发下游节点执行**

因此：
- ✅ 每次发射只包含该次触发所需的数据
- ❌ 不重复发送相同信息
- ❌ 不发送无关数据

## 正确模式

### 模式1：元数据 + 行数据分离

```typescript
// 第1次发射：元数据（只发一次）
events.push({
  type: 'node_emit',
  id: ast.id,
  data: {
    columns,      // 列结构
    rowCount      // 总行数
  }
})

// 后续发射：每行数据
data.forEach((row, index) => {
  events.push({
    type: 'node_emit',
    id: ast.id,
    data: {
      data: row,           // 当前行数据
      rowIndex: index      // 行索引
    }
  })
})
```

**原因**：`columns` 和 `rowCount` 是固定的，只需要发送一次。

### 模式2：条件标记分离

```typescript
// 首行
events.push({
  data: {
    data: row,
    rowIndex: index,
    isFirst: true      // ✅ 只在首行为 true
  }
})

// 末行
events.push({
  data: {
    data: row,
    rowIndex: index,
    isLast: true       // ✅ 只在末行为 true
  }
})

// 中间行
events.push({
  data: {
    data: row,
    rowIndex: index    // ✅ 不发送 isFirst/isLast
  }
})
```

**原因**：`isFirst` 和 `isLast` 是互斥的状态，不要在每次发射中都设置为 false。

## 错误示例

### ❌ 重复发送元数据

```typescript
data.forEach((row, index) => {
  events.push({
    data: {
      data: row,
      columns,      // ❌ 每行都重复发送
      rowCount,     // ❌ 每行都重复发送
      rowIndex: index
    }
  })
})
```

### ❌ 冗余的 false 标记

```typescript
data.forEach((row, index) => {
  events.push({
    data: {
      data: row,
      rowIndex: index,
      isFirst: false,   // ❌ 中间行不需要
      isLast: false     // ❌ 中间行不需要
    }
  })
})
```

## 设计检查清单

实现 Handler 时，检查每次 `node_emit` 发送的数据：

- [ ] 元数据（如 columns、rowCount）只发送一次
- [ ] 每次发射的数据是否为该次触发所需的最小集合
- [ ] 标记字段（isFirst、isLast）只在对应行为 true 时发送
- [ ] 没有重复的常量数据

## 常见场景

### Excel/CSV 解析
- 第1次：columns, rowCount
- 后续：每行 data, rowIndex
- 首行：isFirst: true
- 末行：isLast: true

### API 分页请求
- 第1次：totalCount, pageSize
- 每页：pageData, pageIndex
- 首页：isFirst: true
- 末页：isLast: true

### 循环迭代
- 第1次：totalIterations
- 每次：currentValue, index
- 首次：isFirst: true
- 末次：isLast: true
