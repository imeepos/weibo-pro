import { ToolExecutorVisitor, OpenAiResponseAst, } from '../src'

export interface ToolCall {
  id: string
  function: {
    name: string
    arguments: string
  }
}

export class ToolExecutor {
  private visitor = new ToolExecutorVisitor()

  execute(toolCall: ToolCall): string {
    console.log(`Executing tool: ${toolCall.function.name}`, JSON.parse(toolCall.function.arguments))

    const ast = new OpenAiResponseAst()
    ast.id = 'temp'
    ast.object = 'chat.completion'
    ast.created = Date.now()
    ast.model = 'temp'
    ast.system_fingerprint = 'temp'
    ast.usage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
    ast.choices = [
      {
        index: 0,
        finish_reason: 'tool_calls',
        delta: {
          content: '',
          role: 'assistant',
          reasoning_content: null,
          tool_calls: [
            {
              index: 0,
              id: toolCall.id,
              type: 'function',
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments
              }
            }
          ]
        }
      }
    ]

    const results = this.visitor.visitOpenAiResponseAst(ast, {})
    if (results.length === 0) {
      throw new Error(`Tool execution failed: ${toolCall.function.name}`)
    }

    const result = results[0]
    if (!result) {
      throw new Error(`Tool execution failed: ${toolCall.function.name}`)
    }
    if (result.is_error) {
      throw new Error(`Tool execution error: ${result.content}`)
    }

    return result.content
  }
}
