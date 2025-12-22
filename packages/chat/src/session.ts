import { generateRandomString } from '@sker/utils';
import { ChatAgent, AgentConfig } from './ChatAgent';
import type { ChatMessage } from './types';
export class ChatSession {
  private agent: ChatAgent;
  private messages: ChatMessage[] = [];
  readonly sessionId: string;

  constructor(databaseUrl: string, config?: AgentConfig) {
    this.sessionId = generateRandomString(32);
    this.agent = new ChatAgent(databaseUrl, config);
  }

  async sendMessage(content: string): Promise<string> {
    this.messages.push({ role: 'user', content });
    const response = await this.agent.chat(this.messages);
    this.messages.push({ role: 'assistant', content: response });
    return response;
  }

  getHistory(): ChatMessage[] {
    return [...this.messages];
  }

  clearHistory(): void {
    this.messages = [];
  }

  async close(): Promise<void> {
    await this.agent.close();
  }
}

export function createChatSession(databaseUrl: string, config?: AgentConfig): ChatSession {
  return new ChatSession(databaseUrl, config);
}
