# @sker/compiler

多厂商（Anthropic / OpenAI / Google）LLM 请求与响应的统一 AST 抽象、工具调用（Function Calling）编译与执行库，解决"一次编写、多模型适配"的问题。

## 核心职责

- **统一 AST**：为 Anthropic、OpenAI、Google 三种厂商定义请求/响应/流式事件的 AST 节点，并提供统一的 `Unified*` 中间格式
- **请求转换**：`request-transformer` 将统一请求转换为各厂商原生请求格式
- **响应归一**：`response-transformer` 将各厂商响应/流式事件归一为统一响应格式，`reverse-transformer` 支持无损还原为厂商原始格式
- **流式聚合**：`stream-aggregator` 将各厂商的 SSE 流式事件聚合为统一响应流（RxJS Observable）
- **工具构建**：`tool-builder` 基于 `@sker/core` 的 `@Tool` / `@ToolArg` 元数据自动生成各厂商工具定义（JSON Schema）
- **工具执行**：`tool-executor` 将模型返回的工具调用分派到注册的 Tool 类并执行
- **内置工具**：提供 `readFile` 等示例工具

## 目录结构

```
src/
├── ast.ts                              # 三厂商（Anthropic/OpenAI/Google）+ Unified 格式的 AST 节点定义
├── parser.ts                           # ParserVisitor：解析厂商原始请求/响应/流事件为 AST
├── tool.ts                             # ToolExecutorVisitor：执行工具调用，返回 ToolResult
├── tool-builder.ts                     # 从 @sker/core 工具元数据构建厂商工具定义（buildAnthropicTools / buildOpenAITools）
├── tool-executor.test.ts               # 工具执行测试
├── tools/
│   ├── index.ts                        # 内置工具导出
│   └── readFile.ts                     # 示例内置工具：读取文件（@Tool 装饰器示例）
├── google/
│   ├── index.ts                        # Google 相关导出
│   └── token.ts                        # 获取 Google Gemini 访问令牌
├── unified/
│   ├── index.ts                        # 统一抽象层导出
│   ├── request-transformer.ts          # UnifiedRequestAst → 各厂商请求格式
│   ├── response-transformer.ts         # 各厂商响应 → UnifiedResponseAst
│   ├── reverse-transformer.ts          # UnifiedResponseAst → 各厂商原始格式（无损还原）
│   ├── stream-aggregator.ts            # 各厂商流式事件聚合为统一响应流
│   ├── tool-builder.ts                 # 统一格式工具构建
│   └── unified.test.ts                 # 统一抽象层测试
├── utils/
│   └── zod-to-json-schema.ts           # Zod schema → JSON Schema 转换（Zod v4 toJSONSchema）
└── index.ts                            # 统一导出

scripts/                                # 开发/联调脚本（openai / anthropic / fetch / provider）
```

## 边界

- **✅ 负责**：跨厂商 LLM 请求/响应/流式事件的 AST 建模与互转；工具定义生成与工具调用执行；Zod → JSON Schema 转换
- **❌ 不负责**：不负责 LLM 的网络传输（HTTP/SSE 由调用方处理，`google/token.ts` 仅提供令牌获取示例）；不包含业务逻辑或具体模型实现；不负责 prompt 编写与编排（见 `@sker/workflow`）
- **对外依赖**：`@sker/core`（DI 容器与 `@Tool`/`@ToolArg` 元数据）；外部依赖 `@anthropic-ai/sdk`、`openai`、`rxjs`、`zod`
- **被谁依赖**：当前 monorepo 内暂无其他 `@sker/*` 包引用本库（作为独立发布的工具库被消费）
