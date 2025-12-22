import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import { createSqlTool } from './tools/sql';
import { SYSTEM_PROMPT } from './prompt';
import type { ChatMessage } from './types';

export interface AgentConfig {
  baseURL?: string;
  modelName?: string;
}

export class ChatAgent {
  private model: ChatOpenAI;
  private sqlTool: ReturnType<typeof createSqlTool>;

  constructor(databaseUrl: string, config?: AgentConfig) {
    this.model = new ChatOpenAI({
      modelName: config?.modelName || 'deepseek-ai/DeepSeek-V3.2',
      temperature: 0.3,
      apiKey: process.env.LLM_API_KEY || 'xxx',
      configuration: { baseURL: config?.baseURL || 'http://localhost:8089/llm/openai' },
    });
    this.sqlTool = createSqlTool(databaseUrl);
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const modelWithTools = this.model.bindTools([this.sqlTool]);

    const baseMessages: BaseMessage[] = messages.map((msg) => {
      if (msg.role === 'system') return new SystemMessage(msg.content);
      if (msg.role === 'user') return new HumanMessage(msg.content);
      return new AIMessage(msg.content);
    });

    const allMessages: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT), ...baseMessages];

    for (let i = 0; i < 20; i++) {
      const response = await modelWithTools.invoke(allMessages);

      if (!response.tool_calls?.length) {
        return response.content as string;
      }

      allMessages.push(response);

      for (const call of response.tool_calls) {
        const args = call.args as { sql: string };
        console.log(`[SQL] ${args.sql.replace(/\s+/g, ' ').slice(0, 100)}`);
        const result = await this.sqlTool.invoke(args);
        allMessages.push(new ToolMessage({ content: result, tool_call_id: call.id! }));
      }
    }

    return '达到最大迭代次数';
  }
}
