# @sker/workflow - 工作流引擎核心包

## 核心逻辑
input$ = merge(input1$, input2$)
- 当 input1$ complete 时，input$ 还没 complete（因为 input2$ 还在）
- 只有当 input1$ 和 input2$ 都 complete 时，input$ 才 complete
- 此时 TextAreaAst 才应该发射 node_success

参考：packages\workflow\src\TextAreaAst.ts

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
