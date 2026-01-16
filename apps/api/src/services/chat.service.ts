import { Injectable } from '@sker/core'
import { ChatAgent, type ChatMessage } from '@sker/workflow-run'

interface ChatRequest {
  messages: ChatMessage[]
  databaseUrl?: string
}

@Injectable()
export class ChatService {
  private agent: ChatAgent

  constructor() {
    const databaseUrl = process.env.DATABASE_URL
    this.agent = new ChatAgent(databaseUrl)
  }

  async chat(request: ChatRequest): Promise<string> {
    console.log('[ChatService] 收到聊天请求:', {
      messageCount: request.messages.length,
      hasDatabaseUrl: !!(request.databaseUrl || process.env.DATABASE_URL)
    })

    try {
      const response = await this.agent.chat(request.messages)
      console.log('[ChatService] 聊天响应成功:', {
        responseLength: response.length
      })
      return response
    } catch (error) {
      console.error('[ChatService] 聊天失败:', error)
      throw error
    }
  }
}
