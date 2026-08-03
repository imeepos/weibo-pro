# @sker/workflow

工作流引擎核心包：基于 AST（抽象语法树）+ 访问者模式 + RxJS 响应式流的最小优雅工作流编排引擎。

## 核心职责

- **AST 模型**：`Ast` 基类与 `WorkflowGraphAst` 容器；节点即类、节点平等（图本身也是节点，可递归执行）
- **装饰器系统**：`@Node` / `@Input` / `@Output` / `@State` / `@Handler` / `@Render` 声明节点身份、数据流端口与执行绑定
- **执行调度**：`NodeExecutor` / `executeAst` / `executeWorkflow`，基于依赖分析与边模式（数据/条件/循环）调度节点，支持并行执行
- **事件模型**：`node_runing` / `node_emit` / `node_success` / `node_fail` 等 RxJS 事件流，节点可多次发射值，支持流式数据处理
- **序列化**：`toJson` / `fromJson` 自动提取装饰器元数据，支持工作流状态持久化与恢复
- **内置基础节点**：文本/日期/布尔/图像/音视频输入、Mq、Store、Collector、Loop、Filter、Merge、Switch、PassThrough 等
- **编译能力**：`Compiler` 将 AST 实例编译为 `INode`（固化装饰器元数据，供 UI/运行时使用）
- **运行时设施**：`EdgeModeStrategy` 边模式策略、`event-store` 事件存储、`runtime` 运行时、`crawler-scheduler` 爬虫调度器

## 目录结构

```
packages/workflow/src/
├── index.ts                      # 公共 API 入口（统一导出所有核心能力）
├── ast.ts                        # AST 核心：Ast 基类、WorkflowGraphAst、createWorkflowGraphAst
├── decorator.ts                  # 装饰器系统：@Node/@Input/@Output/@State/@Handler/@Render/@Setting/@Preview
├── types.ts                      # 类型定义：INode、IEdge、EdgeMode、节点状态、编译后元数据
├── executor.ts                   # 执行器入口：NodeExecutor、executeAst/executeWorkflow 等便捷函数
├── generate.ts                   # 序列化/反序列化：fromJson、toJson
├── ast-utils.ts                  # AST 工具：节点/边管理、图操作、错误设置
├── utils.ts                      # 通用工具：ID 生成、clone、isObservable 等
├── errors.ts                     # NoRetryError 等错误定义
├── defaultVisitor.ts             # 默认访问者（DEFAULT_VISITOR）：无 @Handler 时的回退执行器
├── WorkflowGraphAstVisitor.ts    # 图节点访问者：递归执行子图节点
├── dynamic-node-registry.ts      # 动态节点注册表（运行时注册新节点类型）
├── edge-transform.ts             # 边（Edge）转换工具
├── execution/                    # 执行层
│   ├── visitor-executor.ts       # 访问者执行器：查找并调用 @Handler
│   ├── events.ts                 # 节点事件类型：node_runing/node_emit/node_success/node_fail
│   ├── error-handler.ts          # 错误处理策略：retry、skip、fail、abort
│   ├── EdgeCombiner.ts           # 边合并器
│   ├── EdgeStreamBuilder.ts      # 边流构建器
│   ├── EdgeModeStrategy.ts       # 边模式策略（EDGE_MODE_STRATEGY providers）
│   ├── ExecutionContext.ts       # 节点执行上下文
│   ├── NodeInputBuilder.ts       # 节点输入构建
│   ├── StreamMerger.ts           # 流合并
│   ├── WorkflowEventMerger.ts    # 工作流事件合并
├── compiler/index.ts             # 编译器：AST 实例 → INode（提取装饰器元数据）
├── event-store/                  # 事件存储：memory、event-stream、types
├── runtime/                      # 工作流运行时（workflow-runtime）
├── schedulers/crawler-scheduler.ts # 爬虫调度器（crawlerScheduler / ConcurrencyScheduler）
├── operators/                    # RxJS 自定义操作符：concat_latest_from、map-response、tap-response
└── 内置基础节点                  # TextAreaAst / MarkdownAst / DateAst / MqAst / StoreAst
                                  # CollectorAst / LoopAst / FilterAst / MergeAst / SwitchAst
                                  # ImageAst / AudioAst / VideoAst / BooleanAst / NotAst / PassThroughAst
```

## 边界

- **✅ 负责**：引擎核心（AST 模型、装饰器、执行调度、事件流、序列化）、内置通用基础节点、边模式策略、事件存储与运行时基础设施
- **❌ 不负责**：具体业务节点定义（属于 `@sker/workflow-ast`）、后端真实执行逻辑（属于 `@sker/workflow-run`）、浏览器端执行（属于 `@sker/workflow-browser`）、前端可视化渲染（属于 `@sker/workflow-ui`）、DSL 源码编译（属于 `@sker/workflow-compiler`）
- **对外依赖**：`@sker/core`（DI 容器与装饰器元数据存储）、rxjs、xstate、zod、dayjs、json-schema
- **被谁依赖**：`@sker/workflow-ast`、`@sker/workflow-run`、`@sker/workflow-browser`、`@sker/workflow-compiler`、`@sker/workflow-ui`、`@sker/ui`、`@sker/sdk`、`@sker/crawler-core`、`@sker/agent`；apps：`api`、`crawler`、`bigscreen`、`storybook`

---

## 核心设计理念

### 存在即合理（Existence Implies Necessity）
- 不过度设计，不添加无用的抽象
- 每个类、方法、属性都有唯一、不可替代的职责
- 代码即文档——通过名称和结构自我表达

### 优雅的复杂性
- **图论调度**：依赖关系分析、拓扑排序、并行执行
- **灵活的数据流**：支持单向数据传递、嵌套属性映射、多源汇聚
- **条件分支**：基于节点状态的条件控制流

## 快速开始

### 安装

```bash
npm install @sker/workflow
```

### 定义工作流节点

使用装饰器定义工作流节点的输入输出：

```typescript
import { Ast, Node, Input, Output } from '@sker/workflow';

@Node({ title: '数据验证' })
export class ValidateDataAst extends Ast {
  @Input({ title: '原始数据' })
  data: unknown;

  @Output({ title: '验证结果' })
  isValid: boolean;

  @Output({ title: '规范化数据' })
  normalized: unknown;

  type: 'ValidateDataAst' = 'ValidateDataAst';
}
```

### 实现节点处理器

通过 `@Handler` 装饰器绑定处理逻辑：

```typescript
import { Handler } from '@sker/workflow';

@Handler(ValidateDataAst)
export class ValidateDataVisitor {
  async visit(ast: ValidateDataAst, ctx: any): Promise<ValidateDataAst> {
    try {
      // 执行验证逻辑
      const normalized = JSON.parse(JSON.stringify(ast.data));
      ast.isValid = true;
      ast.normalized = normalized;
      ast.state = 'success';
    } catch (error) {
      ast.isValid = false;
      ast.state = 'fail';
      ast.error = error as Error;
    }
    return ast;
  }
}
```

### 构建工作流图

```typescript
import { createWorkflowGraphAst, IDataEdge, execute } from '@sker/workflow';

const validateNode = new ValidateDataAst();
validateNode.id = 'validate_1';
validateNode.data = { name: 'John', age: 30 };

const transformNode = new TransformDataAst();
transformNode.id = 'transform_1';

// 定义数据流边：validate 的 normalized 输出流向 transform 的 input
const dataEdge: IDataEdge = {
  from: 'validate_1',
  fromProperty: 'normalized',
  to: 'transform_1',
  toProperty: 'input'
};

const workflow = createWorkflowGraphAst({
  name: '数据处理工作流',
  nodes: [validateNode, transformNode],
  edges: [dataEdge]
});

// 执行工作流（循环执行直到完成）
const result = await execute(workflow, {});
console.log(result.state); // 'success'
```

## 架构设计

### 核心概念

#### 抽象语法树（AST）
```
Ast（基类）
├── WorkflowGraphAst     工作流图的容器节点
└── CustomAst（用户定义）自定义业务节点
```

每个节点都是一个独立的计算单元，具有：
- **state**：`pending` → `running` → `success | fail`
- **inputs**：由装饰器 `@Input` 标记的属性
- **outputs**：由装饰器 `@Output` 标记的属性

#### 边（Edge）
连接节点的两种类型：

**数据边（DataEdge）** - 纯数据传递
```typescript
{
  from: 'nodeA',
  fromProperty: 'result',      // 源节点的输出属性
  to: 'nodeB',
  toProperty: 'input',         // 目标节点的输入属性
  weight?: 1                   // 多源汇聚时的优先级（值小优先）
}
```

**控制边（ControlEdge）** - 执行依赖与条件分支
```typescript
{
  from: 'nodeA',
  to: 'nodeB',
  condition?: {
    property: 'status',        // 源节点的条件属性
    value: 'approved'          // 满足条件时才执行 nodeB
  }
}
```

#### 访问者（Visitor）
实现节点的业务逻辑。访问者模式解耦了节点定义与执行：

```typescript
interface Visitor {
  visit(ast: Ast, ctx: any): Promise<any>;
}
```

### 执行流程

```
输入工作流图
  ↓
[WorkflowScheduler] 持续调度
  ↓
+─────────────────────────────────────┐
│ 每次迭代                            │
├─────────────────────────────────────┤
│ 1. [DependencyAnalyzer]             │
│    找出当前可执行的节点             │
│    ├─ 所有无条件输入就绪           │
│    ├─ 条件分支满足要求             │
│    └─ 多源汇聚等待所有源完成       │
│                                     │
│ 2. [DataFlowManager]                │
│    ├─ 为节点分配输入数据           │
│    ├─ 嵌套属性解析 (foo.bar.baz)   │
│    ├─ 多输入聚合 (@Input isMulti) │
│    └─ 上下文初始化                 │
│                                     │
│ 3. [VisitorExecutor]                │
│    并行执行所有可执行节点           │
│    每个节点调用对应的访问者         │
│                                     │
│ 4. [StateMerger]                    │
│    合并执行结果到主图状态           │
└─────────────────────────────────────┘
  ↓
状态：success（所有可达节点完成）
     fail（存在失败节点）
     running（仍有待执行节点）
```

## 高级用法

### 多输入节点的数据汇聚

```typescript
@Node({ title: '数据融合' })
export class MergeAst extends Ast {
  @Input({ title: '数据列表', mode: IS_MULTI })
  items: any[] = [];  // 会自动汇聚成数组

  @Output({ title: '融合结果' })
  merged: any;

  type: 'MergeAst' = 'MergeAst';
}
```

### 条件分支与动态流程

```typescript
const conditionalEdge: IControlEdge = {
  from: 'checkNode',
  to: 'approveNode',
  condition: {
    property: 'approved',
    value: true
  }
};
```

### 嵌套属性映射

```typescript
const edge: IDataEdge = {
  from: 'userFetcher',
  fromProperty: 'user.profile.contacts.email',  // 深度访问
  to: 'emailSender',
  toProperty: 'recipient'
};
```

### 持久化与恢复

```typescript
import { toJson, fromJson } from '@sker/workflow';

// 保存状态
const workflowState = toJson(workflowAst);
await db.save('workflow_state', workflowState);

// 恢复执行
const savedState = await db.load('workflow_state');
const resumedAst = fromJson(savedState);
const finalResult = await execute(resumedAst, context);
```

## API 参考

### 核心函数

- `execute(state, context, visitor?)`：完整执行工作流直到 `success` 或 `fail`
- `executeAst(state, context, visitor?)`：执行一次迭代，返回迭代后的状态（可能仍在 `running`）

### 工作流构建

- `createWorkflowGraphAst({ name, nodes, edges, id?, state? })`：创建工作流容器节点
- `fromJson(json)` / `toJson(ast)`：序列化与反序列化

### 装饰器

- `@Node(options?)`：在节点类上使用，注册为工作流节点类型
- `@Input(options?)`：标记输入属性（`title`、`type`、`mode: IS_MULTI/IS_BUFFER` 等）
- `@Output(options?)`：标记输出属性（支持 `isRouter` 路由、`condition` 条件输出）
- `@State(options?)`：标记内部状态（不参与数据流传递）
- `@Handler(AstType)`：在访问者类或方法上绑定节点的执行实现
- `@Render(AstType)`：绑定节点的前端渲染器（供 `@sker/workflow-ui` 使用）

## 设计模式

### 访问者模式（Visitor Pattern）
将节点定义（AST）与执行逻辑（Visitor）分离：
- **灵活**：可轻松添加新的处理方式而无需改动节点定义
- **可测试**：节点和访问者可独立测试

### 图的拓扑执行
- **批量处理**：每次迭代找出所有就绪节点并并行执行
- **渐进完成**：逐步解锁后续节点，支持长流程运行

### 数据流与控制流分离
- **数据边**：对象属性间的值传递
- **控制边**：执行顺序与条件分支

## 与其他包的集成

### @sker/core
- 依赖注入容器（DI）：存储装饰器元数据
- 类型系统：`Type<T>`, `InjectionToken`

### @sker/workflow-ast
包含具体的业务节点定义（微博爬虫、LLM、舆情分析等）

### @sker/workflow-run
实现访问者处理器，连接到实际 API 和数据库（后端运行时）

### @sker/workflow-browser
浏览器端执行层，通过远程代理模式委托后端执行

### @sker/workflow-ui
可视化编辑与节点渲染，通过 `@Render` 装饰器映射

### @sker/entities
定义数据模型（WeiboPost、Event 等）

## 最佳实践

1. **原子设计**：每个节点应该做单一的、清晰的事情
2. **显式的输入输出**：总是用装饰器标记，不要依赖魔法
3. **错误处理**：访问者中捕获异常，设置 `state = 'fail'`
4. **日志记录**：记录关键的业务事件（节点开始、完成、失败）
5. **幂等性**：设计节点为可重试的，支持故障恢复

## 许可证

Private - Sker Platform
