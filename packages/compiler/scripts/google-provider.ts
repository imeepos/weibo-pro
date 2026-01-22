import { root } from '@sker/core'
import { ParserVisitor, buildOpenAITools, google } from '../src'
import { BaseProvider, Message, AgentMessage } from './base-provider'
import { Observable } from 'rxjs'
import { GoogleResponseAst } from '../src/ast'
import { ToolCall } from './tool-executor'

export class GoogleProvider extends BaseProvider {
  private visitor = root.get(ParserVisitor)

  constructor(
    private model: string = 'google/gemini-3-flash-preview'
  ) {
    super()
  }

  async buildRequest(messages: Message[], tools: any[]): Promise<RequestInit & { url: string }> {
    const openaiTools = buildOpenAITools(tools)

    const googleContents = messages.map((msg: any) => {
      if (msg.role === 'user') {
        return { role: 'user', parts: [{ text: msg.content }] }
      } else if (msg.role === 'assistant') {
        const parts: any[] = []
        if (msg.content) parts.push({ text: msg.content })
        if (msg.tool_calls) {
          parts.push(...msg.tool_calls.map((tc: any) => ({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments)
            },
            thoughtSignature: tc.thoughtSignature
          })))
        }
        return { role: 'model', parts }
      } else if (msg.role === 'tool') {
        const assistantMsg = messages.find((m: any) =>
          m.tool_calls?.some((tc: any) => tc.id === msg.tool_call_id)
        )
        const toolCall = assistantMsg?.tool_calls?.find((tc: any) => tc.id === msg.tool_call_id)
        return {
          role: 'function',
          parts: [{
            functionResponse: {
              name: toolCall?.function.name,
              response: { content: msg.content }
            },
            thoughtSignature: msg.thought_signature || toolCall?.thoughtSignature
          }]
        }
      }
      return msg
    })

    const googleTools = openaiTools.map((tool: any) => ({
      functionDeclarations: [{
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      }]
    }))

    return {
      url: `https://gateway.ai.cloudflare.com/v1/67720b647ff2b55cf37ba3ef9e677083/bowong-dev/google-vertex-ai/v1/projects/gen-lang-client-0413414134/locations/global/publishers/google/models/${this.model.replace('google/', '')}:generateContent`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await google.getGoogleToken()}`,
      },
      body: JSON.stringify({
        contents: googleContents,
        tools: googleTools
      })
    }
  }

  async parseResponse(response: Response): Promise<Observable<AgentMessage> | AgentMessage> {
    const result = await this.visitor.visitResponse(response)

    if (result instanceof GoogleResponseAst) {
      const candidate = result.candidates[0]
      if (!candidate) {
        return { content: '', finish_reason: 'stop' }
      }
      const content = candidate.content

      const textParts = content.parts.filter((p: any) => 'text' in p)
      const functionCalls = content.parts.filter((p: any) => 'functionCall' in p)

      const message: AgentMessage = {
        content: textParts.map((p: any) => p.text).join(''),
        finish_reason: functionCalls.length > 0 ? undefined : (candidate.finishReason === 'STOP' ? 'stop' : undefined)
      }

      if (functionCalls.length > 0) {
        message.tool_calls = functionCalls.map((fc: any, index: number) => ({
          id: `call_${index}`,
          type: 'function',
          function: {
            name: fc.functionCall.name,
            arguments: JSON.stringify(fc.functionCall.args)
          },
          thoughtSignature: fc.thoughtSignature
        }))
      }

      return message
    }

    return result
  }

  formatAssistantMessage(message: AgentMessage): Message {
    const assistantMessage: Message = {
      role: 'assistant',
      content: message.content || undefined
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      assistantMessage.tool_calls = message.tool_calls
    }

    return assistantMessage
  }

  formatToolResult(toolCallId: string, toolName: string, result: string, toolCall?: any): Message {
    return {
      role: 'tool',
      tool_call_id: toolCallId,
      content: result,
      thought_signature: toolCall?.thoughtSignature
    }
  }

  shouldStop(message: AgentMessage): boolean {
    return message.finish_reason === 'stop' || message.finish_reason === 'length'
  }

  extractToolCalls(message: AgentMessage): ToolCall[] {
    return message.tool_calls || []
  }
}
