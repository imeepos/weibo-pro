import { root } from '@sker/core'
import { ParserVisitor, buildAnthropicTools, AggregatedMessage } from '../src'
import { BaseProvider, Message, AgentMessage } from './base-provider'
import { ToolCall } from './tool-executor'

export class AnthropicProvider extends BaseProvider {
  private visitor = root.get(ParserVisitor)

  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl: string = 'https://api.siliconflow.cn/v1/messages'
  ) {
    super()
  }

  async buildRequest(messages: Message[], tools: any[]): Promise<RequestInit & { url: string }> {
    const anthropicTools = buildAnthropicTools(tools)

    return {
      url: this.baseUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        messages,
        tools: anthropicTools,
        stream: true
      })
    }
  }

  async parseResponse(response: Response): Promise<AgentMessage> {
    return await this.visitor.visitResponseAggregated(response)
  }

  formatAssistantMessage(message: AgentMessage): Message {
    return {
      role: 'assistant',
      content: message.content
    }
  }

  formatToolResult(toolCallId: string, toolName: string, result: string, toolCall?: any, isError?: boolean): Message {
    return {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolCallId,
          content: result,
          is_error: isError || false
        }
      ]
    }
  }

  shouldStop(message: AgentMessage): boolean {
    return message.stop_reason === 'end_turn' || message.stop_reason === 'stop_sequence'
  }

  extractToolCalls(message: AgentMessage): ToolCall[] {
    if (!Array.isArray(message.content)) return []

    return message.content
      .filter((block: any) => block.type === 'tool_use')
      .map((block: any) => ({
        id: block.id,
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input)
        }
      }))
  }
}
