
packages\workflow\src\execution\node-executor.ts
packages\workflow\src\execution\network-builder.ts

network-builder是在没有运行之前将工作流转化成图流，在订阅时自动执行，
构建时应该支持子工作流，而不是在节点执行时，再构建