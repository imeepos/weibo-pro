# @sker/llm-protocol

LLM API 协议转换器，在 OpenAI、Anthropic Claude、Codex（Responses API）三种协议之间互转。

## 核心职责

- 定义 OpenAI / Claude / Codex 三种协议的请求与消息类型定义（`types/openai|claude|codex`）
- 提供 `OpenAIToCodexConverter`：把 OpenAI 格式请求转换为 Codex Responses API 格式，自动维护 `call_id ↔ uuid` 映射与工具调用配对
- 基于 AST + Visitor 的协议适配层：将请求解析为统一 `Ast` 结构，再通过 `ToOpenAiVisitor` / `ToAnthropicVisitor` / `ToCodexVisitor` 输出到各协议
- 内置 Codex 系统提示词（`CODEX_PROMPT`），保证转换后的请求符合 Codex CLI 行为
- 依赖极少（仅 `@sker/core`），纯类型与转换逻辑，无网络 IO

## 目录结构

```
packages/llm-protocol/
├── src/
│   ├── index.ts                       # 导出入口（聚合 adaptors）
│   └── adaptors/
│       ├── index.ts                   # 导出全部类型、转换器与 AST 适配器
│       ├── openai-to-codex.converter.ts  # OpenAI → Codex 直接转换器
│       ├── tokens.ts                  # Codex 系统提示词等常量
│       ├── prompt.md                  # 协议转换相关提示词文档
│       ├── types/
│       │   ├── openai.ts              # OpenAI Chat/Completions 请求类型
│       │   ├── claude.ts              # Anthropic Claude 消息类型
│       │   ├── codex.ts               # Codex Responses API 类型
│       │   ├── unknown.ts             # 未知/通用消息类型
│       │   └── index.ts               # 类型导出
│       └── ast/
│           ├── base.ts                # Ast 根结构
│           ├── nodes.ts               # AST 节点定义
│           ├── visitor.ts             # Visitor 接口与 BaseVisitor
│           ├── to-openai.visitor.ts   # AST → OpenAI 协议
│           ├── to-anthropic.visitor.ts# AST → Claude 协议
│           ├── to-codex.visitor.ts    # AST → Codex 协议
│           └── index.ts               # AST 适配层导出
├── package.json
├── tsconfig.json
└── tsup.config.ts                     # 构建配置
```

## 边界

- **✅ 负责**：三种 LLM 协议间的请求格式转换、类型定义、AST 中间表示与 Visitor 访问器
- **❌ 不负责**：实际的 LLM API 网络调用与密钥管理；模型的推理/流式输出处理（由 `@sker/nlp` 或上层代理服务负责）；协议响应体的统一解析
- **对外依赖**：`@sker/core`（基础类型/工具）；无第三方运行时依赖
- **被谁依赖**：`apps/api`（`llm-proxy.service.ts` 使用转换器做 LLM 代理）
