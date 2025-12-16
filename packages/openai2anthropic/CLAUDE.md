# @sker/openai2anthropic

OpenAI 和 Anthropic Claude API 协议双向转换器。

## 功能

- OpenAI Chat Completions → Claude Messages API
- Claude Messages API → OpenAI Chat Completions
- 流式响应转换（SSE）
- 工具调用（Function Calling / Tool Use）互转

## 使用

```typescript
import {
  // OpenAI → Claude
  openaiRequestToClaude,
  claudeResponseToOpenai,
  createClaudeToOpenaiStreamConverter,

  // Claude → OpenAI
  claudeRequestToOpenai,
  openaiResponseToClaude,
  createOpenaiToClaudeStreamConverter,
} from '@sker/openai2anthropic';
```

### 请求转换

```typescript
// OpenAI 请求 → Claude 请求
const claudeReq = openaiRequestToClaude({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Hello' }
  ],
  max_tokens: 1000
});

// Claude 请求 → OpenAI 请求
const openaiReq = claudeRequestToOpenai({
  model: 'claude-3-opus',
  system: 'You are helpful.',
  messages: [{ role: 'user', content: 'Hello' }],
  max_tokens: 1000
});
```

### 响应转换

```typescript
// Claude 响应 → OpenAI 响应
const openaiRes = claudeResponseToOpenai(claudeResponse);

// OpenAI 响应 → Claude 响应
const claudeRes = openaiResponseToClaude(openaiResponse);
```

### 流式响应转换

```typescript
// Claude SSE → OpenAI SSE
const converter = createClaudeToOpenaiStreamConverter();
for await (const event of claudeStream) {
  const chunk = converter(event);
  if (chunk) yield chunk;
}

// OpenAI SSE → Claude SSE
const converter = createOpenaiToClaudeStreamConverter();
for await (const chunk of openaiStream) {
  const events = converter(chunk);
  for (const event of events) yield event;
}
```

## 转换映射

### 消息角色

| OpenAI | Claude |
|--------|--------|
| `system` | `system` 字段 |
| `user` | `user` |
| `assistant` | `assistant` |
| `tool` | `tool_result` |

### 停止原因

| OpenAI | Claude |
|--------|--------|
| `stop` | `end_turn` |
| `length` | `max_tokens` |
| `tool_calls` | `tool_use` |

### 工具调用

| OpenAI | Claude |
|--------|--------|
| `tool_calls[].function.name` | `tool_use.name` |
| `tool_calls[].function.arguments` | `tool_use.input` |
| `tool_calls[].id` | `tool_use.id` |
