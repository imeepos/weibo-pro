# @sker/workflow-browser

浏览器端工作流执行器：以「远程代理执行 + 本地执行」混合架构，为所有 AST 节点提供前端运行时的 Visitor 实现。

## 核心职责

- **远程代理执行**：注册 `RemoteDefaultVisitor` 为默认访问者，未找到 `@Handler` 的节点自动通过 `executeRemote()` 委托后端 API 执行（SSE 实时同步状态）
- **远程执行工具**：`executeRemote` / `handlerRemote` 调用后端 `WorkflowController`，并将 `node_emit` 事件同步回本地 AST 实例（BehaviorSubject）
- **错误恢复**：`error-handler.util.ts` 提供重试与兜底错误处理 RxJS 操作符
- **本地执行**：对控制流/轻量节点（`LastAstVisitor`、`PostNLPLooperAstVisitor`）在浏览器端直接执行，减少网络开销
- **自动装配**：在应用入口 `import '@sker/workflow-browser'` 即自动注册 `DEFAULT_VISITOR` 与 `EdgeModeStrategy` providers

## 目录结构

```
packages/workflow-browser/src/
├── index.ts                    # 自动注册 RemoteDefaultVisitor + EdgeModeStrategy providers，并导出公共 API
├── RemoteDefaultVisitor.ts     # 默认远程访问者（前端兜底执行）：无 @Handler 时走 handlerRemote
├── execute-remote.ts           # executeRemote / handlerRemote：调用后端并同步 SSE 事件到本地 AST
├── error-handler.util.ts       # 远程执行的错误处理操作符（重试、捕获）
├── LastAstVisitor.ts           # 本地执行：取最后值节点
└── PostNLPLooperAstVisitor.ts  # 本地执行：NLP 循环节点
```

## 边界

- **✅ 负责**：前端运行时的 Visitor 层、远程代理执行（委托后端 + SSE 状态同步）、本地轻量/控制流节点执行、错误重试策略、自动注册默认访问者
- **❌ 不负责**：引擎核心与装饰器（属于 `@sker/workflow`）、节点定义（属于 `@sker/workflow-ast`）、后端真实业务执行（属于 `@sker/workflow-run`）、前端可视化渲染与画布（属于 `@sker/workflow-ui`）
- **对外依赖**：`@sker/workflow`（DEFAULT_VISITOR、EdgeModeStrategy、事件类型）、`@sker/core`（DI）、`@sker/workflow-ast`（节点类型）、`@sker/sdk`（WorkflowController）、rxjs
- **被谁依赖**：`@sker/workflow-ui`；apps：`bigscreen`、`storybook`

---

## 使用方式

1. 在应用入口导入本包：`import '@sker/workflow-browser'`
2. `RemoteDefaultVisitor` 自动注册为 `DEFAULT_VISITOR`
3. 未找到 `@Handler` 的节点自动走远程执行，前端无需为每个节点编写 Visitor

## 架构设计

- **远程代理**：大部分节点通过 `executeRemote()` 将执行委托给后端 API（通过 SSE 实时同步状态）
- **本地执行**：控制流节点（Loop/Switch/Merge/Share 等）直接在浏览器端执行，减少网络开销
