import { root } from '@sker/core'
import { ParserVisitor, buildOpenAITools, AggregatedMessage } from '../src'
import { BaseProvider, Message, AgentMessage } from './base-provider'
import { ToolCall } from './tool-executor'

export class OpenAIProvider extends BaseProvider {
  private visitor = root.get(ParserVisitor)

  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl: string = 'https://api.siliconflow.cn/v1/chat/completions'
  ) {
    super()
  }

  async buildRequest(messages: Message[], tools: any[]): Promise<RequestInit & { url: string }> {
    const openaiTools = buildOpenAITools(tools)

    return {
      url: this.baseUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools: openaiTools,
        stream: true
      })
    }
  }

  async parseResponse(response: Response): Promise<AgentMessage> {
    return await this.visitor.visitResponseAggregated(response)
  }

  formatAssistantMessage(message: AgentMessage): Message {
    const assistantMessage: Message = {
      role: 'assistant',
      content: message.content || undefined
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      assistantMessage.tool_calls = message.tool_calls.map(tc => ({
        id: tc.id,
        type: tc.type || 'function',
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }))
    }

    return assistantMessage
  }

  formatToolResult(toolCallId: string, toolName: string, result: string, toolCall?: any, isError?: boolean): Message {
    return {
      role: 'tool',
      tool_call_id: toolCallId,
      content: isError ? `Error: ${result}` : result
    }
  }

  shouldStop(message: AgentMessage): boolean {
    return message.finish_reason === 'stop' || message.finish_reason === 'length'
  }

  extractToolCalls(message: AgentMessage): ToolCall[] {
    return message.tool_calls || []
  }
}
