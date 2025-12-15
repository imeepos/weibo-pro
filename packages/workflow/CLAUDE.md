# @sker/workflow - 工作流引擎核心包

## 包简介

@sker/workflow 是 Weibo-Pro 的工作流编排引擎核心，基于 AST（抽象语法树）+ 访问者模式（Visitor Pattern）+ RxJS 响应式流构建。将工作流节点建模为语法树节点，通过装饰器系统自动收集元数据，实现声明式的节点定义和数据流编排。

**设计哲学**：
- **存在即合理**：每个类、方法、属性都有不可替代的存在理由
- **优雅即简约**：装饰器驱动元数据，反射机制消除手工映射
- **节点平等**：WorkflowGraphAst 本身也是一个节点，可递归执行
- **流式思维**：基于 RxJS Observable，节点可多次发射值，支持流式数据处理

## 目录结构

```
packages/workflow/
├── src/
│   ├── ast.ts                          # AST 核心：Ast 基类、WorkflowGraphAst
│   ├── decorator.ts                    # 装饰器系统：@Node、@Input、@Output、@State、@Handler、@Render
│   ├── types.ts                        # 类型定义：INode、IEdge、EdgeMode、节点状态
│   ├── executor.ts                     # 节点执行器入口：NodeExecutor、便捷函数
│   ├── generate.ts                     # JSON 序列化/反序列化：fromJson、toJson
│   ├── utils.ts                        # 工具函数：ID 生成、clone、isObservable
│   ├── ast-utils.ts                    # AST 工具函数：节点/边管理、图操作、错误处理
│   ├── errors.ts                       # 错误定义（已迁移至 @sker/core）
│   ├── defaultVisitor.ts               # 默认访问者：无 Handler 时的回退执行器
│   ├── WorkflowGraphAstVisitor.ts      # 工作流执行器：@Handler(WorkflowGraphAst)
│   ├── execution/
│   │   ├── visitor-executor.ts         # 访问者执行器：查找并调用 Handler
│   │   ├── events.ts                   # 节点事件类型：node_runing、node_emit、node_success、node_fail
│   │   └── error-handler.ts            # 错误处理策略：retry、skip、fail、abort
│   ├── compiler/
│   │   └── index.ts                    # 编译器：将 AST 实例编译为 INode（提取装饰器元数据）
│   ├── operators/                      # RxJS 自定义操作符
│   │   ├── concat_latest_from.ts
│   │   ├── map-response.ts
│   │   └── tap-response.ts
│   ├── TextAreaAst.ts                  # 内置节点：文本输入
│   ├── DateAst.ts                      # 内置节点：日期输入
│   ├── MqAst.ts                        # 内置节点：消息队列
│   ├── StoreAst.ts                     # 内置节点：状态存储
│   ├── CollectorAst.ts                 # 内置节点：数据收集器
│   ├── LoopAst.ts                      # 内置节点：循环节点
│   ├── FilterAst.ts                    # 内置节点：过滤节点
│   └── MergeAst.ts                     # 内置节点：合并节点
├── package.json
├── tsup.config.ts
└── README.md
```

## 核心类和函数

### 1. AST 核心 (`src/ast.ts`)

**Ast 基类** (L28-L104)
- 所有节点的基类，实现 INode 接口
- 核心属性：
  - `id: string` - 唯一标识（自动生成 UUID）
  - `type: string` - 节点类型（序列化的关键）
  - `state: IAstStates` - 节点状态（pending/running/success/fail）
  - `error: SerializedError | undefined` - 错误信息
  - `metadata` - 编译后的元数据（inputs/outputs/states）
  - `position: { x: number; y: number }` - 画布位置
- 关键方法：
  - `toJSON()` (L86-L103) - 自定义序列化，排除 BehaviorSubject 和 Observable 属性

**WorkflowGraphAst** (L106-L177)
- 工作流节点，包含子节点和边
- 继承自 Ast，自身也是一个节点（可递归执行）
- 核心属性：
  - `nodes: INode[]` - 子节点列表
  - `edges: IEdge[]` - 边列表
  - `entryNodeIds: string[]` - 开始节点 ID（可选，默认自动识别无入边节点）
  - `endNodeIds: string[]` - 结束节点 ID（可选）
  - `viewport?: { x, y, zoom }` - 视图状态（保存用户缩放和位置）
  - `abortSignal?: AbortSignal` - 取消信号（支持中断长时间运行）
  - `isGroupNode?: boolean` - 是否为分组节点

### 2. 装饰器系统 (`src/decorator.ts`)

**@Node(options: NodeOptions)** (L59-L64)
- 类装饰器，标记节点类型
- 自动注册到全局 DI 容器（root.set）
- 选项：
  - `title?: string` - 节点标题
  - `type?: NodeType` - 节点类型（llm/basic/crawler/control/sentiment/analysis/scheduler）
  - `dynamicInputs?: boolean` - 支持动态添加输入端口
  - `dynamicOutputs?: boolean` - 支持动态添加输出端口
  - `errorStrategy?: ErrorStrategy` - 错误处理策略（retry/skip/fail/abort）
  - `maxRetries?: number` - 最大重试次数
  - `retryDelay?: number` - 重试延迟（毫秒）
  - `retryBackoff?: number` - 退避因子（指数退避）

**@Input(options?: InputOptions)** (L229-L254)
- 属性装饰器，标记输入端口
- 选项：
  - `mode?: number` - 聚合模式（位标志）
    - `IS_MULTI` (0x000001) - 聚合多条边 → `[edge1, edge2]`
    - `IS_BUFFER` (0x000010) - 聚合单边多次发射 → `[emit1, emit2, emitN]`
  - `required?: boolean` - 是否必填
  - `defaultValue?: any` - 默认值
  - `title?: string` - 端口标题
  - `type?: InputFieldType` - 字段类型（string/number/boolean/text/textarea/richtext/date/select/image/video/audio/object/any）

**@Output(options?: OutputOptions)** (L290-L295)
- 属性装饰器，标记输出端口
- 选项：
  - `title?: string` - 端口标题
  - `type?: string` - 数据类型
  - `isRouter?: boolean` - 路由输出（Scheduler 会过滤 undefined 值）
  - `dynamic?: boolean` - 支持 UI 动态添加
  - `condition?: string` - 条件表达式（如 '$input === 1'）

**@State(options?: StateOptions)** (L310-L315)
- 属性装饰器，标记内部状态（不可连线，仅用于配置）
- 选项：
  - `title?: string` - 状态标题
  - `type?: string` - 数据类型

**@Handler(ast: Type<any>)** (L77-L92)
- 方法装饰器，注册节点执行器
- 自动注册到全局 DI 容器
- Handler 签名：`handler(ast: INode, input$: Observable<any>, ctx?: WorkflowGraphAst): Observable<NodeEvent>`

**@Render(ast: Type<any>)** (L95-L110)
- 方法装饰器，注册前端渲染器（用于 @sker/workflow-ui）

### 3. 节点执行器 (`src/executor.ts`)

**NodeExecutor** (L20-L55)
- 统一的节点执行入口
- 方法：
  - `run(node: INode, input$: Observable<Input>, parent?: WorkflowGraphAst): Observable<NodeEvent>` (L34-L41)
    - 确保节点已编译（调用 Compiler）
    - 克隆节点（防止多次执行互相污染）
    - 委托给 VisitorExecutor 执行

**便捷函数**：
- `executeAst(node, input?, parent?)` (L60-L64) - 执行单个节点
- `executeWorkflow(workflow, input?)` (L69-L73) - 执行工作流
- `executeWorkflowImmediate(workflow, input?)` (L78-L93) - 执行工作流并返回 Promise
- `executeNodeIsolated(node, input?)` (L107-L111) - 独立执行节点（不依赖工作流上下文）

### 4. 访问者执行器 (`src/execution/visitor-executor.ts`)

**VisitorExecutor** (L20-L138)
- 工作流引擎的核心执行者
- 通过装饰器系统查找并调用 Handler
- 方法：
  - `visit(ast: INode, input$: Observable<any>, parent?: WorkflowGraphAst): Observable<NodeEvent>` (L21-L67)
    - 查找节点对应的 Handler（通过 HANDLER_METHOD token）
    - 检测 Handler 参数数量，区分新旧模式：
      - 新模式（参数 ≤ 2）：`handler(ast, ctx)` - 将 input$ 数据应用到 ast
      - 旧模式（参数 > 2）：`handler(ast, input$, ctx)` - 直接传递 input$
    - 未找到 Handler 时回退到 DefaultVisitor
  - `normalizeResult(result, ast)` (L78-L104) - 将 Handler 返回值统一为 Observable
    - 支持 Observable、Promise、同步值
    - 支持嵌套类型（Promise<Observable<INode>>）

### 5. 工作流执行器 (`src/WorkflowGraphAstVisitor.ts`)

**WorkflowGraphAstVisitor** (L27-L550)
- WorkflowGraphAst 的专用执行器
- 通过 `@Handler(WorkflowGraphAst)` 注册（L32）
- 核心方法：
  - `handler(ast, input$, _parent)` (L33-L79) - 工作流执行入口
    - 为每个子节点创建 ReplaySubject 输入流
    - 调用 NodeExecutor.run 执行子节点（递归）
    - 连接边（connectEdges）
    - 触发入口节点（triggerEntryNodes）
    - 合并所有节点事件流
  - `connectEdges(workflow, inputSubjects, nodeEventStreams)` (L81-L253) - 连接节点间的数据流
    - 支持单边和多边场景
    - 支持 IS_BUFFER 模式（收集所有发射值）
    - 支持边的聚合模式（MERGE/ZIP/COMBINE_LATEST/WITH_LATEST_FROM）
  - `mergeEdgeSources(mode, sources, edges)` (L255-L333) - 根据 EdgeMode 合并多条边
  - `computeCartesianProduct(workflow, input$)` (L344-L380) - 计算笛卡尔积（外部输入 × 静态入口节点）
  - `triggerEntryNodes(workflow, input$, inputSubjects)` (L382-L434) - 触发入口节点
    - 支持 `nodeId.property` 格式输入
  - `findEntryNodes(workflow)` (L436-L449) - 查找入口节点（入度为 0）
  - `mergeNodeEventStreams(workflow, nodeEventStreams, inputSubjects)` (L451-L549) - 合并所有节点事件
    - 追踪节点完成状态
    - 决定工作流最终状态（任一节点 fail → 工作流 fail）

### 6. 编译器 (`src/compiler/index.ts`)

**Compiler** (L14-L136)
- 将 AST 实例编译为 INode（提取装饰器元数据）
- 方法：
  - `compile(ast: Ast | INode): INode` (L19-L60)
    - 查找节点类型（通过 type 属性）
    - 实例化节点类
    - 提取 @Node、@Input、@Output、@State 元数据
    - 保留动态添加的端口（isStatic: false）
    - 组装 metadata 对象

### 7. JSON 序列化 (`src/generate.ts`)

**fromJson(json)** (L20-L48)
- 反序列化 JSON 为 AST
- 自动编译所有节点（确保包含 metadata）
- 支持嵌套的 WorkflowGraphAst（递归处理）
- WorkflowGraphAst 转换为真正的类实例（确保 getter 正常工作）

**toJson(ast)** (L54-L56)
- 序列化 AST 为 JSON
- 利用 Ast.toJSON() 排除 BehaviorSubject

### 8. AST 工具函数 (`src/ast-utils.ts`)

**错误处理** (L18-L34)
- `setAstError(node, error, includeStack?)` - 设置节点错误
- `getAstDeepError(node)` - 提取最深层错误
- `getAstErrorDescription(node)` - 获取完整错误描述

**节点管理** (L56-L185)
- `hasNode(nodes, id)` (L55-L63) - 检查节点是否存在（递归查找分组）
- `getNodeById(nodes, id)` (L72-L83) - 根据 ID 获取节点
- `getNodesByType(nodes, type)` (L88-L90) - 根据类型获取节点
- `addNode(nodes, node)` (L100-L105) - 添加节点（验证 ID 唯一性）
- `updateNode(nodes, id, updates)` (L129-L135) - 更新节点
- `removeNode(nodes, id)` (L161-L170) - 删除节点

**边管理** (L199-L346)
- `hasEdge(edges, fromOrId, to?, fromProperty?, toProperty?)` (L199-L213) - 检查边是否存在
- `getEdgeById(edges, id)` (L218-L220) - 根据 ID 获取边
- `getEdgesByNode(edges, nodeId, direction?)` (L225-L231) - 获取节点相关边
- `addEdge(nodes, edges, edge)` (L240-L255) - 添加边（验证端点存在）
- `updateEdge(nodes, edges, id, updates)` (L286-L300) - 更新边
- `removeEdge(edges, id)` (L316-L325) - 删除边

**图操作** (L355-L475)
- `validateGraph(nodes, edges)` (L355-L382) - 验证图的连通性
- `clearGraph(nodes, edges, options?)` (L387-L400) - 清空图
- `cleanOrphanedProperties(workflow, deletedNodeIds?)` (L417-L475) - 清理孤立的动态属性
- `getExposedInputs(nodes, edges)` (L485-L531) - 动态计算工作流输入端口
- `getExposedOutputs(nodes, edges)` (L541-L585) - 动态计算工作流输出端口

**开始/结束节点** (L600-L714)
- `getEntryNodeInputs(nodes, edges, entryNodeIds?)` (L600-L659) - 获取开始节点的输入字段定义
- `extractEndNodeOutputs(nodes, endNodeIds)` (L670-L714) - 提取结束节点的输出值

**节点重置** (L732-L803)
- `resetNodeToDefaults(node)` (L732-L760) - 重置节点输入/输出为默认值

### 9. 节点事件 (`src/execution/events.ts`)

**NodeEvent** (L5-L9)
- `NodeRuningEvent` - 节点运行中
- `NodeEmitEvent` - 节点发射输出值
- `NodeSuccessEvent` - 节点执行成功
- `NodeFailEvent` - 节点执行失败

### 10. 类型系统 (`src/types.ts`)

**IAstStates** (L11)
- `pending | running | success | fail`

**EdgeMode** (L121-L133)
- `MERGE` - 任一上游发射立即触发下游（默认，适合并发场景）
- `ZIP` - 配对执行（上游数组按索引配对触发）
- `COMBINE_LATEST` - 任一上游变化触发，使用所有上游的最新值
- `WITH_LATEST_FROM` - 主流触发，携带其他流的最新值

**IEdge** (L136-L155)
- 核心属性：
  - `from: string` - 起始节点 ID
  - `to: string` - 目标节点 ID
  - `fromProperty?: string` - 输出端口（支持嵌套路径，如 'currentItem.username'）
  - `toProperty?: string` - 输入端口
  - `mode?: EdgeMode` - 流式合并模式
  - `condition?: { property, value }` - 条件执行

## 使用示例

### 示例 1：定义简单节点

```typescript
import { Node, Input, Output, State } from '@sker/workflow';

@Node({
  title: '文本处理',
  type: 'basic',
  errorStrategy: 'retry',
  maxRetries: 3
})
export class TextProcessorAst extends Ast {
  @Input({
    title: '输入文本',
    type: 'text',
    required: true
  })
  text: string = '';

  @State({ title: '大写模式' })
  uppercase: boolean = false;

  @Output({
    title: '处理结果',
    type: 'string'
  })
  result: string = '';
}
```

### 示例 2：编写 Handler

```typescript
import { Handler, Injectable } from '@sker/workflow';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TextProcessorVisitor {
  @Handler(TextProcessorAst)
  handler(ast: TextProcessorAst, ctx?: WorkflowGraphAst): Observable<NodeEvent> {
    // 处理逻辑
    const result = ast.uppercase
      ? ast.text.toUpperCase()
      : ast.text.toLowerCase();

    ast.result = result;

    // 返回事件流
    return of(
      { type: 'node_runing', id: ast.id, data: ast },
      { type: 'node_emit', id: ast.id, property: 'result', value: result },
      { type: 'node_success', id: ast.id, data: ast }
    );
  }
}
```

### 示例 3：构建工作流

```typescript
import { createWorkflowGraphAst, executeWorkflow } from '@sker/workflow';

// 创建工作流
const workflow = createWorkflowGraphAst({
  name: '文本处理流程',
  nodes: [
    { id: 'input', type: 'TextAreaAst', text: 'hello world' },
    { id: 'processor', type: 'TextProcessorAst', uppercase: true },
    { id: 'output', type: 'StoreAst' }
  ],
  edges: [
    {
      id: 'e1',
      from: 'input',
      to: 'processor',
      fromProperty: 'value',
      toProperty: 'text'
    },
    {
      id: 'e2',
      from: 'processor',
      to: 'output',
      fromProperty: 'result',
      toProperty: 'data'
    }
  ],
  entryNodeIds: ['input']
});

// 执行工作流
executeWorkflow(workflow).subscribe({
  next: (event) => {
    console.log('事件:', event);
  },
  complete: () => {
    console.log('工作流完成');
  },
  error: (error) => {
    console.error('工作流失败:', error);
  }
});
```

### 示例 4：多输入聚合（IS_MULTI 模式）

```typescript
@Node({ title: '数据合并器' })
export class MergeAst extends Ast {
  @Input({
    title: '输入数据',
    mode: IS_MULTI  // 聚合多条边
  })
  items: any[] = [];

  @Output({ title: '合并结果' })
  result: any = null;
}

@Injectable()
export class MergeVisitor {
  @Handler(MergeAst)
  handler(ast: MergeAst): Observable<NodeEvent> {
    // ast.items 自动聚合多条边的数据为数组
    ast.result = ast.items.reduce((acc, item) => ({ ...acc, ...item }), {});

    return of(
      { type: 'node_runing', id: ast.id, data: ast },
      { type: 'node_emit', id: ast.id, property: 'result', value: ast.result },
      { type: 'node_success', id: ast.id, data: ast }
    );
  }
}
```

### 示例 5：缓冲模式（IS_BUFFER）

```typescript
@Node({ title: '批处理器' })
export class BatchProcessorAst extends Ast {
  @Input({
    title: '数据流',
    mode: IS_BUFFER  // 聚合单边多次发射
  })
  items: any[] = [];

  @Output({ title: '批处理结果' })
  result: any[] = [];
}

@Injectable()
export class BatchProcessorVisitor {
  @Handler(BatchProcessorAst)
  handler(ast: BatchProcessorAst): Observable<NodeEvent> {
    // ast.items 收集了上游节点的所有发射值
    console.log(`收集到 ${ast.items.length} 个值`);
    ast.result = ast.items.map(item => process(item));

    return of(
      { type: 'node_runing', id: ast.id, data: ast },
      { type: 'node_emit', id: ast.id, property: 'result', value: ast.result },
      { type: 'node_success', id: ast.id, data: ast }
    );
  }
}
```

### 示例 6：条件边

```typescript
// 创建条件边
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

### 示例 7：JSON 序列化/反序列化

```typescript
import { fromJson, toJson } from '@sker/workflow';

// 序列化
const json = toJson(workflow);
localStorage.setItem('workflow', JSON.stringify(json));

// 反序列化
const savedJson = JSON.parse(localStorage.getItem('workflow')!);
const restoredWorkflow = fromJson<WorkflowGraphAst>(savedJson);
```

## 设计模式

### 1. 访问者模式（Visitor Pattern）
- Ast 类是元素（Element）
- VisitorExecutor 是访问者（Visitor）
- 通过 @Handler 装饰器动态注册访问者
- 支持递归访问（WorkflowGraphAst 访问子节点）

### 2. 装饰器模式（Decorator Pattern）
- @Node、@Input、@Output、@State 收集元数据
- Compiler 在运行时提取并固化元数据到 metadata 属性
- 元数据驱动 UI 渲染和数据流连接

### 3. 依赖注入（Dependency Injection）
- 所有 Handler、Visitor 通过 @Injectable() 注册到全局 DI 容器
- 通过构造函数注入依赖（@Inject）
- 解决循环依赖（NodeExecutor ↔ WorkflowGraphAstVisitor）

### 4. 观察者模式（Observable Pattern）
- 基于 RxJS Observable
- 节点输入/输出建模为数据流
- 支持多次发射（流式处理）
- 事件驱动（NodeEvent 流）

### 5. 责任链模式（Chain of Responsibility）
- VisitorExecutor → DefaultVisitor
- 未找到 Handler 时回退到默认执行器

### 6. 组合模式（Composite Pattern）
- WorkflowGraphAst 既是节点，也是子节点容器
- 支持嵌套工作流（树形结构）

## 最佳实践

### 1. 节点定义
- ✅ 使用 @Input 和 @Output 明确端口
- ✅ 使用 @State 区分配置属性
- ✅ 提供 defaultValue 避免 undefined
- ✅ 使用有意义的 title（用于 UI 显示）
- ✅ 使用 errorStrategy 指定错误处理策略
- ❌ 不要在节点类中编写业务逻辑（应放在 Handler）

### 2. Handler 实现
- ✅ 使用新模式签名：`handler(ast, ctx)`
- ✅ 返回完整的 NodeEvent 流（runing → emit → success）
- ✅ 使用 RxJS 操作符处理异步逻辑
- ✅ 捕获错误并转换为 NodeFailEvent
- ❌ 不要直接抛出异常（会导致工作流中断）

### 3. 工作流构建
- ✅ 使用 createWorkflowGraphAst 工厂函数
- ✅ 显式指定 entryNodeIds 避免歧义
- ✅ 使用 validateGraph 验证图的连通性
- ✅ 使用 cleanOrphanedProperties 清理孤立属性
- ❌ 不要手动创建 WorkflowGraphAst 实例

### 4. 数据流设计
- ✅ 使用 EdgeMode.COMBINE_LATEST 聚合多输入
- ✅ 使用 IS_MULTI 聚合多条边
- ✅ 使用 IS_BUFFER 收集所有发射值
- ✅ 使用条件边实现分支逻辑
- ❌ 避免创建循环依赖图（会导致死锁）

### 5. 错误处理
- ✅ 在 @Node 中指定 errorStrategy
- ✅ 使用 NoRetryError 标记不可重试错误
- ✅ 使用 setAstError 统一设置错误信息
- ❌ 不要在 Handler 中使用 try-catch 吞掉错误

### 6. 性能优化
- ✅ 使用 shareReplay 共享订阅（避免重复执行）
- ✅ 使用 defer 延迟执行
- ✅ 克隆节点避免状态污染
- ❌ 不要在 Handler 中执行同步阻塞操作

## 常见问题

### Q1: 如何添加新节点类型？
1. 在 packages/workflow-ast/src/ 定义 AST 类（继承 Ast）
2. 使用 @Node, @Input, @Output 装饰器标记
3. 在 packages/workflow-run/src/ 实现 Visitor（用 @Handler 装饰）
4. 在 packages/workflow-ui/src/ 实现 Renderer（用 @Render 装饰）

### Q2: 节点如何多次发射值？
在 Handler 中返回多个 NodeEmitEvent：
```typescript
return concat(
  of({ type: 'node_emit', property: 'output', value: 1 }),
  of({ type: 'node_emit', property: 'output', value: 2 }),
  of({ type: 'node_emit', property: 'output', value: 3 })
);
```

### Q3: 如何实现条件分支？
使用条件边或路由输出：
```typescript
@Output({ isRouter: true, condition: '$input > 10' })
largeOutput: any;

@Output({ isRouter: true, condition: '$input <= 10' })
smallOutput: any;
```

### Q4: 如何取消工作流执行？
使用 AbortController：
```typescript
const controller = new AbortController();
workflow.abortSignal = controller.signal;

// 取消执行
controller.abort();
```

### Q5: 如何处理循环依赖？
@sker/core 的 DI 容器自动检测并解决循环依赖（通过延迟解析）。如果遇到循环依赖错误，检查：
- 是否在构造函数中使用了 @Inject
- 是否在静态属性中引用了其他服务

## 架构优势

1. **声明式节点定义**：装饰器系统自动收集元数据，无需手工维护映射
2. **类型安全**：TypeScript 类型系统保证编译时正确性
3. **流式处理**：基于 RxJS，天然支持异步、背压、错误处理
4. **可扩展性**：通过 @Handler 装饰器动态注册执行器，无需修改核心代码
5. **递归执行**：WorkflowGraphAst 本身也是节点，支持嵌套工作流
6. **元数据驱动**：UI 可以根据 metadata 自动生成表单和连线

## 相关包

- **@sker/workflow-ast** - AST 节点定义（微博 API、数据处理等）
- **@sker/workflow-run** - 业务执行器（Visitor 实现）
- **@sker/workflow-ui** - 可视化编辑器（基于 ReactFlow）
- **@sker/core** - DI 容器、错误序列化、日志系统
