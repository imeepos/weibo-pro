import { ChatAgent, AgentConfig } from './ChatAgent';
import type { ChatMessage } from './types';
import { v4 as uuidv4 } from 'uuid';

export class ChatSession {
  private agent: ChatAgent;
  private messages: ChatMessage[] = [];
  readonly sessionId: string;

  constructor(databaseUrl: string, config?: AgentConfig) {
    this.sessionId = uuidv4();
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
}

export function createChatSession(databaseUrl: string, config?: AgentConfig): ChatSession {
  return new ChatSession(databaseUrl, config);
}
