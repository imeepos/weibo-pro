import { Ast, Input, IS_MULTI, Node, Output, State } from '@sker/workflow'

/** Claude Code 流式输出事件类型 */
export type ClaudeStreamEventType =
  | 'user'              // 用户消息（包含 tool_result）
  | 'assistant'         // 助手消息（包含 tool_use）
  | 'error'             // 错误事件
  | 'status'            // 状态更新
  | 'tool_use'          // 工具调用
  | 'tool_result'       // 工具结果
  | 'message_start'     // 消息开始
  | 'message_delta'     // 消息增量
  | 'message_stop'      // 消息结束
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'ping'
  | 'result'            // 执行结果（最终输出）

export interface AssistantMessageEvent {
  type: 'assistant'
  content: ClaudeMessage
}

/** 内容块类型 */
export type ContentType =
  | 'text'
  | 'tool_use'
  | 'tool_result'
  | 'image'
  | 'thinking'

/** 工具结果文件内容 */
export interface ToolResultFile {
  filePath: string
  content: string
  numLines: number
  startLine: number
  totalLines: number
}

/** 工具结果内容 */
export interface ToolUseResult {
  type?: 'text'
  file?: ToolResultFile
  stdout?: string
  stderr?: string
  interrupted?: boolean
  isImage?: boolean
  oldTodos?: Array<{ content: string; status: string; activeForm: string }>
  newTodos?: Array<{ content: string; status: string; activeForm: string }>
}

/** 内容块 */
export interface ContentBlock {
  type: ContentType
  text?: string
  tool_use_id?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  content?: string | ToolUseResult
  is_error?: boolean
}

/** 消息对象 */
export interface ClaudeMessage {
  id?: string
  type: 'message'
  role: 'user' | 'assistant' | 'system'
  model?: string
  content: ContentBlock[] | string
  stop_reason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null
  stop_sequence?: string | null
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
    server_tool_use?: {
      web_search_requests: number
    }
  }
  context_management?: unknown
}

/** Token 使用统计 */
export interface Usage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  server_tool_use?: {
    web_search_requests: number
    web_fetch_requests: number
  }
  service_tier?: 'standard'
  cache_creation?: {
    ephemeral_1h_input_tokens: number
    ephemeral_5m_input_tokens: number
  }
}

/** 模型使用统计 */
export interface ModelUsage {
  [model: string]: {
    inputTokens: number
    outputTokens: number
    cacheReadInputTokens: number
    cacheCreationInputTokens: number
    webSearchRequests: number
    costUSD: number
    contextWindow: number
    maxOutputTokens: number
  }
}

/** Claude Code 执行结果（最终输出） */
export interface ClaudeResultEvent {
  type: 'result'
  subtype: 'success' | 'error'
  is_error: boolean
  duration_ms: number
  duration_api_ms: number
  num_turns: number
  result: string
  session_id: string
  total_cost_usd: number
  usage: Usage
  modelUsage: ModelUsage
  permission_denials: unknown[]
  uuid: string
}

/** Claude Code 流式输出事件 */
export interface ClaudeStreamEvent {
  type: ClaudeStreamEventType
  message?: ClaudeMessage
  parent_tool_use_id?: string | null
  session_id?: string
  uuid?: string
  tool_use_result?: ToolUseResult
  error?: {
    type: string
    message: string
  }
  status?: {
    type: string
    message: string
  }
  tool_use?: {
    id: string
    name: string
    input: Record<string, unknown>
  }
  delta?: {
    type: string
    text?: string
    stop_reason?: string
    stop_sequence?: string | null
  }
  index?: number
  message_id?: string
  // result 类型特有字段
  subtype?: 'success' | 'error'
  is_error?: boolean
  duration_ms?: number
  duration_api_ms?: number
  num_turns?: number
  result?: string
  total_cost_usd?: number
  usage?: Usage
  modelUsage?: ModelUsage
  permission_denials?: unknown[]
}

@Node({
  title: '编程助手',
  type: 'basic',
  errorStrategy: 'retry',
  maxRetries: 2,
  retryDelay: 1000,
  retryBackoff: 2
})
export class ClaudeCodeAst extends Ast {
  @State({ title: '命令路径/名称' })
  command: string = 'claude'

  @State({
    title: '命令参数', defaultValue: [
      '--output-format', 'stream-json', '--verbose', '--permission-prompt-tool', 'stdio', '--dangerously-skip-permissions'
    ]
  })
  args: string[] = [
    '--output-format', 'stream-json', '--verbose', '--permission-prompt-tool', 'stdio', '--dangerously-skip-permissions'
  ]

  @Input({ title: 'stdin 输入', required: false, defaultValue: [], mode: IS_MULTI })
  stdin: string[] = [];

  @State({ title: '进程ID' })
  pid: number = 0

  @State({ title: '执行耗时（毫秒）' })
  duration: number = 0

  @Output({ title: '流式事件输出' })
  stdout: string | null = null;

  @Output({ title: '错误' })
  stderr: any | null = null;

  @Output({ title: '执行结果' })
  result!: string;

  type: 'ClaudeCodeAst' = 'ClaudeCodeAst'
}
