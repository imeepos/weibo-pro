import { root } from '@sker/core'
import { ParserVisitor, buildAnthropicTools, aggregateAnthropicStream, extractToolCalls, executeTools } from '../src'
import { BaseProvider, Message, AgentMessage } from './base-provider'
import { Observable, firstValueFrom } from 'rxjs'
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

  async parseResponse(response: Response): Promise<Observable<AgentMessage> | AgentMessage> {
    const result = await this.visitor.visitResponse(response)

    if (result instanceof Observable) {
      return result.pipe(aggregateAnthropicStream())
    }

    return result
  }

  formatAssistantMessage(message: AgentMessage): Message {
    return {
      role: 'assistant',
      content: message.content
    }
  }

  formatToolResult(toolCallId: string, toolName: string, result: string, toolCall?: any): Message {
    return {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolCallId,
          content: result,
          is_error: false
        }
      ]
    }
  }

  shouldStop(message: AgentMessage): boolean {
    return message.stop_reason !== null
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
