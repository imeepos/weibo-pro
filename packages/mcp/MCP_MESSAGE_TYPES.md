# MCP 协议消息类型 - 完整参考

基于 @modelcontextprotocol/sdk 包和官方 MCP 规范的完整消息类型目录。

## 协议基础

MCP 使用 **JSON-RPC 2.0** 作为消息格式，包含三种基本消息类型：
- **请求 (Requests)**：带有 `id` 的消息，需要响应
- **响应 (Responses)**：带有与请求匹配的 `id` 的消息（成功或错误）
- **通知 (Notifications)**：单向消息，没有 `id`（不需要响应）

---

## 请求方法（客户端 → 服务器）

### 生命周期
| 方法 | 描述 |
|------|------|
| `initialize` | 初始化连接，协商能力 |
| `ping` | 健康检查（双向均可发送） |

### 工具
| 方法 | 描述 |
|------|------|
| `tools/list` | 列出可用工具 |
| `tools/call` | 执行工具 |

### 资源
| 方法 | 描述 |
|------|------|
| `resources/list` | 列出可用资源 |
| `resources/read` | 读取特定资源 |
| `resources/subscribe` | 订阅资源更新 |
| `resources/unsubscribe` | 取消订阅资源更新 |
| `resources/templates/list` | 列出资源模板 |

### 提示词
| 方法 | 描述 |
|------|------|
| `prompts/list` | 列出可用的提示词模板 |
| `prompts/get` | 获取带参数的特定提示词 |

### 工具方法
| 方法 | 描述 |
|------|------|
| `completion/complete` | 请求参数自动补全 |
| `logging/setLevel` | 设置最小日志级别 |

---

## 请求方法（服务器 → 客户端）

### 采样
| 方法 | 描述 |
|------|------|
| `sampling/createMessage` | 从客户端请求 LLM 补全 |

### 根目录
| 方法 | 描述 |
|------|------|
| `roots/list` | 请求文件系统根目录列表 |

### 用户输入
| 方法 | 描述 |
|------|------|
| `elicitation/create` | 请求用户输入（表单或 URL 模式） |

---

## 通知（客户端 → 服务器）

| 方法 | 描述 |
|------|------|
| `notifications/initialized` | 确认初始化完成 |
| `notifications/cancelled` | 取消待处理的请求 |
| `notifications/progress` | 报告长时间运行操作的进度 |
| `notifications/roots/list_changed` | 通知根目录已更改 |

---

## 通知（服务器 → 客户端）

| 方法 | 描述 |
|------|------|
| `notifications/cancelled` | 取消待处理的请求 |
| `notifications/progress` | 报告长时间运行操作的进度 |
| `notifications/message` | 日志消息通知 |
| `notifications/resources/updated` | 资源内容已更改 |
| `notifications/resources/list_changed` | 资源列表已更改 |
| `notifications/tools/list_changed` | 工具列表已更改 |
| `notifications/prompts/list_changed` | 提示词列表已更改 |

---

## TypeScript SDK 模式导出

@modelcontextprotocol/sdk 从 `@modelcontextprotocol/sdk/types.js` 导出以下模式：

### 请求模式
```typescript
// 生命周期
InitializeRequestSchema
PingRequestSchema

// 工具
ListToolsRequestSchema
CallToolRequestSchema

// 资源
ListResourcesRequestSchema
ReadResourceRequestSchema
ListResourceTemplatesRequestSchema
SubscribeRequestSchema
UnsubscribeRequestSchema

// 提示词
ListPromptsRequestSchema
GetPromptRequestSchema

// 工具方法
CompleteRequestSchema
SetLevelRequestSchema

// 客户端功能（服务器 → 客户端）
CreateMessageRequestSchema  // 采样
ListRootsRequestSchema      // 根目录
CreateElicitationRequestSchema  // 用户输入
```

### 通知模式
```typescript
InitializedNotificationSchema
CancelledNotificationSchema
ProgressNotificationSchema
LoggingMessageNotificationSchema
ResourceUpdatedNotificationSchema
ResourceListChangedNotificationSchema
ToolListChangedNotificationSchema
PromptListChangedNotificationSchema
RootsListChangedNotificationSchema
```

### 响应模式
```typescript
InitializeResultSchema
ListToolsResultSchema
CallToolResultSchema
ListResourcesResultSchema
ReadResourceResultSchema
ListResourceTemplatesResultSchema
ListPromptsResultSchema
GetPromptResultSchema
CompleteResultSchema
CreateMessageResultSchema
ListRootsResultSchema
```

---

## 能力类别

在初始化期间，客户端和服务器协商能力：

### 服务器能力
| 能力 | 启用的方法 |
|------|-----------|
| `tools` | tools/list, tools/call |
| `resources` | resources/list, resources/read, resources/subscribe |
| `prompts` | prompts/list, prompts/get |
| `logging` | logging/setLevel, notifications/message |
| `completion` | completion/complete |

### 客户端能力
| 能力 | 启用的方法 |
|------|-----------|
| `sampling` | sampling/createMessage |
| `roots` | roots/list, notifications/roots/list_changed |
| `elicitation` | elicitation/create |

---

## JSON-RPC 消息格式

```json
// 请求
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "method": "tools/call",
  "params": { /* 方法特定参数 */ }
}

// 响应（成功）
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "result": { /* 方法特定结果 */ }
}

// 响应（错误）
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  }
}

// 通知
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": { /* 通知特定参数 */ }
}
```

---

## 参考资料

- [GitHub - modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) - 官方 TypeScript SDK
- [@modelcontextprotocol/sdk - npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - NPM 包
- [Specification - Model Context Protocol](https://modelcontextprotocol.io/specification/2025-06-18) - 官方规范
- [Schema Reference - Model Context Protocol](https://modelcontextprotocol.io/specification/draft/schema) - 模式参考
