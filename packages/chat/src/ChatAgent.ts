import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import { Pool } from 'pg';
import { createSqlTool } from './tools/sql';
import { SYSTEM_PROMPT, STOP_SIGNAL } from './prompt';
import type { ChatMessage } from './types';

const CONTINUE_EXPLORATION_PROMPT = `继续深入探索：

1. 还有哪些数据值得深入分析？
2. 发现了什么新的关联或模式？
3. 哪些假设需要验证？
4. 下一步要探索什么？

记住：如果任务已完成，知识已足够，就果断输出终止信号。探索的目标是高效，而非无止境。`;

export interface AgentConfig {
  baseURL?: string;
  modelName?: string;
}

export class ChatAgent {
  private model: ChatOpenAI;
  private sqlTool: ReturnType<typeof createSqlTool>;
  private pool: Pool;
  private cachedSystemPrompt: string | null = null;

  constructor(databaseUrl: string, config?: AgentConfig) {
    this.model = new ChatOpenAI({
      modelName: config?.modelName || 'deepseek-ai/DeepSeek-V3.2',
      temperature: 0.3,
      apiKey: process.env.LLM_API_KEY || 'xxx',
      configuration: { baseURL: config?.baseURL || 'http://localhost:8089/llm/openai' },
      maxTokens: 163840,
    });
    this.pool = new Pool({ connectionString: databaseUrl, max: 10 });
    this.sqlTool = createSqlTool(this.pool);
  }

  /**
   * 初始化系统提示词表
   * 如果表不存在，创建并插入默认 SYSTEM_PROMPT
   */
  private async initializeSystemPrompt(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // 检查表是否存在
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'ai_system_prompt'
        );
      `);

      if (!tableExists.rows[0].exists) {
        // 创建表
        await client.query(`
          CREATE TABLE ai_system_prompt (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 插入默认规则
        await client.query(`INSERT INTO ai_system_prompt (content) VALUES ($1);`, [SYSTEM_PROMPT]);

        console.log('[ChatAgent] ai_system_prompt 表已初始化');
      }
    } finally {
      client.release();
    }
  }

  /**
   * 从数据库加载系统提示词
   * 如果表不存在，会自动初始化
   */
  private async loadSystemPrompt(): Promise<string> {
    await this.initializeSystemPrompt();

    const client = await this.pool.connect();
    try {
      const result = await client.query(`SELECT content FROM ai_system_prompt ORDER BY id DESC LIMIT 1;`);

      if (result.rows.length === 0) {
        console.warn('[ChatAgent] 未找到系统提示词，使用静态默认值');
        return SYSTEM_PROMPT;
      }

      return result.rows[0].content;
    } finally {
      client.release();
    }
  }

  /**
   * 确保系统提示词已加载（懒惰初始化 + 缓存）
   */
  private async ensureSystemPrompt(): Promise<string> {
    if (!this.cachedSystemPrompt) {
      this.cachedSystemPrompt = await this.loadSystemPrompt();
    }
    return this.cachedSystemPrompt;
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const modelWithTools = this.model.bindTools([this.sqlTool]);

    const baseMessages: BaseMessage[] = messages.map((msg) => {
      if (msg.role === 'system') return new SystemMessage(msg.content);
      if (msg.role === 'user') return new HumanMessage(msg.content);
      return new AIMessage(msg.content);
    });

    // 动态加载系统提示词
    const systemPrompt = await this.ensureSystemPrompt();
    const allMessages: BaseMessage[] = [new SystemMessage(systemPrompt), ...baseMessages];

    // 检查用户是否要求停止
    const lastUserMessage = messages
      .filter((m) => m.role === 'user')
      .pop()?.content.toLowerCase() || '';
    const shouldStop = lastUserMessage.includes('停止') || lastUserMessage.includes('结束');

    let consecutiveNoToolCalls = 0;
    let lastResponseContent = '';
    const MAX_NO_TOOL_ITERATIONS = 3;
    const MAX_TOTAL_ITERATIONS = 50;

    for (let i = 0; i < MAX_TOTAL_ITERATIONS; i++) {
      const response = await modelWithTools.invoke(allMessages);

      if (!response.tool_calls?.length) {
        const content = response.content as string;

        // 检查 AI 是否主动结束探索
        if (content.trim().endsWith(STOP_SIGNAL)) {
          return content.replace(STOP_SIGNAL, '').trim();
        }

        // 如果用户要求停止，则返回
        if (shouldStop) {
          return content;
        }

        // 重复响应检测：如果连续返回相同内容，停止
        if (content === lastResponseContent) {
          console.warn('[ChatAgent] 检测到重复响应，停止探索');
          return content;
        }

        // 无进展检测：连续多次没有工具调用
        consecutiveNoToolCalls++;
        if (consecutiveNoToolCalls >= MAX_NO_TOOL_ITERATIONS) {
          console.warn('[ChatAgent] 连续无工具调用，停止探索');
          return content;
        }

        // 检测 AI 请求用户输入的情况
        const isAskingUser = content.includes('请告诉我') ||
                           content.includes('你想') ||
                           content.includes('需要你') ||
                           content.includes('？') && content.split('？').length > 2;
        if (isAskingUser) {
          console.log('[ChatAgent] 检测到 AI 请求用户输入，停止探索');
          return content;
        }

        lastResponseContent = content;
        allMessages.push(response);
        allMessages.push(new SystemMessage(CONTINUE_EXPLORATION_PROMPT));
        continue;
      }

      // 有工具调用，重置计数器
      consecutiveNoToolCalls = 0;
      lastResponseContent = '';

      allMessages.push(response);

      for (const call of response.tool_calls) {
        const args = call.args as { sql: string };
        console.log(`[SQL] ${args.sql.replace(/\s+/g, ' ').slice(0, 100)}`);
        const result = await this.sqlTool.invoke(args);
        allMessages.push(new ToolMessage({ content: result, tool_call_id: call.id! }));
      }
    }

    return '达到最大迭代次数，自动终止';
  }
}
