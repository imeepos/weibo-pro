# @sker/workflow-browser

浏览器端工作流执行器 - 前端运行时的 Visitor 实现层。

## 概览

`@sker/workflow-browser` 是工作流引擎在浏览器端的执行层，提供了所有 AST 节点在前端运行时的 Visitor 实现。它采用**远程代理模式** + **本地执行模式**的混合架构：

- **远程代理**：大部分节点通过 `executeRemote()` 将执行委托给后端 API（通过 SSE 实时同步状态）
- **本地执行**：控制流节点（Loop/Switch/Merge/Share）直接在浏览器端执行，减少网络开销
