
# 工作流图流事件系统设计方案

## 1. 核心目标

将 `WorkflowGraphAst` 构建为一个完整的图流系统，支持实时事件发射，实现数据驱动的事件驱动架构。

## 2. 技术架构

### 2.1 事件类型设计

```ts
// 1. 节点状态事件 - 实时反映节点状态变化
export interface NodeStateEvent {
    type: 'node_state';
    nodeId: string;
    data: INode;  // 完整的节点实例（包含当前状态、属性、错误等）
}

// 2. 输出发射事件 - 数据真正流向下游时触发
export interface OutputEmitEvent {
    type: 'output_emit';
    nodeId: string;
    property: string;  // 输出属性名
    value: any;        // 发射的值
}

// 3. 工作流完成事件 - 整个工作流结束
export interface WorkflowCompleteEvent {
    type: 'workflow_complete';
    workflowId?: string;
}

// 4. 工作流错误事件 - 任何节点失败时触发
export interface WorkflowErrorEvent {
    type: 'workflow_error';
    nodeId?: string;   // 哪个节点出错
    error: any;        // 错误信息
}
```

### 2.2 数据流架构

```
工作流图流
    ↓
ReactiveScheduler (调度器)
    ↓
为每个节点创建:
  - 输入 Subject (接收上游数据)
  - 输出 BehaviorSubject (发射数据给下游)
    ↓
节点执行流: executeAst(node) → Observable<INode>
    ↓
事件转换流: NodeStateEvent + OutputEmitEvent
    ↓
事件总线: WorkflowEventBus
    ↓
下游节点: 通过 BehaviorSubject 实时接收数据
```

## 3. 关键实现点

### 3.1 BehaviorSubject 初始化

每个节点的 `@Output` 装饰器属性都会被初始化为 `BehaviorSubject`：

```ts
private initializeOutputSubjects(ast: WorkflowGraphAst): void {
    ast.nodes.forEach(node => {
        if (!isNode(node)) {
            const compiler = root.get(Compiler);
            node = compiler.compile(node);
        }
        if (!node.metadata?.outputs) return;

        node.metadata.outputs.forEach(output => {
            const key = output.property;
            const current = (node as any)[key];

            // 如果还不是 BehaviorSubject，创建一个
            if (!isBehaviorSubject(current)) {
                (node as any)[key] = new BehaviorSubject(current ?? null);
            }
        });
    });
}
```

### 3.2 纯事件流构建

```ts
private buildEventNetwork(ast: WorkflowGraphAst, ctx: WorkflowGraphAst): Observable<WorkflowEvent> {
    // 1. 初始化所有节点的 @Output BehaviorSubject
    this.initializeOutputSubjects(ast);

    // 2. 为每个节点创建输入 Subject 和事件流
    const nodeEventStreams = new Map<string, Observable<WorkflowEvent>>();
    const inputSubjects = new Map<string, Subject<any>>();

    ast.nodes.forEach(node => {
        const input$ = new Subject<any>();
        inputSubjects.set(node.id, input$);

        const nodeEventStream$ = this.buildNodeEventStream(node, input$, ast, ctx);
        nodeEventStreams.set(node.id, nodeEventStream$);
    });

    // 3. 按边分组连接数据流
    const edgeGroups = this.groupEdgesByTarget(ast);
    edgeGroups.forEach(group => {
        this.connectEdgesToNode(group, ast, inputSubjects);
    });

    // 4. 触发起始节点
    this.triggerStartNodes(ast, inDegrees, inputSubjects);

    // 5. 合并所有节点的事件流
    return this.mergeNodeEventStreams(ast, nodeEventStreams, inputSubjects).pipe(
        finalize(() => {
            // 工作流完成后关闭所有输入Subjects
            inputSubjects.forEach(subject => {
                if (!subject.closed) {
                    subject.complete();
                }
            });
            // 关闭所有输出Subjects
            this.completeOutputSubjects(ast);
        })
    );
}
```

### 3.3 节点事件流构建

```ts
private buildNodeEventStream(
    node: INode,
    input$: Observable<any>,
    ast: WorkflowGraphAst,
    ctx: WorkflowGraphAst
): Observable<WorkflowEvent> {
    return input$.pipe(
        concatMap(inputData => {
            // 将输入数据赋给节点
            if (inputData) {
                Object.assign(node, inputData);
            }

            // 执行节点并转换为事件流
            return executeAst(node, ctx).pipe(
                concatMap(updatedNode => {
                    const events: WorkflowEvent[] = [];

                    // 1. 发射节点状态事件
                    events.push({
                        type: 'node_state',
                        nodeId: updatedNode.id,
                        data: updatedNode
                    });

                    // 2. 提取并发射输出事件
                    const outputEvents = this.extractOutputEvents(updatedNode as INode);
                    events.push(...outputEvents);

                    return events;
                }),
                catchError(error => {
                    // 错误处理
                    node.state = 'fail';
                    node.error = error;
                    return [
                        { type: 'node_state', nodeId: node.id, data: node } as NodeStateEvent,
                        { type: 'workflow_error', nodeId: node.id, error } as WorkflowErrorEvent
                    ];
                })
            );
        }),
        shareReplay(1)
    );
}
```

### 3.4 输出事件提取

```ts
private extractOutputEvents(node: INode): OutputEmitEvent[] {
    if (!isNode(node)) {
        const compiler = root.get(Compiler);
        node = compiler.compile(node);
    }
    if (!node.metadata?.outputs) return [];

    const events: OutputEmitEvent[] = [];

    node.metadata.outputs.forEach(output => {
        const key = output.property;
        const subject = (node as any)[key];

        if (isBehaviorSubject(subject)) {
            const value = subject.getValue();

            // 只有非空值才发射事件
            if (value !== null && value !== undefined && value !== '') {
                events.push({
                    type: 'output_emit',
                    nodeId: node.id,
                    property: key,
                    value
                });
            }
        }
    });

    return events;
}
```

## 4. 事件总线集成

### 4.1 WorkflowEventBus

```ts
@Injectable()
export class WorkflowEventBus extends Subject<WorkflowEvent> {
    /**
     * 按类型过滤事件流
     */
    ofType<T = any>(...types: WorkflowEventType[]): Observable<WorkflowEvent<T>> {
        return this.pipe(
            filter(event => types.includes(event.type))
        ) as Observable<WorkflowEvent<T>>;
    }

    // 工作流级事件
    emitWorkflowStart(workflowId?: string): void
    emitWorkflowComplete(workflowId?: string, result?: any): void
    emitWorkflowFail(workflowId?: string, error?: any): void

    // 节点级事件
    emitNodeStart(nodeId: string, workflowId?: string): void
    emitNodeEmit(nodeId: string, output: any, workflowId?: string): void
    emitNodeSuccess(nodeId: string, result: any, workflowId?: string): void
    emitNodeFail(nodeId: string, error: any, workflowId?: string): void

    // 输出级事件
    emitOutputEmit(nodeId: string, property: string, value: any, workflowId?: string): void
}
```

### 4.2 事件流转换

```ts
schedule(ast: WorkflowGraphAst, parent: WorkflowGraphAst): Observable<WorkflowGraphAst> {
    // ...

    return this.buildEventNetwork(ast, parent).pipe(
        // 将事件流转换为状态累积流
        scan((workflow: WorkflowGraphAst, event: WorkflowEvent) => {
            switch (event.type) {
                case 'node_state':
                    const node = event.data;
                    if (node.state === 'success') {
                        this.eventBus.emitNodeSuccess(node.id, node, ast.id);
                    } else if (node.state === 'fail') {
                        this.eventBus.emitNodeFail(node.id, node.error, ast.id);
                    } else if (node.state === 'running') {
                        this.eventBus.emitNodeEmit(node.id, node, ast.id);
                    }
                    return updateNodeReducer(workflow, {
                        nodeId: event.nodeId,
                        updates: event.data
                    });
                case 'output_emit':
                    // 发射输出事件到事件总线
                    this.eventBus.emitOutputEmit(
                        event.nodeId,
                        event.property,
                        event.value,
                        ast.id
                    );
                    return workflow;
                case 'workflow_complete':
                    return finalizeWorkflowReducer(workflow);
                case 'workflow_error':
                    return failWorkflowReducer(workflow, event.error);
                default:
                    return workflow;
            }
        }, ast),
        // 最后一次状态就是完整的 WorkflowGraphAst
        takeLast(1),
        map((finalWorkflow: WorkflowGraphAst) => {
            // ...
            return finalWorkflow;
        }),
        finalize(() => {
            if (ast.state === 'fail') {
                this.eventBus.emitWorkflowFail(ast.id, ast.error);
            } else {
                this.eventBus.emitWorkflowComplete(ast.id, ast);
            }
        })
    );
}
```

## 5. 使用示例

### 5.1 监听所有节点状态变化

```ts
import { root } from '@sker/core';
import { WorkflowEventBus } from '@sker/workflow';

const eventBus = root.get(WorkflowEventBus);

// 监听所有节点状态变化
eventBus.ofType('node_state').subscribe(event => {
    console.log(`节点 ${event.nodeId} 状态变化:`, event.data.state);
    console.log('节点数据:', event.data);
});

// 监听特定节点的输出
eventBus.ofType('output_emit').pipe(
    filter(event => event.nodeId === 'node-abc123')
).subscribe(event => {
    console.log(`节点 ${event.nodeId} 输出 ${event.property}:`, event.value);
});

// 监听工作流完成
eventBus.ofType('workflow_complete').subscribe(event => {
    console.log('工作流完成:', event.workflowId);
});
```

### 5.2 监听节点的 BehaviorSubject

```ts
// 获取特定节点
const node = workflow.nodes.find(n => n.id === 'node-abc123');

// 直接监听输出属性的 BehaviorSubject（实时数据流）
(node as any).text$.subscribe(value => {
    console.log('实时输出:', value);
});

// 或者获取值
const currentValue = (node as any).text$.getValue();
console.log('当前输出:', currentValue);
```

### 5.3 在 SSE 中使用

```ts
app.get('/api/workflow/:id/events', (req, res) => {
    const eventBus = root.get(WorkflowEventBus);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    // 监听节点状态
    eventBus.ofType('node_state').subscribe(event => {
        res.write(`data: ${JSON.stringify({
            type: 'node_state',
            nodeId: event.nodeId,
            state: event.data.state,
            error: event.data.error
        })}\n\n`);
    });

    // 监听输出发射
    eventBus.ofType('output_emit').subscribe(event => {
        res.write(`data: ${JSON.stringify({
            type: 'output_emit',
            nodeId: event.nodeId,
            property: event.property,
            value: event.value
        })}\n\n`);
    });
});
```

## 6. 优势特性

### 6.1 纯流式事件发射

- **事件驱动**：每次数据流向下游时都发射 `output_emit` 事件
- **实时性**：通过 `BehaviorSubject` 实现真正的实时数据流
- **可观测性**：所有节点状态变化都有事件记录

### 6.2 优雅的错误处理

- **错误隔离**：单个节点失败不影响整个工作流
- **错误传播**：通过 `workflow_error` 事件通知上层
- **重试机制**：支持配置节点级重试策略

### 6.3 灵活的流合并

支持多种边模式：
- `MERGE`：任一上游发射立即触发
- `ZIP`：配对执行
- `COMBINE_LATEST`：任一变化触发，使用最新值
- `WITH_LATEST_FROM`：主流触发，携带其他流最新值

### 6.4 完善的生命周期

工作流生命周期：
- `node_state` → 节点状态变化
- `output_emit` → 数据流向下游
- `workflow_complete` / `workflow_error` → 工作流结束

## 7. 总结

这个图流事件系统实现了：

1. **完整的事件覆盖**：节点状态、输出发射、工作流完成/失败
2. **纯流式架构**：基于 RxJS 的 Observable 和 Subject
3. **实时数据流**：通过 BehaviorSubject 实现真正的实时传输
4. **统一事件总线**：WorkflowEventBus 提供统一的事件分发机制
5. **灵活的订阅方式**：支持按类型过滤、按节点过滤、直接监听等

整个系统遵循事件驱动架构，提供了强大的可观测性和实时性，完美满足了实时输出的需求。