# ReactiveScheduler 使用指南

## 概述

ReactiveScheduler 是基于 RxJS Observable 的流式工作流调度器，受 NgRx Effects 启发。它将工作流从"状态机轮询"模式改造为"响应式流"模式。

## 核心特性

- **节点即流源**：每个节点是 `Observable<INode>` 流，而非状态机
- **边即操作符**：边定义数据如何从上游流向下游（map/filter/zip/combineLatest）
- **自动响应**：上游发射 N 次 → 下游自动执行 N 次（无需轮询）
- **声明式配置**：通过边的 `mode` 属性配置流式合并策略

## 启用 ReactiveScheduler

### 方法 1：在工作流执行时启用

```typescript
import { executeAst, WorkflowGraphAst } from '@sker/workflow';

const workflow = new WorkflowGraphAst();
// ... 配置节点和边

// 在 context 中设置特性标志
const ctx = {
  useReactiveScheduler: true  // ← 启用响应式调度器
};

executeAst(workflow, ctx).subscribe(graph => {
  console.log('工作流状态:', graph.state);
});
```

### 方法 2：在 API 调用时启用

```typescript
// apps/api/src/workflow/workflow.service.ts
async runWorkflow(workflowId: string) {
  const workflow = await this.getWorkflow(workflowId);

  const ctx = {
    useReactiveScheduler: true,  // ← 启用
    // ... 其他上下文
  };

  return executeAst(workflow, ctx);
}
```

## EdgeMode 使用指南

### 1. MERGE（默认）：任一发射立即触发

**适用场景**：并发采集、独立任务

```typescript
import { EdgeMode } from '@sker/workflow';

workflow.addEdge({
  from: 'source',
  to: 'target',
  fromProperty: 'data',
  toProperty: 'input',
  mode: EdgeMode.MERGE  // ← 默认，可省略
});
```

**执行行为**：
- 上游发射 3 次 → 下游立即执行 3 次（并发）
- 不等待其他上游节点

---

### 2. ZIP：配对执行（索引对齐）

**适用场景**：**您的需求场景** - 微博热门监控 → 详情抓取

```typescript
// 场景：WeiboAjaxFeedHotTimeline 发射多个 mid 和 uid
// 需求：mid [1,2,3] + uid [4,5,6] → 执行 3 次 {1,4}, {2,5}, {3,6}

const hotTimeline = new WeiboAjaxFeedHotTimelineAst();
const statusShow = new WeiboAjaxStatusesShowAst();

// 添加两条边，都使用 ZIP 模式
workflow.addEdge({
  from: hotTimeline.id,
  to: statusShow.id,
  fromProperty: 'mblogid',
  toProperty: 'mblogid',
  mode: EdgeMode.ZIP  // ← 配对执行
});

workflow.addEdge({
  from: hotTimeline.id,
  to: statusShow.id,
  fromProperty: 'uid',
  toProperty: 'uid',
  mode: EdgeMode.ZIP  // ← 配对执行
});
```

**执行行为**：
```
HotTimeline 发射:
  发射1: { mblogid: '1', uid: '4' }
  发射2: { mblogid: '2', uid: '5' }
  发射3: { mblogid: '3', uid: '6' }

StatusShow 执行 3 次（串行）:
  execute({ mblogid: '1', uid: '4' })
  execute({ mblogid: '2', uid: '5' })
  execute({ mblogid: '3', uid: '6' })
```

**关键要点**：
- ZIP 按索引配对（第1次发射配第1次，第2次配第2次...）
- 如果数组长度不一致，以短的为准（RxJS zip 标准行为）
- 使用 `concatMap` 串行执行（保证顺序）

---

### 3. COMBINE_LATEST：任一变化触发

**适用场景**：多输入聚合、仪表板

```typescript
// 场景：用户信息 + 博文列表 → 个人主页构建

workflow.addEdge({
  from: 'userInfo',
  to: 'profileBuilder',
  mode: EdgeMode.COMBINE_LATEST
});

workflow.addEdge({
  from: 'postList',
  to: 'profileBuilder',
  mode: EdgeMode.COMBINE_LATEST
});
```

**执行行为**：
- 等待所有上游至少发射 1 次
- 之后任一上游变化，使用所有最新值触发下游

---

### 4. WITH_LATEST_FROM：主流触发

**适用场景**：主从依赖、配置注入

```typescript
// 场景：用户操作（主流）+ 配置信息（辅流）

workflow.addEdge({
  from: 'userAction',
  to: 'handler',
  isPrimary: true,  // ← 标记为主流
  mode: EdgeMode.WITH_LATEST_FROM
});

workflow.addEdge({
  from: 'config',
  to: 'handler',
  mode: EdgeMode.WITH_LATEST_FROM
});
```

**执行行为**：
- 主流发射时触发
- 携带辅流的最新值（不会因辅流变化而触发）

---

## 完整示例：热门微博采集

```typescript
import {
  WorkflowGraphAst,
  EdgeMode,
  executeAst
} from '@sker/workflow';
import {
  WeiboAjaxFeedHotTimelineAst,
  WeiboAjaxStatusesShowAst
} from '@sker/workflow-ast';

// 创建工作流
const workflow = new WorkflowGraphAst();

// 节点1：热门时间线监控
const hotTimeline = new WeiboAjaxFeedHotTimelineAst();
hotTimeline.id = 'hot-timeline-1';
hotTimeline.next = [true];  // 触发执行

// 节点2：微博详情抓取
const statusShow = new WeiboAjaxStatusesShowAst();
statusShow.id = 'status-show-1';

// 添加节点
workflow.nodes = [hotTimeline, statusShow];

// 添加边（ZIP 模式）
workflow.edges = [
  {
    id: 'edge-1',
    type: 'data',
    from: hotTimeline.id,
    to: statusShow.id,
    fromProperty: 'mblogid',
    toProperty: 'mblogid',
    mode: EdgeMode.ZIP  // ← 配对执行
  },
  {
    id: 'edge-2',
    type: 'data',
    from: hotTimeline.id,
    to: statusShow.id,
    fromProperty: 'uid',
    toProperty: 'uid',
    mode: EdgeMode.ZIP  // ← 配对执行
  }
];

// 执行工作流（启用 ReactiveScheduler）
const ctx = { useReactiveScheduler: true };

executeAst(workflow, ctx).subscribe({
  next: (graph) => {
    console.log('工作流状态:', graph.state);
    console.log('节点状态:', graph.nodes.map(n => ({
      id: n.id,
      type: n.type,
      state: n.state
    })));
  },
  complete: () => {
    console.log('工作流执行完成');
  },
  error: (err) => {
    console.error('工作流执行失败:', err);
  }
});
```

## 执行流程对比

### 传统 LegacyScheduler（默认）

```
HotTimeline 发射 3 次 { mblogid, uid }
  ↓
调度器收集所有发射（覆盖式）
  ↓
StatusShow 只执行 1 次（最后一个值）
```

### ReactiveScheduler + ZIP 模式

```
HotTimeline 发射 3 次 { mblogid, uid }
  ↓
ZIP 配对为 3 个独立执行
  ↓
StatusShow 串行执行 3 次
  - execute({ mblogid: '1', uid: '4' })
  - execute({ mblogid: '2', uid: '5' })
  - execute({ mblogid: '3', uid: '6' })
```

## 调试与监控

### 流式日志

ReactiveScheduler 支持 RxJS tap 操作符进行调试：

```typescript
import { tap } from 'rxjs/operators';

executeAst(workflow, ctx).pipe(
  tap(graph => console.log('工作流图更新:', graph))
).subscribe();
```

### 节点级监控

每个节点状态变化都会触发工作流图更新：

```typescript
executeAst(workflow, ctx).subscribe(graph => {
  const runningNodes = graph.nodes.filter(n => n.state === 'running');
  const completedNodes = graph.nodes.filter(n => n.state === 'success');

  console.log(`进行中: ${runningNodes.length}, 已完成: ${completedNodes.length}`);
});
```

## 性能优化

### shareReplay(1)

ReactiveScheduler 自动为每个节点流添加 `shareReplay(1)`：
- 多个下游订阅时，共享执行结果
- 避免重复执行上游节点

### concatMap vs mergeMap

- **concatMap**（当前使用）：串行执行，保证顺序
- **mergeMap**：并发执行，提升性能

未来可考虑通过边配置选择：

```typescript
workflow.addEdge({
  // ...
  concurrency: 'serial' | 'parallel'
});
```

## 向后兼容性

- 默认使用 `LegacyScheduler`（保证现有工作流不受影响）
- 通过 `ctx.useReactiveScheduler: true` 渐进式迁移
- 所有现有 API 保持不变

## 迁移检查清单

- [ ] 在测试环境启用 `useReactiveScheduler: true`
- [ ] 验证工作流执行结果与预期一致
- [ ] 检查多次触发场景是否正常
- [ ] 监控性能指标（执行时间、内存占用）
- [ ] 逐步在生产环境灰度发布

## 常见问题

### Q: 为什么我的节点执行了多次？

A: 这是 ReactiveScheduler 的正确行为。如果上游发射 N 次，下游应该执行 N 次。如果不希望多次执行，请检查上游节点的发射逻辑。

### Q: ZIP 模式下数组长度不一致怎么办？

A: ReactiveScheduler 遵循 RxJS zip 语义：以短的数组为准。例如 mid [1,2,3] + uid [4,5] 只会执行 2 次。

### Q: 如何回退到 LegacyScheduler？

A: 移除 `ctx.useReactiveScheduler` 或设置为 `false` 即可。

## 技术参考

- [RxJS zip 操作符](https://rxjs.dev/api/operators/zip)
- [RxJS combineLatest 操作符](https://rxjs.dev/api/index/function/combineLatest)
- [NgRx Effects](https://ngrx.io/guide/effects)

---

**代码艺术家哲学**：

> 这不仅仅是代码重构，而是从"命令式轮询"到"声明式流"的范式跃迁。
> 边不再是连线，而是 RxJS 操作符的诗篇。
> 每个节点都是独立的流源，自治而优雅。
