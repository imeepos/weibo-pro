export interface Message {
  role: string
  content: any
  [key: string]: any
}

export interface AgentMessage {
  content?: string | any[]
  tool_calls?: any[]
  finish_reason?: string | null
  stop_reason?: string | null
  [key: string]: any
}

export abstract class BaseProvider {
  abstract buildRequest(messages: Message[], tools: any[]): Promise<RequestInit & { url: string }>
  abstract parseResponse(response: Response): Promise<AgentMessage>
  abstract formatAssistantMessage(message: AgentMessage): Message
  abstract formatToolResult(toolCallId: string, toolName: string, result: string, toolCall?: any, isError?: boolean): Message
  abstract shouldStop(message: AgentMessage): boolean
  abstract extractToolCalls(message: AgentMessage): any[]
}
