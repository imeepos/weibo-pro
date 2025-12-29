# Workflow DSL 编译器 - 详细设计文档

## 1. 概述

### 1.1 目标

将文本化的工作流 DSL 编译为可执行的 `WorkflowGraphAst`，实现：
- 类型安全的节点定义和连接
- 友好的错误提示（精确到行列）
- 支持变量、表达式、条件连接
- 可视化友好（包含位置信息）

### 1.2 编译流程

```
DSL 文本 → [Lexer] → Token 流 → [Parser] → DSL AST → [CodeGen] → WorkflowGraphAst
                                                ↓
                                          [Validator]
                                          语义验证
```

---

## 2. DSL 语法设计

### 2.1 基础语法

```typescript
workflow "微博舆情分析" {
  // 节点定义
  node login {
    type: WeiboLoginAst
    position: { x: 100, y: 100 }
  }

  node search {
    type: WeiboKeywordSearchAst
    inputs: {
      keyword: "人工智能"
      maxDelay: 3000
    }
    position: { x: 300, y: 100 }
  }

  // 连接定义
  login.account -> search.account
}
```

### 2.2 变量系统

```typescript
workflow "示例" {
  variables {
    keyword = "AI"
    maxResults = 100
  }

  node search {
    type: WeiboKeywordSearchAst
    inputs: {
      keyword: $keyword              // 变量引用
      pageSize: $maxResults / 10     // 表达式
    }
  }
}
```

### 2.3 条件连接

```typescript
workflow "条件路由" {
  node analyzer {
    type: SentimentAnalyzerAst
  }

  node positiveHandler {
    type: PositiveHandlerAst
  }

  node negativeHandler {
    type: NegativeHandlerAst
  }

  // 条件连接
  analyzer.sentiment -> positiveHandler.input [when: $value > 0.7]
  analyzer.sentiment -> negativeHandler.input [when: $value < 0.3]
}
```

### 2.4 导入和模块化

```typescript
import "./common-nodes.wf" as common

workflow "主流程" {
  use common.LoginNode as login
  // ...
}
```

---

## 3. Token 定义

### 3.1 Token 类型

```typescript
enum TokenType {
  // 关键字
  WORKFLOW = 'WORKFLOW',
  NODE = 'NODE',
  VARIABLES = 'VARIABLES',
  IMPORT = 'IMPORT',
  USE = 'USE',
  AS = 'AS',
  WHEN = 'WHEN',

  // 字面量
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  NULL = 'NULL',

  // 符号
  LBRACE = 'LBRACE',       // {
  RBRACE = 'RBRACE',       // }
  LBRACKET = 'LBRACKET',   // [
  RBRACKET = 'RBRACKET',   // ]
  LPAREN = 'LPAREN',       // (
  RPAREN = 'RPAREN',       // )
  COLON = 'COLON',         // :
  COMMA = 'COMMA',         // ,
  ARROW = 'ARROW',         // ->
  DOT = 'DOT',             // .
  DOLLAR = 'DOLLAR',       // $
  EQUALS = 'EQUALS',       // =

  // 运算符
  PLUS = 'PLUS',           // +
  MINUS = 'MINUS',         // -
  MULTIPLY = 'MULTIPLY',   // *
  DIVIDE = 'DIVIDE',       // /
  GT = 'GT',               // >
  LT = 'LT',               // <
  GTE = 'GTE',             // >=
  LTE = 'LTE',             // <=
  EQ = 'EQ',               // ==
  NEQ = 'NEQ',             // !=

  EOF = 'EOF',
}

interface Token {
  type: TokenType;
  value: string | number | boolean | null;
  position: number;
  line: number;
  column: number;
}
```

### 3.2 错误类型

```typescript
class LexerError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number
  ) {
    super(`Lexer Error at ${line}:${column} - ${message}`);
    this.name = 'LexerError';
  }
}
```

---

## 4. DSL AST 定义

### 4.1 核心节点

```typescript
interface WorkflowDSLNode {
  type: string;
  position?: SourcePosition;
}

interface SourcePosition {
  line: number;
  column: number;
}

interface WorkflowDefinition extends WorkflowDSLNode {
  type: 'Workflow';
  name: string;
  variables?: VariableDeclaration[];
  imports?: ImportDeclaration[];
  nodes: NodeDefinition[];
  connections: ConnectionDefinition[];
}

interface VariableDeclaration extends WorkflowDSLNode {
  type: 'VariableDeclaration';
  name: string;
  value: Expression;
}

interface ImportDeclaration extends WorkflowDSLNode {
  type: 'ImportDeclaration';
  path: string;
  alias?: string;
}

interface NodeDefinition extends WorkflowDSLNode {
  type: 'Node';
  id: string;
  nodeType: string;
  inputs?: Record<string, Expression>;
  position?: { x: number; y: number };
  metadata?: Record<string, any>;
}

interface ConnectionDefinition extends WorkflowDSLNode {
  type: 'Connection';
  from: PortReference;
  to: PortReference;
  condition?: Expression;
  mode?: 'push' | 'pull';
}

interface PortReference {
  nodeId: string;
  portName: string;
}
```

### 4.2 表达式系统

```typescript
type Expression =
  | LiteralExpression
  | VariableExpression
  | BinaryExpression
  | ObjectExpression
  | ArrayExpression
  | MemberExpression;

interface LiteralExpression extends WorkflowDSLNode {
  type: 'Literal';
  value: string | number | boolean | null;
}

interface VariableExpression extends WorkflowDSLNode {
  type: 'Variable';
  name: string;
}

interface BinaryExpression extends WorkflowDSLNode {
  type: 'BinaryExpression';
  operator: '+' | '-' | '*' | '/' | '>' | '<' | '>=' | '<=' | '==' | '!=';
  left: Expression;
  right: Expression;
}

interface ObjectExpression extends WorkflowDSLNode {
  type: 'Object';
  properties: Record<string, Expression>;
}

interface ArrayExpression extends WorkflowDSLNode {
  type: 'Array';
  elements: Expression[];
}

interface MemberExpression extends WorkflowDSLNode {
  type: 'MemberExpression';
  object: Expression;
  property: string;
}
```

---

## 5. 词法分析器实现要点

### 5.1 核心方法

```typescript
class WorkflowLexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private currentChar: string | null;

  // 核心方法
  private advance(): void;
  private peek(offset?: number): string | null;
  private skipWhitespace(): void;
  private skipComment(): void;

  // Token 读取
  private readString(): Token;
  private readNumber(): Token;
  private readIdentifier(): Token;

  // 公共接口
  getNextToken(): Token;
  tokenize(): Token[];
}
```

### 5.2 关键特性

1. **精确位置追踪**：维护 line、column、position
2. **注释支持**：单行 `//` 和多行 `/* */`
3. **转义字符**：支持 `\n`、`\t`、`\r`、`\\`、`\"`、`\'`
4. **数字验证**：检测多个小数点等非法格式
5. **关键字识别**：自动区分关键字和标识符

---

## 6. 语法分析器实现要点

### 6.1 核心方法

```typescript
class WorkflowParser {
  private tokens: Token[];
  private currentIndex: number = 0;
  private currentToken: Token;

  // 基础方法
  private advance(): void;
  private eat(tokenType: TokenType): Token;
  private peek(offset?: number): Token;

  // 解析方法
  private parseWorkflow(): WorkflowDefinition;
  private parseVariables(): VariableDeclaration[];
  private parseImports(): ImportDeclaration[];
  private parseNode(): NodeDefinition;
  private parseConnection(): ConnectionDefinition;

  // 表达式解析
  private parseExpression(): Expression;
  private parseBinaryExpression(): BinaryExpression;
  private parseVariableReference(): VariableExpression;
  private parseObject(): ObjectExpression;
  private parseArray(): ArrayExpression;

  // 公共接口
  parse(): WorkflowDefinition;
}
```

### 6.2 错误处理

```typescript
class ParserError extends Error {
  constructor(
    message: string,
    public token: Token
  ) {
    super(`Parser Error at ${token.line}:${token.column} - ${message}`);
    this.name = 'ParserError';
  }
}
```

### 6.3 运算符优先级

```typescript
const PRECEDENCE: Record<string, number> = {
  '==': 1,
  '!=': 1,
  '<': 2,
  '>': 2,
  '<=': 2,
  '>=': 2,
  '+': 3,
  '-': 3,
  '*': 4,
  '/': 4,
};
```

---

## 7. 代码生成器实现要点

### 7.1 核心职责

```typescript
class WorkflowCodeGenerator {
  private variableContext: Map<string, any> = new Map();
  private nodeRegistry: Map<string, typeof Ast> = new Map();

  // 主生成方法
  generate(dslAst: WorkflowDefinition): WorkflowGraphAst;

  // 节点创建
  private createNodeInstance(nodeDef: NodeDefinition): Ast;
  private resolveNodeType(nodeType: string): typeof Ast;

  // 表达式求值
  private evaluateExpression(expr: Expression): any;
  private evaluateBinaryExpression(expr: BinaryExpression): any;
  private evaluateVariableExpression(expr: VariableExpression): any;

  // 连接创建
  private createEdge(conn: ConnectionDefinition, nodeMap: Map<string, Ast>): Edge;
}
```

### 7.2 节点类型解析

```typescript
private resolveNodeType(nodeType: string): typeof Ast {
  // 1. 从注册表查找
  if (this.nodeRegistry.has(nodeType)) {
    return this.nodeRegistry.get(nodeType)!;
  }

  // 2. 从 @sker/workflow-ast 动态导入
  const NodeClass = findNodeType(nodeType);
  if (!NodeClass) {
    throw new CodeGenError(`Unknown node type: ${nodeType}`);
  }

  return NodeClass;
}
```

### 7.3 表达式求值

```typescript
private evaluateExpression(expr: Expression): any {
  switch (expr.type) {
    case 'Literal':
      return (expr as LiteralExpression).value;

    case 'Variable':
      return this.evaluateVariableExpression(expr as VariableExpression);

    case 'BinaryExpression':
      return this.evaluateBinaryExpression(expr as BinaryExpression);

    case 'Object':
      return this.evaluateObjectExpression(expr as ObjectExpression);

    case 'Array':
      return this.evaluateArrayExpression(expr as ArrayExpression);

    default:
      throw new CodeGenError(`Unknown expression type: ${expr.type}`);
  }
}
```

---

## 8. 语义验证器

### 8.1 验证规则

```typescript
class WorkflowValidator {
  validate(dslAst: WorkflowDefinition): ValidationResult {
    const errors: ValidationError[] = [];

    // 1. 节点 ID 唯一性
    this.validateUniqueNodeIds(dslAst, errors);

    // 2. 连接有效性
    this.validateConnections(dslAst, errors);

    // 3. 节点类型存在性
    this.validateNodeTypes(dslAst, errors);

    // 4. 变量引用有效性
    this.validateVariableReferences(dslAst, errors);

    // 5. 端口匹配性
    this.validatePortCompatibility(dslAst, errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

interface ValidationError {
  message: string;
  position: SourcePosition;
  severity: 'error' | 'warning';
}
```

### 8.2 验证示例

```typescript
// 检查节点 ID 唯一性
private validateUniqueNodeIds(
  dslAst: WorkflowDefinition,
  errors: ValidationError[]
): void {
  const ids = new Set<string>();

  for (const node of dslAst.nodes) {
    if (ids.has(node.id)) {
      errors.push({
        message: `Duplicate node ID: ${node.id}`,
        position: node.position!,
        severity: 'error',
      });
    }
    ids.add(node.id);
  }
}

// 检查连接有效性
private validateConnections(
  dslAst: WorkflowDefinition,
  errors: ValidationError[]
): void {
  const nodeIds = new Set(dslAst.nodes.map(n => n.id));

  for (const conn of dslAst.connections) {
    if (!nodeIds.has(conn.from.nodeId)) {
      errors.push({
        message: `Connection references unknown node: ${conn.from.nodeId}`,
        position: conn.position!,
        severity: 'error',
      });
    }

    if (!nodeIds.has(conn.to.nodeId)) {
      errors.push({
        message: `Connection references unknown node: ${conn.to.nodeId}`,
        position: conn.position!,
        severity: 'error',
      });
    }
  }
}
```

---

## 9. 完整编译器接口

### 9.1 主接口

```typescript
export class WorkflowDSLCompiler {
  private lexer: WorkflowLexer;
  private parser: WorkflowParser;
  private validator: WorkflowValidator;
  private generator: WorkflowCodeGenerator;

  constructor(options?: CompilerOptions) {
    this.validator = new WorkflowValidator();
    this.generator = new WorkflowCodeGenerator(options?.nodeRegistry);
  }

  compile(dslCode: string): CompilationResult {
    try {
      // 1. 词法分析
      this.lexer = new WorkflowLexer(dslCode);
      const tokens = this.lexer.tokenize();

      // 2. 语法分析
      this.parser = new WorkflowParser(tokens);
      const dslAst = this.parser.parse();

      // 3. 语义验证
      const validation = this.validator.validate(dslAst);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // 4. 代码生成
      const workflowGraph = this.generator.generate(dslAst);

      return {
        success: true,
        workflowGraph,
        dslAst,
      };
    } catch (error) {
      return {
        success: false,
        errors: [this.formatError(error)],
      };
    }
  }

  private formatError(error: any): CompilationError {
    if (error instanceof LexerError || error instanceof ParserError) {
      return {
        message: error.message,
        line: error.line || 0,
        column: error.column || 0,
        severity: 'error',
      };
    }

    return {
      message: error.message || 'Unknown error',
      line: 0,
      column: 0,
      severity: 'error',
    };
  }
}

interface CompilerOptions {
  nodeRegistry?: Map<string, typeof Ast>;
  enableOptimization?: boolean;
}

interface CompilationResult {
  success: boolean;
  workflowGraph?: WorkflowGraphAst;
  dslAst?: WorkflowDefinition;
  errors?: CompilationError[];
}

interface CompilationError {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
}
```

---

## 10. 使用示例

### 10.1 基础使用

```typescript
import { WorkflowDSLCompiler } from '@sker/workflow-compiler';
import { NodeExecutor } from '@sker/workflow';

const dslCode = `
workflow "微博舆情分析" {
  node login {
    type: WeiboLoginAst
    position: { x: 100, y: 100 }
  }

  node search {
    type: WeiboKeywordSearchAst
    inputs: {
      keyword: "人工智能"
      maxDelay: 3000
    }
    position: { x: 300, y: 100 }
  }

  login.account -> search.account
}
`;

// 编译
const compiler = new WorkflowDSLCompiler();
const result = compiler.compile(dslCode);

if (!result.success) {
  console.error('编译失败:', result.errors);
  process.exit(1);
}

// 执行
const executor = new NodeExecutor();
executor.execute(result.workflowGraph!).subscribe({
  next: (event) => console.log('节点事件:', event),
  complete: () => console.log('✅ 完成'),
  error: (err) => console.error('❌ 失败:', err),
});
```

### 10.2 自定义节点注册

```typescript
import { CustomNodeAst } from './custom-nodes';

const compiler = new WorkflowDSLCompiler({
  nodeRegistry: new Map([
    ['CustomNode', CustomNodeAst],
  ]),
});
```

### 10.3 错误处理

```typescript
const result = compiler.compile(dslCode);

if (!result.success) {
  for (const error of result.errors!) {
    console.error(
      `[${error.severity.toUpperCase()}] ${error.line}:${error.column} - ${error.message}`
    );
  }
}
```

---

## 11. 扩展方向

### 11.1 循环支持

```typescript
workflow "批量处理" {
  loop maxIterations: 10 {
    node fetch {
      type: WeiboKeywordSearchAst
    }

    node check {
      type: LlmCategoryAst
    }

    check.isEnd -> loop.break [when: $value == true]
  }
}
```

### 11.2 条件分支

```typescript
workflow "条件路由" {
  node router {
    type: SwitchAst
  }

  if $sentiment > 0.7 {
    router.output -> positiveHandler.input
  } else if $sentiment < 0.3 {
    router.output -> negativeHandler.input
  } else {
    router.output -> neutralHandler.input
  }
}
```

### 11.3 函数定义

```typescript
workflow "主流程" {
  function processPost(postId: string) {
    node analyzer {
      type: PostNLPAnalyzerAst
      inputs: { postId: $postId }
    }
    return analyzer.result
  }

  node search {
    type: WeiboKeywordSearchAst
  }

  search.mblogid -> processPost($mblogid)
}
```

---

## 12. 性能优化

### 12.1 编译缓存

```typescript
class WorkflowDSLCompiler {
  private cache = new Map<string, CompilationResult>();

  compile(dslCode: string, useCache = true): CompilationResult {
    if (useCache) {
      const hash = this.hashCode(dslCode);
      if (this.cache.has(hash)) {
        return this.cache.get(hash)!;
      }
    }

    const result = this.doCompile(dslCode);

    if (useCache && result.success) {
      this.cache.set(this.hashCode(dslCode), result);
    }

    return result;
  }
}
```

### 12.2 增量编译

```typescript
class IncrementalCompiler extends WorkflowDSLCompiler {
  private previousAst?: WorkflowDefinition;

  compile(dslCode: string): CompilationResult {
    const newAst = this.parse(dslCode);

    if (this.previousAst) {
      const diff = this.computeDiff(this.previousAst, newAst);
      return this.incrementalGenerate(diff);
    }

    this.previousAst = newAst;
    return super.compile(dslCode);
  }
}
```

---

## 13. 测试策略

### 13.1 单元测试

```typescript
describe('WorkflowLexer', () => {
  it('should tokenize basic workflow', () => {
    const lexer = new WorkflowLexer('workflow "test" {}');
    const tokens = lexer.tokenize();

    expect(tokens).toHaveLength(5);
    expect(tokens[0].type).toBe(TokenType.WORKFLOW);
    expect(tokens[1].type).toBe(TokenType.STRING);
  });

  it('should handle comments', () => {
    const lexer = new WorkflowLexer('// comment\nworkflow "test" {}');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.WORKFLOW);
  });
});
```

### 13.2 集成测试

```typescript
describe('WorkflowDSLCompiler', () => {
  it('should compile valid workflow', () => {
    const compiler = new WorkflowDSLCompiler();
    const result = compiler.compile(validDSL);

    expect(result.success).toBe(true);
    expect(result.workflowGraph).toBeDefined();
    expect(result.workflowGraph!.nodes).toHaveLength(2);
  });

  it('should report syntax errors', () => {
    const compiler = new WorkflowDSLCompiler();
    const result = compiler.compile('workflow "test" {');

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});
```

---

## 14. 核心优势

1. **类型安全**：利用 TypeScript 类型系统，编译时检查节点类型
2. **友好错误**：精确到行列的错误提示，包含上下文信息
3. **可扩展**：模块化设计，易于添加新语法特性
4. **高性能**：支持编译缓存和增量编译
5. **无缝集成**：生成标准 WorkflowGraphAst，直接可执行
6. **可视化友好**：包含节点位置信息，可直接渲染到画布
7. **表达式系统**：支持变量、运算、条件判断
8. **语义验证**：编译时检查节点连接、类型匹配等

---

## 15. 项目结构

```
packages/workflow-compiler/
├── src/
│   ├── lexer/
│   │   ├── index.ts           # 词法分析器
│   │   ├── token.ts           # Token 定义
│   │   └── errors.ts          # 词法错误
│   ├── parser/
│   │   ├── index.ts           # 语法分析器
│   │   ├── ast.ts             # AST 定义
│   │   └── errors.ts          # 语法错误
│   ├── validator/
│   │   ├── index.ts           # 语义验证器
│   │   └── rules.ts           # 验证规则
│   ├── generator/
│   │   ├── index.ts           # 代码生成器
│   │   └── evaluator.ts       # 表达式求值
│   ├── compiler.ts            # 主编译器
│   └── index.ts               # 导出接口
├── tests/
│   ├── lexer.test.ts
│   ├── parser.test.ts
│   ├── validator.test.ts
│   ├── generator.test.ts
│   └── integration.test.ts
├── examples/
│   ├── basic.wf
│   ├── variables.wf
│   └── conditions.wf
└── package.json
```
