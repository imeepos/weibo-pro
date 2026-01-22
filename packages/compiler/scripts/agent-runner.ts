import { Observable, firstValueFrom } from 'rxjs'
import { BaseProvider, Message } from './base-provider'
import { ToolExecutor } from './tool-executor'

export class AgentRunner {
  private toolExecutor = new ToolExecutor()

  constructor(private provider: BaseProvider) {}

  async run(prompt: string, tools: any[]): Promise<void> {
    const messages: Message[] = [{ role: 'user', content: prompt }]
    let finalMessage: any = null

    while (true) {
      const { url, ...init } = await this.provider.buildRequest(messages, tools)
      const response = await fetch(url, init)
      const result = await this.provider.parseResponse(response)

      let message: any
      if (result instanceof Observable) {
        message = await firstValueFrom(result)
      } else {
        message = result
      }

      finalMessage = message
      console.log('=== Aggregated Message ===')
      console.log(JSON.stringify(message, null, 2))
      console.log('========================')

      messages.push(this.provider.formatAssistantMessage(message))

      if (this.provider.shouldStop(message)) break

      const toolCalls = this.provider.extractToolCalls(message)
      if (toolCalls.length === 0) break

      for (const toolCall of toolCalls) {
        const result = this.toolExecutor.execute(toolCall)
        messages.push(this.provider.formatToolResult(toolCall.id, toolCall.function.name, result, toolCall))
      }
    }

    this.printFinalMessage(finalMessage)
  }

  private printFinalMessage(message: any): void {
    console.log('=== Final AI Response ===')
    if (message.content) {
      if (typeof message.content === 'string') {
        console.log(message.content)
      } else if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (block.type === 'text') {
            console.log(block.text)
          } else if (block.type === 'thinking') {
            console.log(`[Thinking] ${block.thinking}`)
          }
        }
      }
    }
    console.log('========================')
  }
}
