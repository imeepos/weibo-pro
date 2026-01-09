import { Injectable } from '@sker/core';
import { ChatAgent, type ChatMessage } from '@sker/chat';

interface ChatRequest {
  messages: ChatMessage[];
  databaseUrl?: string;
}

@Injectable()
export class ChatService {
  private agent: ChatAgent;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL || '';
    const llmProxyUrl = process.env.API_BASE_URL
      ? `${process.env.API_BASE_URL}/api/auth/llm/openai`
      : 'http://localhost:8089/api/auth/llm/openai';

    console.log('[ChatService] 初始化:', {
      databaseUrl: databaseUrl ? '已配置' : '未配置',
      llmProxyUrl
    });

    this.agent = new ChatAgent(databaseUrl, {
      baseURL: llmProxyUrl,
      modelName: 'deepseek-ai/DeepSeek-V3.2'
    });
  }

  async chat(request: ChatRequest): Promise<string> {
    console.log('[ChatService] 收到聊天请求:', {
      messageCount: request.messages.length,
      hasDatabaseUrl: !!(request.databaseUrl || process.env.DATABASE_URL)
    });

    try {
      const response = await this.agent.chat(request.messages);
      console.log('[ChatService] 聊天响应成功:', {
        responseLength: response.length
      });
      return response;
    } catch (error) {
      console.error('[ChatService] 聊天失败:', error);
      throw error;
    }
  }
}
