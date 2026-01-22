import { tools } from '../src'

export interface ToolCall {
  id: string
  function: {
    name: string
    arguments: string
  }
}

export class ToolExecutor {
  private toolMap = new Map<string, any>([
    ['readFile', new tools.ReadFile()]
  ])

  execute(toolCall: ToolCall): string {
    const tool = this.toolMap.get(toolCall.function.name)
    if (!tool) {
      throw new Error(`Unknown tool: ${toolCall.function.name}`)
    }

    const args = JSON.parse(toolCall.function.arguments)
    console.log(`Executing tool: ${toolCall.function.name}`, args)

    if (toolCall.function.name === 'readFile') {
      return tool.readFile(args.path)
    }

    throw new Error(`Tool execution not implemented: ${toolCall.function.name}`)
  }
}
