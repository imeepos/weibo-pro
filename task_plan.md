# 统一 Request/Response 抽象层设计

## 目标
设计统一的 `UnifiedRequest` / `UnifiedResponse` 抽象，实现与 Anthropic、OpenAI、Google 协议的双向等价转换。

## 现状分析

### 当前架构
```
┌─────────────────────────────────────────────────────────────────┐
│                        ast.ts                                    │
├─────────────────────────────────────────────────────────────────┤
│ Request AST:                                                     │
│   - AnthropicRequestAst (model, messages, tools, stream...)     │
│   - OpenAIRequestAst (model, messages, tools, stream...)        │
│   - GoogleRequestAst (contents, generationConfig, tools...)     │
├─────────────────────────────────────────────────────────────────┤
│ Response AST:                                                    │
│   - AnthropicResponseAst + 流式事件 AST                          │
│   - OpenAiResponseAst                                           │
│   - GoogleResponseAst                                           │
├─────────────────────────────────────────────────────────────────┤
│ Visitor 接口：统一访问各 AST                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 问题
1. 没有统一的请求/响应表示
2. 调用方需要针对不同厂商构建不同的 AST
3. 响应解析后需要针对不同厂商写不同的处理逻辑

## 设计方案

### 核心理念
```
UnifiedRequest  ──Visitor──▶  AnthropicRequestAst / OpenAIRequestAst / GoogleRequestAst
                              ↓
                          HTTP Request
                              ↓
                          HTTP Response
                              ↓
AnthropicResponseAst / OpenAiResponseAst / GoogleResponseAst  ──Visitor──▶  UnifiedResponse
```

### Phase 1: 定义统一抽象层 [pending]

```typescript
// 统一消息角色
type UnifiedRole = 'system' | 'user' | 'assistant' | 'tool';

// 统一内容块
interface UnifiedTextContent { type: 'text'; text: string }
interface UnifiedThinkingContent { type: 'thinking'; thinking: string; signature?: string }
interface UnifiedToolUseContent { type: 'tool_use'; id: string; name: string; input: Record<string, any> }
interface UnifiedToolResultContent { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
type UnifiedContent = UnifiedTextContent | UnifiedThinkingContent | UnifiedToolUseContent | UnifiedToolResultContent;

// 统一消息
interface UnifiedMessage {
  role: UnifiedRole;
  content: string | UnifiedContent[];
}

// 统一工具定义
interface UnifiedTool {
  name: string;
  description: string;
  parameters: Record<string, any>;  // JSON Schema
}

// 统一请求 AST
class UnifiedRequestAst extends Ast {
  model: string;
  messages: UnifiedMessage[];
  system?: string;
  tools?: UnifiedTool[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// 统一响应 AST
class UnifiedResponseAst extends Ast {
  id?: string;
  model?: string;
  role: 'assistant';
  content: UnifiedContent[];
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

### Phase 2: 实现 Request 转换 Visitor [pending]

```typescript
// Unified → Anthropic
class UnifiedToAnthropicVisitor implements Visitor {
  visitUnifiedRequestAst(ast: UnifiedRequestAst): AnthropicRequestAst
}

// Unified → OpenAI
class UnifiedToOpenAIVisitor implements Visitor {
  visitUnifiedRequestAst(ast: UnifiedRequestAst): OpenAIRequestAst
}

// Unified → Google
class UnifiedToGoogleVisitor implements Visitor {
  visitUnifiedRequestAst(ast: UnifiedRequestAst): GoogleRequestAst
}
```

### Phase 3: 实现 Response 转换 Visitor [pending]

```typescript
// Anthropic → Unified
class AnthropicToUnifiedVisitor implements Visitor {
  visitAnthropicResponseAst(ast: AnthropicResponseAst): UnifiedResponseAst
}

// OpenAI → Unified
class OpenAIToUnifiedVisitor implements Visitor {
  visitOpenAiResponseAst(ast: OpenAiResponseAst): UnifiedResponseAst
}

// Google → Unified
class GoogleToUnifiedVisitor implements Visitor {
  visitGoogleResponseAst(ast: GoogleResponseAst): UnifiedResponseAst
}
```

### Phase 4: 统一调用接口 [pending]

```typescript
class UnifiedAIClient {
  constructor(private provider: 'anthropic' | 'openai' | 'google') {}

  async chat(request: UnifiedRequestAst): Promise<UnifiedResponseAst>
  chatStream(request: UnifiedRequestAst): Observable<UnifiedStreamEvent>
}
```

## 文件结构

```
packages/compiler/src/
├── ast.ts                    # 现有 AST（保留）
├── unified/
│   ├── index.ts              # 导出
│   ├── ast.ts                # UnifiedRequestAst, UnifiedResponseAst
│   ├── types.ts              # UnifiedMessage, UnifiedContent, etc.
│   ├── request-visitor.ts    # Unified → 各厂商 Request
│   ├── response-visitor.ts   # 各厂商 Response → Unified
│   └── client.ts             # UnifiedAIClient
```

## 转换映射表

### Message Role 映射
| Unified | Anthropic | OpenAI | Google |
|---------|-----------|--------|--------|
| system | (单独字段) | system | (systemInstruction) |
| user | user | user | user |
| assistant | assistant | assistant | model |
| tool | user+tool_result | tool | function |

### Content 映射
| Unified | Anthropic | OpenAI | Google |
|---------|-----------|--------|--------|
| text | text | content | text |
| thinking | thinking | reasoning_content | (无) |
| tool_use | tool_use | tool_calls | functionCall |
| tool_result | tool_result | tool (role) | functionResponse |

### Stop Reason 映射
| Unified | Anthropic | OpenAI | Google |
|---------|-----------|--------|--------|
| end_turn | end_turn | stop | STOP |
| tool_use | tool_use | tool_calls | (检测 functionCall) |
| max_tokens | max_tokens | length | MAX_TOKENS |

## 实现优先级

1. **P0**: 统一类型定义 + 非流式转换
2. **P1**: 流式响应转换
3. **P2**: UnifiedAIClient 封装
4. **P3**: 测试用例

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (暂无) | | |
