# NodeExecutor 使用指南

## 核心设计

`NodeExecutor` 是统一的节点执行器，支持：

1. **单节点执行**：input$ 多次发射 → 节点多次执行
2. **工作流执行**：WorkflowGraphAst 也是节点，平等对待
3. **平台无关**：无 React/Node.js 依赖，可在浏览器/服务端运行

## API

### `run<Input>(node: INode, input$: Observable<Input>): Observable<NodeEvent>`

执行节点，返回事件流。

**参数**：
- `node`: 要执行的节点（普通节点或 WorkflowGraphAst）
- `input$`: 输入流，每次发射触发一次执行

**返回**：
- `Observable<NodeEvent>`: 节点事件流

**事件类型**：
```typescript
type NodeEvent =
    | { type: 'node_runing'; id: string; data: INode }
    | { type: 'node_emit'; id: string; property: string; value: any }
    | { type: 'node_success'; id: string; data: INode }
    | { type: 'node_fail'; id: string; data: INode };
```

## 使用示例

### 1. 单节点执行（单次）

```typescript
import { NodeExecutor } from '@sker/workflow';
import { of } from 'rxjs';
import { root } from '@sker/core';

const executor = root.get(NodeExecutor);
const node = { id: 'test', type: 'TestNode', state: 'pending', ... };

executor.run(node, of({ input: 'value' })).subscribe({
    next: (event) => {
        console.log(event.type, event);
    },
    complete: () => console.log('完成')
});
```

### 2. 单节点执行（多次发射）

```typescript
import { Subject } from 'rxjs';

const input$ = new Subject();
const executor = root.get(NodeExecutor);

executor.run(node, input$).subscribe({
    next: (event) => console.log(event)
});

// 触发多次执行
input$.next({ value: 1 });
input$.next({ value: 2 });
input$.next({ value: 3 });
input$.complete();
```

### 3. 工作流执行

```typescript
import { createWorkflowGraphAst } from '@sker/workflow';

const workflow = createWorkflowGraphAst({
    nodes: [
        { id: 'A', type: 'TestNode', ... },
        { id: 'B', type: 'TestNode', ... },
        { id: 'C', type: 'Test2Node', ... }
    ],
    edges: [
        { from: 'A', to: 'C', fromProperty: 'output', toProperty: 'inputA' },
        { from: 'B', to: 'C', fromProperty: 'output', toProperty: 'inputB' }
    ],
    entryNodeIds: ['A', 'B']
});

executor.run(workflow, of({})).subscribe({
    next: (event) => {
        if (event.type === 'node_success') {
            console.log(`节点 ${event.id} 完成`);
        }
    }
});
```

### 4. 工作流多次触发

```typescript
const input$ = new Subject();

executor.run(workflow, input$).subscribe({
    next: (event) => console.log(event)
});

// 每次发射触发整个工作流执行
input$.next({ param: 'run1' });
input$.next({ param: 'run2' });
```

## 便捷函数

### `executeAst(node: INode, ctx?: any): Observable<NodeEvent>`

执行单个节点（单次）。

```typescript
import { executeAst } from '@sker/workflow';

executeAst(node).subscribe({
    next: (event) => console.log(event)
});
```

### `executeWorkflow(workflow: WorkflowGraphAst, input?: any): Observable<NodeEvent>`

执行工作流（单次）。

```typescript
import { executeWorkflow } from '@sker/workflow';

executeWorkflow(workflow, { param: 'value' }).subscribe({
    next: (event) => console.log(event)
});
```

### `executeWorkflowImmediate(workflow: WorkflowGraphAst, input?: any): Promise<WorkflowGraphAst>`

执行工作流并返回 Promise。

```typescript
import { executeWorkflowImmediate } from '@sker/workflow';

const result = await executeWorkflowImmediate(workflow, { param: 'value' });
console.log(result.state); // 'success' or 'fail'
```

## 节点 Visitor 实现

每个节点类型需要一个 Visitor 来定义执行逻辑：

```typescript
import { Handler, Node, Ast, Input, Output } from '@sker/workflow';
import { Observable } from 'rxjs';

@Node({ title: '测试节点' })
class TestNode extends Ast {
    type: 'TestNode' = 'TestNode';

    @Input()
    input: number = 0;

    @Output()
    output: number = 0;
}

class TestNodeVisitor {
    @Handler(TestNode)
    visit(node: TestNode): Observable<NodeEvent> {
        return new Observable(obs => {
            // 1. 发射 running 状态
            node.state = 'running';
            obs.next({ type: 'node_runing', id: node.id, data: node });

            // 2. 执行业务逻辑
            node.output = node.input * 2;

            // 3. 发射输出（可选）
            obs.next({
                type: 'node_emit',
                id: node.id,
                property: 'output',
                value: node.output
            });

            // 4. 发射 success 状态
            node.state = 'success';
            obs.next({ type: 'node_success', id: node.id, data: node });

            obs.complete();
        });
    }
}
```

## 工作流特性

### 1. 自动确定入口节点

如果未指定 `entryNodeIds`，自动查找入度为 0 的节点：

```typescript
const workflow = createWorkflowGraphAst({
    nodes: [...],
    edges: [...],
    // entryNodeIds 未指定，自动查找
});
```

### 2. 边模式

支持多种边合并模式：

```typescript
import { EdgeMode } from '@sker/workflow';

const edges = [
    {
        from: 'A',
        to: 'C',
        fromProperty: 'output',
        toProperty: 'input',
        mode: EdgeMode.COMBINE_LATEST // 任一变化触发
    },
    {
        from: 'B',
        to: 'C',
        fromProperty: 'output',
        toProperty: 'input',
        mode: EdgeMode.ZIP // 配对执行
    }
];
```

**边模式**：
- `MERGE`: 任一上游发射立即触发
- `ZIP`: 配对执行（索引对齐）
- `COMBINE_LATEST`: 任一变化触发，使用所有最新值
- `WITH_LATEST_FROM`: 主流触发，携带其他流最新值

### 3. BehaviorSubject 输出

节点的 `@Output` 属性会自动初始化为 `BehaviorSubject`，支持多次发射：

```typescript
@Node()
class StreamNode extends Ast {
    @Output()
    stream: BehaviorSubject<number> = new BehaviorSubject(0);
}

// Visitor 中多次发射
class StreamNodeVisitor {
    @Handler(StreamNode)
    visit(node: StreamNode): Observable<NodeEvent> {
        return new Observable(obs => {
            node.state = 'running';
            obs.next({ type: 'node_runing', id: node.id, data: node });

            // 多次发射不同的值
            node.stream.next(1);
            node.stream.next(2);
            node.stream.next(3);

            node.state = 'success';
            obs.next({ type: 'node_success', id: node.id, data: node });
            obs.complete();
        });
    }
}
```

## 与 ReactiveScheduler 的关系

- `NodeExecutor`: 轻量级执行器，专注于节点执行
- `ReactiveScheduler`: 完整的工作流调度器，支持增量执行、错误重试等高级特性

**选择建议**：
- 简单场景：使用 `NodeExecutor`
- 复杂场景（增量执行、错误处理）：使用 `ReactiveScheduler`

## 注意事项

1. **平台无关**：不要在 `@sker/workflow` 中引入 React/Node.js 依赖
2. **事件驱动**：所有状态变更通过事件流传递
3. **不可变性**：每次执行克隆节点，避免状态污染
4. **WorkflowGraphAst 平等对待**：工作流也是节点，可以嵌套
