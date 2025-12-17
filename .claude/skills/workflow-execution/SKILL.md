---
name: workflow-execution
description: 使用 @sker/workflow 执行工作流。当需要执行工作流、处理节点事件、或理解执行引擎机制时使用。
---

# 工作流执行引擎

本项目使用 @sker/workflow 基于 AST + 访问者模式 + RxJS 构建工作流引擎。

## 核心文件

- 执行器：`packages/workflow/src/executor.ts`
- 访问者执行器：`packages/workflow/src/execution/visitor-executor.ts`
- 工作流执行器：`packages/workflow/src/WorkflowGraphAstVisitor.ts`
- 事件定义：`packages/workflow/src/execution/events.ts`

## 执行工作流

```typescript
import { executeWorkflow, executeWorkflowImmediate, executeAst } from '@sker/workflow';

// 执行工作流（返回 Observable）
executeWorkflow(workflow).subscribe({
  next: (event) => console.log('事件:', event),
  complete: () => console.log('完成'),
  error: (err) => console.error('失败:', err),
});

// 执行工作流（返回 Promise）
const result = await executeWorkflowImmediate(workflow);

// 执行单个节点
executeAst(node, inputData).subscribe((event) => {
  console.log('节点事件:', event);
});
```

## 节点事件类型

```typescript
type NodeEvent =
  | { type: 'node_runing'; id: string; data: INode }
  | { type: 'node_emit'; id: string; property: string; value: any }
  | { type: 'node_success'; id: string; data: INode }
  | { type: 'node_fail'; id: string; data: INode; error: SerializedError };
```

## Handler 实现模板

```typescript
import { Injectable, Handler } from '@sker/workflow';
import { Observable, of, concat } from 'rxjs';

@Injectable()
export class MyNodeVisitor {
  @Handler(MyNodeAst)
  handler(ast: MyNodeAst, ctx?: WorkflowGraphAst): Observable<NodeEvent> {
    // 1. 处理业务逻辑
    const result = processData(ast.input);
    ast.output = result;

    // 2. 返回事件流
    return of(
      { type: 'node_runing', id: ast.id, data: ast },
      { type: 'node_emit', id: ast.id, property: 'output', value: result },
      { type: 'node_success', id: ast.id, data: ast }
    );
  }
}
```

## 多次发射

```typescript
@Handler(StreamNodeAst)
handler(ast: StreamNodeAst): Observable<NodeEvent> {
  return concat(
    of({ type: 'node_runing', id: ast.id, data: ast }),
    // 多次发射
    of({ type: 'node_emit', id: ast.id, property: 'output', value: 1 }),
    of({ type: 'node_emit', id: ast.id, property: 'output', value: 2 }),
    of({ type: 'node_emit', id: ast.id, property: 'output', value: 3 }),
    of({ type: 'node_success', id: ast.id, data: ast })
  );
}
```

## 异步处理

```typescript
@Handler(AsyncNodeAst)
handler(ast: AsyncNodeAst): Observable<NodeEvent> {
  return concat(
    of({ type: 'node_runing', id: ast.id, data: ast }),
    from(fetchData(ast.url)).pipe(
      map((data) => {
        ast.result = data;
        return { type: 'node_emit', id: ast.id, property: 'result', value: data };
      }),
      catchError((err) => of({
        type: 'node_fail',
        id: ast.id,
        data: ast,
        error: serializeError(err)
      }))
    ),
    of({ type: 'node_success', id: ast.id, data: ast })
  );
}
```

## 边模式 (EdgeMode)

```typescript
import { EdgeMode } from '@sker/workflow';

// MERGE - 任一上游发射立即触发下游（默认）
const edge1: IEdge = { mode: EdgeMode.MERGE, ... };

// ZIP - 配对执行（上游数组按索引配对触发）
const edge2: IEdge = { mode: EdgeMode.ZIP, ... };

// COMBINE_LATEST - 任一上游变化触发，使用所有上游的最新值
const edge3: IEdge = { mode: EdgeMode.COMBINE_LATEST, ... };

// WITH_LATEST_FROM - 主流触发，携带其他流的最新值
const edge4: IEdge = { mode: EdgeMode.WITH_LATEST_FROM, ... };
```

## 条件边

```typescript
const conditionalEdge: IEdge = {
  id: 'e1',
  from: 'router',
  to: 'branch1',
  fromProperty: 'output',
  toProperty: 'input',
  condition: {
    property: 'status',
    value: 'success'
  }
};
```

## 取消执行

```typescript
const controller = new AbortController();
workflow.abortSignal = controller.signal;

// 开始执行
executeWorkflow(workflow).subscribe(...);

// 取消
controller.abort();
```

## 错误处理策略

```typescript
@Node({
  title: '我的节点',
  errorStrategy: 'retry',  // 'retry' | 'skip' | 'fail' | 'abort'
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2  // 指数退避因子
})
export class MyNodeAst extends Ast { ... }
```

## 错误设置

```typescript
import { setAstError, NoRetryError } from '@sker/workflow';

// 设置错误
setAstError(ast, error, process.env.NODE_ENV === 'development');

// 不可重试错误
throw new NoRetryError('参数错误，无法重试');
```

## 序列化/反序列化

```typescript
import { fromJson, toJson } from '@sker/workflow';

// 序列化
const json = toJson(workflow);

// 反序列化
const restored = fromJson<WorkflowGraphAst>(json);
```

## 执行流程

```
1. executeWorkflow(workflow)
   ↓
2. NodeExecutor.run() - 编译节点、克隆
   ↓
3. VisitorExecutor.visit() - 查找 @Handler
   ↓
4. WorkflowGraphAstVisitor.handler() - 工作流专用执行器
   ↓
5. 为每个子节点创建输入流 (ReplaySubject)
   ↓
6. 连接边 (connectEdges)
   ↓
7. 触发入口节点 (triggerEntryNodes)
   ↓
8. 合并所有节点事件流
   ↓
9. 完成或失败
```

## 关键要点

1. **Handler 必须返回 Observable<NodeEvent>**
2. **事件顺序**：`node_runing` → `node_emit`(可多次) → `node_success/node_fail`
3. **节点会被克隆**：防止多次执行互相污染
4. **使用 RxJS 操作符**：处理异步、错误、流控制
5. **不要直接抛出异常**：应转换为 NodeFailEvent

## 参考实现

- `packages/workflow/src/executor.ts`
- `packages/workflow/src/execution/visitor-executor.ts`
- `packages/workflow/src/WorkflowGraphAstVisitor.ts`
- `packages/workflow-run/src/WeiboKeywordSearchVisitor.ts`
- `packages/workflow-run/src/PostNLPAnalyzerVisitor.ts`
