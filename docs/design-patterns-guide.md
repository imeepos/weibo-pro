# 设计模式编程指导规范

## 目录
1. [创建型模式](#创建型模式)
2. [结构型模式](#结构型模式)
3. [行为型模式](#行为型模式)
4. [项目中的应用实践](#项目中的应用实践)
5. [最佳实践原则](#最佳实践原则)

---

## 创建型模式

### 1. 单例模式 (Singleton)

**场景**:
- 全局配置管理
- 数据库连接池
- 日志管理器
- 依赖注入容器

**最佳实践**:
```typescript
// ✅ 推荐：使用依赖注入容器
import { root, Injectable } from '@sker/core'

@Injectable()
export class DatabaseService {
  private static instance: DatabaseService

  constructor() {
    if (DatabaseService.instance) {
      return DatabaseService.instance
    }
    DatabaseService.instance = this
  }
}

// 使用 DI 容器管理
const db = root.get(DatabaseService)
```

**注意事项**:
- 避免过度使用，会导致状态管理困难
- 优先使用 DI 容器而非手动单例
- 注意多线程环境下的安全性

---

### 2. 工厂方法模式 (Factory Method)

**场景**:
- 创建对象时不需要指定具体类
- 工作流节点创建
- 支付方式选择
- 数据源切换

**最佳实践**:
```typescript
// 工作流节点工厂
export interface NodeHandlerFactory {
  createHandler(type: string): NodeHandler
}

@Injectable()
export class WorkflowNodeFactory implements NodeHandlerFactory {
  private handlers = new Map<string, new () => NodeHandler>()

  register(type: string, handler: new () => NodeHandler) {
    this.handlers.set(type, handler)
  }

  createHandler(type: string): NodeHandler {
    const Handler = this.handlers.get(type)
    if (!Handler) {
      throw new Error(`Unknown node type: ${type}`)
    }
    return new Handler()
  }
}
```

---

### 3. 抽象工厂模式 (Abstract Factory)

**场景**:
- 需要创建一系列相关对象
- 跨平台 UI 组件
- 不同数据库的适配器

**最佳实践**:
```typescript
// 数据库抽象工厂
export interface DatabaseFactory {
  createConnection(): Connection
  createQueryBuilder(): QueryBuilder
}

export class PostgresFactory implements DatabaseFactory {
  createConnection() { return new PostgresConnection() }
  createQueryBuilder() { return new PostgresQueryBuilder() }
}

export class MySQLFactory implements DatabaseFactory {
  createConnection() { return new MySQLConnection() }
  createQueryBuilder() { return new MySQLQueryBuilder() }
}
```

---

### 4. 建造者模式 (Builder)

**场景**:
- 构建复杂对象
- 工作流配置
- API 请求构建器

**最佳实践**:
```typescript
// 工作流构建器
export class WorkflowBuilder {
  private workflow: Partial<Workflow> = {}

  setName(name: string) {
    this.workflow.name = name
    return this
  }

  addNode(node: WorkflowNode) {
    if (!this.workflow.nodes) {
      this.workflow.nodes = []
    }
    this.workflow.nodes.push(node)
    return this
  }

  build(): Workflow {
    if (!this.workflow.name || !this.workflow.nodes) {
      throw new Error('Invalid workflow')
    }
    return this.workflow as Workflow
  }
}

// 使用
const workflow = new WorkflowBuilder()
  .setName('数据采集流程')
  .addNode(fetchNode)
  .addNode(processNode)
  .build()
```

---

### 5. 原型模式 (Prototype)

**场景**:
- 创建对象成本较高
- 需要保存对象状态副本
- 工作流模板复制

**最佳实践**:
```typescript
export class WorkflowTemplate implements Cloneable<WorkflowTemplate> {
  clone(): WorkflowTemplate {
    const cloned = Object.create(Object.getPrototypeOf(this))
    cloned.nodes = this.nodes.map(node => node.clone())
    return cloned
  }
}
```

---

## 结构型模式

### 6. 适配器模式 (Adapter)

**场景**:
- 集成第三方服务
- 数据格式转换
- Legacy 代码适配

**最佳实践**:
```typescript
// RabbitMQ 适配器
@Injectable()
export class RabbitMQAdapter implements MessageQueue {
  private client: amqp.Connection

  async publish(queue: string, message: any) {
    await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)))
  }

  async subscribe(queue: string, handler: (msg: any) => void) {
    await this.channel.consume(queue, (msg) => {
      handler(JSON.parse(msg.content.toString()))
    })
  }
}
```

---

### 7. 桥接模式 (Bridge)

**场景**:
- 分离抽象和实现
- 多维度的变化
- 平台无关性

**最佳实践**:
```typescript
// 工作流引擎与执行器桥接
export abstract class WorkflowEngine {
  constructor(protected executor: WorkflowExecutor) {}

  abstract execute(workflow: Workflow): Promise<Result>
}

export class BrowserWorkflowEngine extends WorkflowEngine {
  async execute(workflow: Workflow) {
    return this.executor.runInBrowser(workflow)
  }
}

export class ServerWorkflowEngine extends WorkflowEngine {
  async execute(workflow: Workflow) {
    return this.executor.runOnServer(workflow)
  }
}
```

---

### 8. 组合模式 (Composite)

**场景**:
- 树形结构
- 文件系统
- UI 组件树
- 工作流节点树

**最佳实践**:
```typescript
export interface WorkflowNode {
  execute(context: ExecutionContext): Promise<NodeResult>
}

export class CompositeNode implements WorkflowNode {
  private children: WorkflowNode[] = []

  add(child: WorkflowNode) {
    this.children.push(child)
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const results = await Promise.all(
      this.children.map(child => child.execute(context))
    )
    return { results }
  }
}
```

---

### 9. 装饰器模式 (Decorator)

**场景**:
- 动态添加功能
- 日志、缓存、验证
- NestJS 的装饰器

**最佳实践**:
```typescript
// 控制器装饰器
export function Controller(prefix: string): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata('prefix', prefix, target)
  }
}

// 验证装饰器
export function Validate(schema: z.ZodSchema): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    Reflect.defineMetadata('validate', schema, target, propertyKey, parameterIndex)
  }
}
```

---

### 10. 外观模式 (Facade)

**场景**:
- 简化复杂子系统
- API 网关
- SDK 封装

**最佳实践**:
```typescript
// SDK 外观
export class WeiboProSDK {
  constructor(
    private workflow: WorkflowController,
    private keywords: KeywordsController,
    private crawler: CrawlerController
  ) {}

  async analyzeTopic(topic: string) {
    // 简化多个子系统的调用
    const workflow = await this.workflow.create({ name: topic })
    const keywords = await this.keywords.extract(topic)
    const data = await this.crawler.fetch(topic)
    return { workflow, keywords, data }
  }
}
```

---

### 11. 享元模式 (Flyweight)

**场景**:
- 大量相似对象
- 共享内在状态
- 文本编辑器、游戏引擎

**最佳实践**:
```typescript
// 工作流节点享元
export class NodeFactory {
  private flyweights = new Map<string, WorkflowNode>()

  getFlyweight(key: string, createFn: () => WorkflowNode) {
    if (!this.flyweights.has(key)) {
      this.flyweights.set(key, createFn())
    }
    return this.flyweights.get(key)!
  }
}
```

---

### 12. 代理模式 (Proxy)

**场景**:
- 访问控制
- 延迟初始化
- 缓存代理
- 日志代理

**最佳实践**:
```typescript
// 懒加载代理
export class LazyProxy<T> {
  private instance?: T
  private factory: () => T

  constructor(factory: () => T) {
    this.factory = factory
  }

  get target(): T {
    if (!this.instance) {
      this.instance = this.factory()
    }
    return this.instance
  }
}

// 使用
const lazyService = new LazyProxy(() => new ExpensiveService())
```

---

## 行为型模式

### 13. 责任链模式 (Chain of Responsibility)

**场景**:
- 请求处理流程
- 中间件管道
- 审批流程

**最佳实践**:
```typescript
// 工作流节点处理链
export interface NodeHandler {
  setNext(handler: NodeHandler): NodeHandler
  handle(context: NodeContext): Promise<NodeResult>
}

export abstract class BaseNodeHandler implements NodeHandler {
  private next?: NodeHandler

  setNext(handler: NodeHandler): NodeHandler {
    this.next = handler
    return handler
  }

  async handle(context: NodeContext): Promise<NodeResult> {
    const result = await this.process(context)
    if (this.next && result.shouldContinue) {
      return this.next.handle(context)
    }
    return result
  }

  protected abstract process(context: NodeContext): Promise<NodeResult>
}
```

---

### 14. 命令模式 (Command)

**场景**:
- 操作封装
- 撤销/重做
- 事务操作

**最佳实践**:
```typescript
export interface Command {
  execute(): Promise<void>
  undo(): Promise<void>
}

export class CreateWorkflowCommand implements Command {
  constructor(
    private service: WorkflowService,
    private data: CreateWorkflowDto
  ) {}

  async execute() {
    this.workflowId = await this.service.create(this.data)
  }

  async undo() {
    if (this.workflowId) {
      await this.service.delete(this.workflowId)
    }
  }
}
```

---

### 15. 迭代器模式 (Iterator)

**场景**:
- 遍历集合
- 异步数据流
- RxJS Observable

**最佳实践**:
```typescript
// 使用 RxJS Observable
export class DataStreamService {
  streamWorkflowResults(workflowId: string): Observable<WorkflowResult> {
    return new Observable(subscriber => {
      const iterator = this.executeWorkflow(workflowId)

      const process = async () => {
        for await (const result of iterator) {
          subscriber.next(result)
        }
        subscriber.complete()
      }

      process().catch(err => subscriber.error(err))
    })
  }
}
```

---

### 16. 中介者模式 (Mediator)

**场景**:
- 多对象协作
- 事件总线
- 聊天室

**最佳实践**:
```typescript
// 工作流执行中介者
@Injectable()
export class WorkflowMediator {
  private participants = new Map<string, WorkflowParticipant>()

  register(participant: WorkflowParticipant) {
    this.participants.set(participant.id, participant)
  }

  async notify(event: WorkflowEvent) {
    for (const participant of this.participants.values()) {
      await participant.onEvent(event)
    }
  }
}
```

---

### 17. 备忘录模式 (Memento)

**场景**:
- 状态快照
- 撤销机制
- 版本控制

**最佳实践**:
```typescript
export class WorkflowMemento {
  constructor(
    public readonly state: WorkflowState,
    public readonly timestamp: Date
  ) {}
}

export class WorkflowCareTaker {
  private history: WorkflowMemento[] = []

  save(memento: WorkflowMemento) {
    this.history.push(memento)
  }

  restore(index: number): WorkflowMemento | undefined {
    return this.history[index]
  }
}
```

---

### 18. 观察者模式 (Observer)

**场景**:
- 事件系统
- 响应式编程
- 数据绑定

**最佳实践**:
```typescript
// 使用 RxJS BehaviorSubject
export class WorkflowStore {
  private state$ = new BehaviorSubject<WorkflowState>(initialState)

  getState(): Observable<WorkflowState> {
    return this.state$.asObservable()
  }

  updateState(updater: (state: WorkflowState) => WorkflowState) {
    const current = this.state$.value
    this.state$.next(updater(current))
  }
}
```

---

### 19. 状态模式 (State)

**场景**:
- 对象状态变化
- 工作流状态机
- 订单状态

**最佳实践**:
```typescript
export interface WorkflowState {
  execute(context: ExecutionContext): Promise<WorkflowState>
}

export class PendingState implements WorkflowState {
  async execute(context: ExecutionContext): Promise<WorkflowState> {
    // 执行逻辑
    return new RunningState()
  }
}

export class RunningState implements WorkflowState {
  async execute(context: ExecutionContext): Promise<WorkflowState> {
    // 执行逻辑
    return new CompletedState()
  }
}
```

---

### 20. 策略模式 (Strategy)

**场景**:
- 算法族
- 数据验证策略
- 支付策略

**最佳实践**:
```typescript
// NLP 处理策略
export interface NLPStrategy {
  process(text: string): Promise<NLPResult>
}

export class JiebaStrategy implements NLPStrategy {
  async process(text: string) {
    // 结巴分词逻辑
  }
}

export class OpenAIStrategy implements NLPStrategy {
  async process(text: string) {
    // OpenAI 处理逻辑
  }
}

@Injectable()
export class NLPService {
  constructor(private strategy: NLPStrategy) {}

  async process(text: string) {
    return this.strategy.process(text)
  }
}
```

---

### 21. 模板方法模式 (Template Method)

**场景**:
- 算法骨架
- 工作流节点基类
- 数据处理流程

**最佳实践**:
```typescript
export abstract class BaseNodeHandler {
  async execute(context: NodeContext): Promise<NodeResult> {
    // 模板方法定义流程
    await this.validate(context)
    const data = await this.fetchData(context)
    const result = await this.processData(data, context)
    await this.saveResult(result)
    return result
  }

  protected abstract validate(context: NodeContext): Promise<void>
  protected abstract fetchData(context: NodeContext): Promise<any>
  protected abstract processData(data: any, context: NodeContext): Promise<NodeResult>
  protected async saveResult(result: NodeResult): Promise<void> {}
}
```

---

### 22. 访问者模式 (Visitor)

**场景**:
- 复杂对象结构
- 代码生成器
- 编译器

**最佳实践**:
```typescript
export interface WorkflowNodeVisitor {
  visitFetchNode(node: FetchNode): void
  visitProcessNode(node: ProcessNode): void
  visitExportNode(node: ExportNode): void
}

export class CodeGeneratorVisitor implements WorkflowNodeVisitor {
  private code: string[] = []

  visitFetchNode(node: FetchNode) {
    this.code.push(`fetch('${node.url}')`)
  }

  visitProcessNode(node: ProcessNode) {
    this.code.push(`process(${node.config})`)
  }

  getCode(): string {
    return this.code.join('\n')
  }
}
```

---

## 项目中的应用实践

### 依赖注入 (DI 容器)

```typescript
// 使用 @sker/core 的 DI 容器
import { Injectable, Inject, root } from '@sker/core'

@Injectable()
export class KeywordsService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(RedisService) private cache: RedisService
  ) {}

  async getKeywords() {
    // 使用注入的依赖
  }
}

// 获取实例
const service = root.get(KeywordsService)
```

### 工作流引擎

```typescript
// 组合模式 + 策略模式 + 命令模式
export class WorkflowEngine {
  constructor(
    private nodeFactory: NodeFactory,
    private executor: WorkflowExecutor
  ) {}

  async execute(workflow: Workflow) {
    const root = new CompositeNode()
    for (const nodeConfig of workflow.nodes) {
      const handler = this.nodeFactory.create(nodeConfig.type)
      root.add(handler)
    }
    return root.execute(workflow.context)
  }
}
```

### 响应式状态管理

```typescript
// 观察者模式 (RxJS)
export class WorkflowStore {
  private workflows$ = new BehaviorSubject<Workflow[]>([])

  getWorkflows(): Observable<Workflow[]> {
    return this.workflows$.asObservable()
  }

  addWorkflow(workflow: Workflow) {
    const current = this.workflows$.value
    this.workflows$.next([...current, workflow])
  }
}
```

---

## 最佳实践原则

### SOLID 原则

1. **单一职责原则 (SRP)**
   - 每个类/模块只负责一个功能
   - Service 只处理业务逻辑，Controller 只处理路由

2. **开闭原则 (OCP)**
   - 对扩展开放，对修改关闭
   - 使用策略模式替代大量 if-else

3. **里氏替换原则 (LSP)**
   - 子类可以替换父类
   - 实现 interface 时必须遵守契约

4. **接口隔离原则 (ISP)**
   - 接口应该小而专注
   - 避免胖接口

5. **依赖倒置原则 (DIP)**
   - 依赖抽象而非具体实现
   - 使用 DI 容器管理依赖

### 设计模式使用原则

1. **不要过度设计**
   - 简单问题用简单方案
   - 不是所有地方都需要模式

2. **优先使用组合而非继承**
   ```typescript
   // ✅ 推荐
   class WorkflowWithLogger {
     constructor(private workflow: Workflow, private logger: Logger) {}
   }

   // ❌ 避免
   class WorkflowWithLogger extends Workflow {}
   ```

3. **明确模式的意图**
   - 单例：确保唯一实例
   - 工厂：封装创建逻辑
   - 策略：算法可替换

4. **保持代码可读性**
   - 使用有意义的命名
   - 添加必要的注释
   - 遵循项目规范

### 性能考虑

1. **避免不必要的抽象层**
   - 直接调用比模式调用更快
   - 在性能关键路径减少模式使用

2. **缓存和享元**
   - 复用昂贵对象
   - 使用 DI 容器单例

3. **异步处理**
   - 使用 Observable 处理流式数据
   - 避免阻塞事件循环

---

## 总结

| 模式 | 使用频率 | 典型场景 |
|------|---------|---------|
| 单例 | ⭐⭐⭐⭐⭐ | DI 容器、配置管理 |
| 工厂 | ⭐⭐⭐⭐ | 对象创建、工作流节点 |
| 适配器 | ⭐⭐⭐⭐ | 第三方集成 |
| 装饰器 | ⭐⭐⭐⭐ | NestJS 装饰器 |
| 代理 | ⭐⭐⭐ | 懒加载、权限控制 |
| 策略 | ⭐⭐⭐⭐ | 算法选择 |
| 观察者 | ⭐⭐⭐⭐⭐ | RxJS、事件系统 |
| 责任链 | ⭐⭐⭐ | 中间件、审批流程 |
| 组合 | ⭐⭐⭐⭐ | 树形结构 |
| 模板方法 | ⭐⭐⭐⭐ | 基类定义流程 |

**记住**: 设计模式是工具，不是目标。根据实际需求选择合适的模式，避免为了使用模式而使用模式。
