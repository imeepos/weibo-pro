import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import { createSqlTool } from './tools/sql';
import { SYSTEM_PROMPT } from './prompt';
import type { ChatMessage } from './types';

const CONTINUE_EXPLORATION_PROMPT = `很好。现在继续下一轮探索：

1. 还有哪些数据值得深入分析？
2. 发现了什么新的关联或模式？
3. 哪些假设需要验证？
4. 下一步要探索什么？

继续使用 SQL 工具探索。记住：探索永不停歇。`;

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

    // 检查用户是否要求停止
    const lastUserMessage = messages
      .filter((m) => m.role === 'user')
      .pop()?.content.toLowerCase() || '';
    const shouldStop = lastUserMessage.includes('停止') || lastUserMessage.includes('结束');

    for (let i = 0; i < 2000; i++) {
      const response = await modelWithTools.invoke(allMessages);

      if (!response.tool_calls?.length) {
        const content = response.content as string;

        // 如果用户要求停止，或响应中有明确的停止标记，则返回
        if (shouldStop || content.includes('[STOP]')) {
          return content;
        }

        // 否则继续探索：将响应添加到历史，然后添加引导消息
        allMessages.push(response);
        allMessages.push(new SystemMessage(CONTINUE_EXPLORATION_PROMPT));
        continue;
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
