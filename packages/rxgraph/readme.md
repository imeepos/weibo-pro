# RxJS 深度分析与流图设计

## 一、RxJS 的优点

### 1. **声明式编程范式**
- 以数据流的视角描述"做什么"而非"怎么做"
- 代码更接近业务逻辑本质，易于理解和维护

### 2. **异步编程统一抽象**
- 将事件、Promise、定时器、WebSocket等异步源统一为Observable
- 消除回调地狱，避免Promise链的扁平化困境

### 3. **强大的组合能力**
- 100+ 操作符可自由组合，像乐高积木一样构建复杂逻辑
- 管道式API (`pipe()`) 提供清晰的数据转换链路

### 4. **背压（Backpressure）管理**
- 通过 `throttle`, `debounce`, `buffer` 等操作符控制数据流速
- 防止生产者速度过快导致消费者崩溃

### 5. **内存安全**
- `Subscription` 机制确保资源释放
- 自动取消订阅，避免内存泄漏

### 6. **函数式编程思想**
- 不可变数据流，无副作用
- 易于测试、推理和调试

---

## 二、核心概念

### 1. **Observable（可观察对象）**
```typescript
// 本质：惰性的事件流生产者
const stream$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.complete()
})
```
- **特性**：冷启动（订阅时才执行）、可多次订阅、支持同步/异步

### 2. **Observer（观察者）**
```typescript
const observer = {
  next: (value) => console.log(value),
  error: (err) => console.error(err),
  complete: () => console.log('done')
}
```
- **角色**：数据流的消费者，定义三种事件的处理逻辑

### 3. **Subscription（订阅对象）**
```typescript
const sub = stream$.subscribe(observer)
sub.unsubscribe() // 释放资源
```
- **职责**：表示Observable的执行，提供取消机制

### 4. **Operators（操作符）**
```typescript
stream$.pipe(
  map(x => x * 2),
  filter(x => x > 5)
)
```
- **本质**：纯函数，输入Observable，输出新的Observable
- **分类**：创建型、转换型、过滤型、组合型、错误处理型等

### 5. **Subject（主题）**
```typescript
const subject = new Subject()
subject.subscribe(x => console.log('A:', x))
subject.subscribe(x => console.log('B:', x))
subject.next(1) // 多播：A和B都收到
```
- **特性**：既是Observable又是Observer，支持多播（multicast）
- **变体**：`BehaviorSubject`（有初始值）、`ReplaySubject`（重放N个值）、`AsyncSubject`（只发射最后一个值）

### 6. **Scheduler（调度器）**
```typescript
of(1, 2, 3, asyncScheduler).subscribe(...)
```
- **作用**：控制Observable何时发射数据、在哪个执行上下文
- **类型**：`queueScheduler`、`asapScheduler`、`asyncScheduler`、`animationFrameScheduler`

---

## 三、操作符用途分类

### 1. **创建型操作符**
| 操作符 | 用途 |
|--------|------|
| `of()` | 同步发射静态值 |
| `from()` | 将数组/Promise/可迭代对象转为Observable |
| `interval()` | 定时器，周期性发射递增数字 |
| `fromEvent()` | 将DOM事件转为Observable |
| `defer()` | 惰性创建，每次订阅时执行工厂函数 |

### 2. **转换型操作符**
| 操作符 | 用途 |
|--------|------|
| `map()` | 映射每个值（同步转换） |
| `mergeMap()` | 映射为Observable并合并（适合并发请求） |
| `switchMap()` | 映射为Observable并切换（取消旧请求，适合搜索） |
| `concatMap()` | 映射为Observable并串联（保证顺序） |
| `exhaustMap()` | 映射为Observable但忽略新值（防止重复提交） |
| `scan()` | 累加器（类似Array.reduce但持续发射中间值） |

### 3. **过滤型操作符**
| 操作符 | 用途 |
|--------|------|
| `filter()` | 过滤满足条件的值 |
| `take()` | 取前N个值后完成 |
| `skip()` | 跳过前N个值 |
| `debounceTime()` | 防抖：在静默期后发射最后一个值 |
| `throttleTime()` | 节流：固定时间窗口内只发射一个值 |
| `distinctUntilChanged()` | 过滤连续重复值 |

### 4. **组合型操作符**
| 操作符 | 用途 |
|--------|------|
| `merge()` | 并发合并多个流（先到先得） |
| `concat()` | 串联多个流（前一个完成后执行下一个） |
| `combineLatest()` | 组合最新值（任一流发射时触发） |
| `zip()` | 配对发射（一对一组合） |
| `forkJoin()` | 等待所有流完成后发射最后值（类似Promise.all） |
| `withLatestFrom()` | 从辅助流获取最新值 |

### 5. **错误处理型操作符**
| 操作符 | 用途 |
|--------|------|
| `catchError()` | 捕获错误并返回新流或传播错误 |
| `retry()` | 错误时自动重试N次 |
| `retryWhen()` | 根据策略重试（如指数退避） |

### 6. **工具型操作符**
| 操作符 | 用途 |
|--------|------|
| `tap()` | 副作用操作（日志、调试） |
| `delay()` | 延迟发射 |
| `timeout()` | 超时抛错 |
| `share()` | 多播转换（冷流变热流） |
| `shareReplay()` | 多播+重放最后N个值 |

---

## 四、构建基于RxJS的流图系统

### 设计目标
构建一个**可视化的响应式数据流编排系统**，节点代表操作符，边代表数据流动。

### 核心架构

#### 1. **流图元模型**
```typescript
interface FlowGraph {
  nodes: FlowNode[]       // 节点列表
  edges: FlowEdge[]       // 边列表
  entryNodes: string[]    // 入口节点ID
}

interface FlowNode {
  id: string              // 唯一标识
  type: NodeType          // 节点类型
  operator: OperatorDef   // 操作符定义
  config: unknown         // 配置参数
}

interface FlowEdge {
  from: string            // 源节点ID
  to: string              // 目标节点ID
  fromPort?: string       // 源端口（支持多输出）
  toPort?: string         // 目标端口（支持多输入）
}

enum NodeType {
  SOURCE = 'source',      // 数据源节点
  OPERATOR = 'operator',  // 操作符节点
  SINK = 'sink'          // 终点节点（订阅）
}
```

#### 2. **操作符注册表**
```typescript
interface OperatorDef {
  name: string
  category: 'creation' | 'transformation' | 'filtering' | 'combination'
  inputPorts: PortDef[]   // 输入端口定义
  outputPorts: PortDef[]  // 输出端口定义
  configSchema: JSONSchema // 配置的JSON Schema
  factory: OperatorFactory // 创建RxJS操作符的工厂函数
}

type OperatorFactory = (config: unknown) => OperatorFunction<any, any>

// 示例：map操作符定义
const mapOperatorDef: OperatorDef = {
  name: 'map',
  category: 'transformation',
  inputPorts: [{ id: 'input', type: 'any' }],
  outputPorts: [{ id: 'output', type: 'any' }],
  configSchema: {
    type: 'object',
    properties: {
      expression: { type: 'string' }
    }
  },
  factory: (config) => map(new Function('x', `return ${config.expression}`))
}
```

#### 3. **流图编译器**
```typescript
class FlowGraphCompiler {
  compile(graph: FlowGraph): Observable<any> {
    // 1. 拓扑排序，检测循环依赖
    const sorted = this.topologicalSort(graph)

    // 2. 为每个节点创建Observable
    const nodeStreams = new Map<string, Observable<any>>()

    for (const nodeId of sorted) {
      const node = graph.nodes.find(n => n.id === nodeId)
      const inEdges = graph.edges.filter(e => e.to === nodeId)

      // 获取输入流
      const inputs = inEdges.map(e => nodeStreams.get(e.from))

      // 根据节点类型构建Observable
      let stream$: Observable<any>

      if (node.type === NodeType.SOURCE) {
        stream$ = this.createSourceStream(node)
      } else if (node.type === NodeType.OPERATOR) {
        stream$ = this.applyOperator(inputs, node)
      }

      nodeStreams.set(nodeId, stream$)
    }

    // 3. 返回终点节点的流
    const sinkNodes = graph.nodes.filter(n => n.type === NodeType.SINK)
    return merge(...sinkNodes.map(n => nodeStreams.get(n.id)))
  }

  private applyOperator(inputs: Observable<any>[], node: FlowNode): Observable<any> {
    const operator = node.operator.factory(node.config)

    if (inputs.length === 1) {
      return inputs[0].pipe(operator)
    } else {
      // 多输入：使用combineLatest或merge
      return combineLatest(inputs).pipe(operator)
    }
  }
}
```

#### 4. **执行引擎**
```typescript
class FlowGraphExecutor {
  private compiler = new FlowGraphCompiler()
  private subscriptions = new Map<string, Subscription>()

  execute(graph: FlowGraph): ExecutionContext {
    const stream$ = this.compiler.compile(graph)

    const sub = stream$.subscribe({
      next: (value) => this.handleOutput(value),
      error: (err) => this.handleError(err),
      complete: () => this.handleComplete()
    })

    const executionId = uuid()
    this.subscriptions.set(executionId, sub)

    return {
      id: executionId,
      stop: () => sub.unsubscribe(),
      pause: () => this.pauseExecution(executionId),
      resume: () => this.resumeExecution(executionId)
    }
  }
}
```

### 关键设计决策

#### 1. **热流 vs 冷流**
- **源节点**默认创建冷流（每次订阅重新执行）
- 通过 `share()` 或 `shareReplay()` 操作符节点转换为热流
- 支持显式标记节点为"共享模式"

#### 2. **多输入/多输出支持**
- **多输入**：通过 `combineLatest` 或 `merge` 聚合（根据节点配置）
- **多输出**：使用 `Subject` 实现多播，每条边订阅同一个Subject

#### 3. **错误隔离**
- 每个节点用 `catchError` 包裹，避免单点故障导致整个流图崩溃
- 错误节点标记为"失败"状态，允许部分流图继续执行

#### 4. **调试与监控**
```typescript
class DebugNode implements FlowNode {
  operator = {
    factory: () => tap({
      next: v => console.log(`[${this.id}] 发射:`, v),
      error: e => console.error(`[${this.id}] 错误:`, e),
      complete: () => console.log(`[${this.id}] 完成`)
    })
  }
}
```

### 示例流图

**场景**：搜索框实时搜索（防抖 + 取消旧请求）

```typescript
const searchGraph: FlowGraph = {
  nodes: [
    { id: 'input', type: NodeType.SOURCE, operator: fromEventOperator, config: { selector: '#search' } },
    { id: 'pluck', type: NodeType.OPERATOR, operator: mapOperator, config: { expression: 'x.target.value' } },
    { id: 'debounce', type: NodeType.OPERATOR, operator: debounceTimeOperator, config: { ms: 300 } },
    { id: 'filter', type: NodeType.OPERATOR, operator: filterOperator, config: { expression: 'x.length > 2' } },
    { id: 'search', type: NodeType.OPERATOR, operator: switchMapOperator, config: { fn: 'searchAPI' } },
    { id: 'output', type: NodeType.SINK, operator: tapOperator, config: { fn: 'renderResults' } }
  ],
  edges: [
    { from: 'input', to: 'pluck' },
    { from: 'pluck', to: 'debounce' },
    { from: 'debounce', to: 'filter' },
    { from: 'filter', to: 'search' },
    { from: 'search', to: 'output' }
  ],
  entryNodes: ['input']
}
```

**执行**：
```typescript
const executor = new FlowGraphExecutor()
const ctx = executor.execute(searchGraph)

// 停止执行
setTimeout(() => ctx.stop(), 60000)
```

---

## 五、总结

**RxJS的本质**是将**时间维度**纳入编程模型，让异步数据流像数组一样可组合、可转换。

**构建流图系统的核心**在于：
1. **元模型设计**：节点、边、端口的抽象
2. **编译器**：将图结构转换为Observable组合
3. **执行引擎**：管理订阅生命周期
4. **可扩展性**：通过注册表动态扩展操作符

这样的系统可用于：
- **数据管道编排**（ETL工具）
- **实时数据处理**（流式计算平台）
- **工作流引擎**（类似项目中的 @sker/workflow）
- **可视化编程**（低代码平台）

艺术在于**简洁的抽象** + **强大的组合能力**。每个节点都是独立的诗句，连接起来便是一首关于数据流动的史诗。
