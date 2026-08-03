# @sker/workflow-compiler

工作流 DSL 编译器：将 `.wf` 工作流 DSL 源码编译为可执行的 `WorkflowGraphAst`，覆盖词法、语法、模块解析、语义校验与代码生成全流程。

## 核心职责

- **词法分析（Lexer）**：将 DSL 源码切分为 Token 流，支持位置信息与词法错误定位
- **语法分析（Parser）**：将 Token 流解析为 `WorkflowDefinition` DSL AST（节点、连接、变量、导入/使用声明、表达式）
- **模块解析（Resolver）**：解析 `import` / `use` 声明，跨文件合并节点定义
- **语义校验（Validator）**：对 DSL AST 进行结构/语义校验，返回带严重级别（error/warning）的校验错误
- **代码生成（Generator）**：将 DSL AST 生成 `WorkflowGraphAst`，产物直接交给 `@sker/workflow` 执行
- **统一入口**：`WorkflowDSLCompiler.compile()` 串联 5 个阶段并输出统一的 `CompilationResult`

## 目录结构

```
packages/workflow-compiler/src/
├── index.ts            # 公共 API 导出（Lexer/Parser/Resolver/Validator/Generator/Compiler）
├── compiler.ts         # WorkflowDSLCompiler 主类：串联编译流水线 + compile() 便捷函数
├── lexer/              # 词法分析器：Lexer、Token、TokenType、LexerError
├── parser/             # 语法分析器：Parser、WorkflowDefinition/NodeDefinition/Expression 等 DSL AST 类型
├── resolver/           # 模块解析器：ModuleResolver（import 依赖解析与合并）
├── validator/          # 语义校验器：WorkflowValidator、ValidationError/ValidationResult
└── generator/          # 代码生成器：CodeGenerator（DSL AST → WorkflowGraphAst）
```

## 边界

- **✅ 负责**：DSL 的编译期能力（词法/语法/语义分析、模块解析、代码生成）；将 DSL 编译为可供 `@sker/workflow` 执行/持久化的 `WorkflowGraphAst`
- **❌ 不负责**：节点定义（属于 `@sker/workflow-ast`）、引擎核心与执行调度（属于 `@sker/workflow`）、后端/前端运行时执行（属于 `@sker/workflow-run` / `@sker/workflow-browser`）、前端可视化渲染（属于 `@sker/workflow-ui`）
- **对外依赖**：`@sker/workflow`（WorkflowGraphAst）
- **被谁依赖**：`@sker/agent`；apps：`api`

---

## 编译流水线

```
DSL 源码
  ↓ 1. Lexer（词法分析）
  Token 流
  ↓ 2. Parser（语法分析）
  WorkflowDefinition（DSL AST）
  ↓ 3. Resolver（模块解析，import/use 合并）
  合并后的 DSL AST
  ↓ 4. Validator（语义校验）
  校验通过的 DSL AST
  ↓ 5. Generator（代码生成）
  WorkflowGraphAst（可执行）
```

## 使用示例

```typescript
import { compile } from '@sker/workflow-compiler';

const dsl = `
node input {
  type: TextAreaAst
}
node agent {
  type: LlmTextAgentAst
}
connect input -> agent
`;

const result = compile(dsl);
if (result.success && result.workflowGraph) {
  // result.workflowGraph 可直接交给 @sker/workflow 执行
}
```
