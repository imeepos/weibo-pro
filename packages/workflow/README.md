# @sker/workflow

> 最小、优雅的工作流引擎与编排系统

一个极简的工作流执行框架，通过访问者模式（Visitor Pattern）和图形计算实现灵活的任务编排。每行代码都有其存在的必要性。

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

## 模块结构

### `/src/decorator.ts` - 元数据系统
- `@Node(options)`：声明节点类型
- `@Input(options)`：标记输入属性，支持 `isMulti` 多值聚合
- `@Output(options)`：标记输出属性
- `@Handler(AstType)`：绑定访问者处理器

通过 `@sker/core` 的依赖注入容器存储和检索元数据。

### `/src/types.ts` - 类型定义
- `INode`：节点接口（type、id、state）
- `IDataEdge`：数据流边，支持嵌套属性路径
- `IControlEdge`：控制流边，支持条件判断
- `IAstStates`：节点状态类型

### `/src/ast.ts` - AST基础设施
- `Ast`：所有节点的基类
- `WorkflowGraphAst`：工作流容器
- `ArrayIteratorAst`：数组迭代助手

### `/src/generate.ts` - 序列化/反序列化
- `toJson(ast)`：节点→JSON序列化
- `fromJson(json)`：JSON→节点反序列化

自动提取 `@Input`、`@Output` 标记的属性，支持状态持久化。

### `/src/execution/scheduler.ts` - 调度引擎
`WorkflowScheduler` 是核心编排器：
- 初始化输入节点
- 迭代调用 `DependencyAnalyzer` 找可执行节点
- 并行执行节点
- 合并状态直到完成

### `/src/execution/dependency-analyzer.ts` - 依赖分析
`DependencyAnalyzer` 计算节点执行就绪条件：
- **可达性分析**：从起点出发找所有可能执行的节点
- **就绪条件检查**：
  - 所有无条件输入的源节点必须 `success`
  - 条件边的源节点满足条件时才解锁
  - 多源汇聚：等待最后一个源完成
- **完成判断**：所有可达节点都已完成（success | fail）

### `/src/execution/data-flow-manager.ts` - 数据流管理
`DataFlowManager` 处理节点间的数据传递：
- **属性映射**：支持嵌套属性路径 `user.profile.name`
- **多值聚合**：`@Input({ isMulti: true })` 属性汇聚多个源的数据
- **权重排序**：多源数据按 `weight` 排序合并
- **上下文初始化**：从外部 context 注入初始数据
- **输出提取**：提取节点的 `@Output` 属性供下游使用

### `/src/execution/visitor-executor.ts` - 访问者执行
`VisitorExecutor` 路由节点到对应的处理器：
- 查询注册的 `@Handler` 装饰器
- 调用访问者的 `visit()` 方法
- 统一错误处理（支持 `NoRetryError` 快速失败）

### `/src/execution/state-merger.ts` - 状态合并
`StateMerger` 将批次执行结果合并回工作流状态，保证节点状态一致性。

## 高级用法

### 多输入节点的数据汇聚

支持一个输入属性接收多个源的数据：

```typescript
@Node({ title: '数据融合' })
export class MergeAst extends Ast {
  @Input({ title: '数据列表', isMulti: true })
  items: any[] = [];  // 会自动汇聚成数组

  @Output({ title: '融合结果' })
  merged: any;

  type: 'MergeAst' = 'MergeAst';
}

// 三个源节点的输出都汇聚到 items
const edges = [
  { from: 'source1', to: 'merge', toProperty: 'items' },
  { from: 'source2', to: 'merge', toProperty: 'items' },
  { from: 'source3', to: 'merge', toProperty: 'items', weight: 0 }  // 优先处理
];
```

### 条件分支与动态流程

基于节点的某个属性值决定后续流程：

```typescript
// 节点A根据检查结果设置 approved 状态
// 节点B只在 approved === true 时执行
const conditionalEdge: IControlEdge = {
  from: 'checkNode',
  to: 'approveNode',
  condition: {
    property: 'approved',
    value: true
  }
};

// 如果检查失败，approveNode 永远不会被调度
```

### 嵌套属性映射

数据传递时自动解析嵌套属性：

```typescript
const edge: IDataEdge = {
  from: 'userFetcher',
  fromProperty: 'user.profile.contacts.email',  // 深度访问
  to: 'emailSender',
  toProperty: 'recipient'
};

// userFetcher 输出：
// { user: { profile: { contacts: { email: 'user@example.com' } } } }
//
// emailSender 输入：
// { recipient: 'user@example.com' }
```

### 持久化与恢复

将工作流状态保存到数据库或文件：

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

## 实际应用示例

### 微博爬虫工作流

来自项目中的真实应用（`@sker/workflow-ast`）：

```typescript
// 1. 定义节点
@Node({ title: '微博关键词搜索' })
export class WeiboKeywordSearchAst extends Ast {
  @Input() keyword: string;
  @Input() startDate: Date;
  @Input() endDate: Date;
  @Input() page: number = 1;

  @Output() posts: WeiboPost[];
  @Output() hasMore: boolean;

  type: 'WeiboKeywordSearchAst' = 'WeiboKeywordSearchAst';
}

// 2. 实现处理器
@Injectable()
@Handler(WeiboKeywordSearchAst)
export class WeiboKeywordSearchVisitor {
  constructor(private weiboClient: WeiboClient) {}

  async visit(ast: WeiboKeywordSearchAst, ctx: any) {
    ast.state = 'running';
    try {
      const result = await this.weiboClient.search({
        keyword: ast.keyword,
        startDate: ast.startDate,
        endDate: ast.endDate,
        page: ast.page
      });
      ast.posts = result.posts;
      ast.hasMore = result.hasMore;
      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      ast.error = error;
    }
    return ast;
  }
}

// 3. 在 NestJS 控制器中使用
@Controller('workflow')
export class WorkflowController {
  @Post('search-weibo')
  async searchWeibo(@Body() body: { keyword: string; startDate: string }) {
    const searchAst = new WeiboKeywordSearchAst();
    searchAst.keyword = body.keyword;
    searchAst.startDate = new Date(body.startDate);
    
    // 完整执行工作流直到完成
    const result = await execute(searchAst, {});
    return { posts: result.posts };
  }
}
```

### NLP 分析工作流

后处理微博帖子进行情感分析和事件识别：

```typescript
@Node({ title: '帖子 NLP 分析' })
export class PostNLPAnalyzerAst extends Ast {
  @Input() post: WeiboPost;
  @Input() comments: WeiboComment[];
  
  @Output() nlpResult: {
    sentiment: SentimentScore;
    keywords: string[];
    event: { type: string; confidence: number };
  };

  type: 'PostNLPAnalyzerAst' = 'PostNLPAnalyzerAst';
}

@Handler(PostNLPAnalyzerAst)
export class PostNLPAnalyzerVisitor {
  constructor(private nlpService: NLPService) {}

  async visit(ast: PostNLPAnalyzerAst, ctx: any) {
    ast.state = 'running';
    try {
      const result = await this.nlpService.analyzePost({
        text: ast.post.text,
        comments: ast.comments.map(c => c.text)
      });
      ast.nlpResult = result;
      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      ast.error = error;
    }
    return ast;
  }
}

// 多步工作流：搜索 → NLP分析 → 事件创建
const workflow = createWorkflowGraphAst({
  name: '完整分析流程',
  nodes: [searchAst, nlpAst, eventAst],
  edges: [
    { from: 'search', fromProperty: 'posts', to: 'nlp', toProperty: 'post' },
    { from: 'nlp', fromProperty: 'nlpResult', to: 'event', toProperty: 'nlpResult' }
  ]
});
```

## API 参考

### 核心函数

#### `execute(state, context, visitor?)`
```typescript
async execute<S extends INode>(
  state: S,
  context: any,
  visitor?: Visitor
): Promise<S>
```
**功能**：完整执行工作流直到 `success` 或 `fail` 状态。

**参数**：
- `state`: 初始工作流图或节点
- `context`: 外部上下文，可被节点访问
- `visitor`: 自定义访问者（默认使用 `defaultVisitorExecutor`）

**返回**：最终状态的工作流

#### `executeAst(state, context, visitor?)`
```typescript
function executeAst<S extends INode>(
  state: S,
  context: any,
  visitor?: Visitor
): Promise<S>
```
**功能**：执行一次迭代，返回迭代后的状态（可能仍在 `running`）。

### 工作流构建

#### `createWorkflowGraphAst(options)`
```typescript
function createWorkflowGraphAst({
  name: string;
  nodes: INode[];
  edges: IEdge[];
  id?: string;
  state?: IAstStates;
}): WorkflowGraphAst
```

#### `fromJson(json)` / `toJson(ast)`
序列化与反序列化，支持工作流状态的持久化。

### 装饰器

#### `@Node(options?)`
在节点类上使用，注册为工作流节点类型。

#### `@Input(options?)`
```typescript
interface InputOptions {
  title?: string;        // UI展示用标题
  type?: string;         // 字段类型提示
  isMulti?: boolean;     // 是否多值聚合（默认 false）
}
```

#### `@Output(options?)`
```typescript
interface OutputOptions {
  title?: string;        // UI展示用标题
}
```

#### `@Handler(AstType)`
在访问者类或方法上使用，绑定节点的处理实现。

```typescript
// 类级别
@Handler(MyAst)
export class MyVisitor {
  async visit(ast: MyAst, ctx: any) { ... }
}

// 方法级别
export class MyVisitors {
  @Handler(MyAst)
  async handleMyAst(ast: MyAst, ctx: any) { ... }
}
```

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

这种分离使流程定义更清晰、更容易理解和维护。

## 与其他包的集成

### @sker/core
- 依赖注入容器（DI）：存储装饰器元数据
- 类型系统：`Type<T>`, `InjectionToken`

### @sker/workflow-ast
包含具体的业务节点定义（微博爬虫、NLP分析等）

### @sker/workflow-run
实现访问者处理器，连接到实际API和数据库

### @sker/entities
定义数据模型（WeiboPost、Event 等）

## 性能考量

### 并行执行
每个调度轮次中，所有就绪的节点会通过 `Promise.all()` 并行执行：
```typescript
const promises = executableNodes.map(node => executeAst(node, ctx));
const results = await Promise.all(promises);
```

### 增量数据流
数据通过边传递时支持嵌套属性提取，避免复制整个对象：
```typescript
// 只传递需要的属性
{ from: 'source', fromProperty: 'result.user.email', to: 'target', toProperty: 'email' }
```

### 节点的幂等性
推荐设计访问者为幂等的，使其支持重试：
```typescript
@Handler(MyAst)
export class MyVisitor {
  async visit(ast: MyAst, ctx: any) {
    // 设计为幂等的，重复执行结果相同
    const result = await fetchAndCache(ast.id);
    ast.output = result;
    ast.state = 'success';
    return ast;
  }
}
```

## 故障排查

### 节点永不执行
检查：
1. 输入边是否正确连接
2. 条件分支的源节点是否 `success` 且条件是否满足
3. 依赖节点是否存在 `fail` 状态

### 数据未传递
检查：
1. 源节点输出属性是否用 `@Output` 标记
2. 目标节点输入属性是否用 `@Input` 标记
3. 嵌套属性路径是否正确（如 `user.profile.email`）
4. 数据类型是否兼容

### 访问者未调用
检查：
1. 访问者类是否用 `@Handler(NodeType)` 装饰
2. 节点类是否用 `@Node()` 装饰
3. 节点的 `type` 属性是否与类名匹配

## 最佳实践

1. **原子设计**：每个节点应该做单一的、清晰的事情
2. **显式的输入输出**：总是用装饰器标记，不要依赖魔法
3. **错误处理**：访问者中捕获异常，设置 `state = 'fail'`
4. **日志记录**：记录关键的业务事件（节点开始、完成、失败）
5. **幂等性**：设计节点为可重试的，支持故障恢复

## 许可证

Private - Sker Platform
